import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, _request): Promise<any> {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await prisma.user.findFirst({
            where: {
              email: {
                equals: credentials.email as string,
                mode: "insensitive",
              },
            },
            include: { organization: true },
          });

          if (!user || !user.password) return null;

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("timeout") || msg.includes("connect") || msg.includes("P1001") || msg.includes("ECONNREFUSED")) {
            throw new Error("ServiceUnavailable");
          }
          throw err;
        }
      },
    }),
    Credentials({
      id: "impersonate",
      name: "impersonate",
      credentials: { token: {} },
      async authorize(credentials): Promise<any> {
        if (!credentials?.token) return null;

        try {
          const record = await prisma.impersonationToken.findUnique({
            where: { token: credentials.token as string },
            include: { targetUser: true },
          });

          if (!record) return null;
          if (record.usedAt) return null;
          if (record.expiresAt < new Date()) return null;

          await prisma.impersonationToken.update({
            where: { id: record.id },
            data: { usedAt: new Date() },
          });

          return {
            id: record.targetUser.id,
            email: record.targetUser.email,
            name: record.targetUser.name,
            impersonatedBy: record.adminId,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, organizationId: true },
        });
        token.role = dbUser?.role ?? "CLIENT";
        token.organizationId = dbUser?.organizationId ?? null;
        token.impersonatedBy = (user as any).impersonatedBy ?? null;
      }
      return token;
    },
  },
});
