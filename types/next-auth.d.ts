import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "CLIENT" | "LINGUIST" | "ADMIN";
      organizationId: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: "CLIENT" | "LINGUIST" | "ADMIN";
    organizationId: string | null;
  }
}
