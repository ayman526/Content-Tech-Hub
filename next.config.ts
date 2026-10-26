import type { NextConfig } from "next";

const replitDomain = process.env.REPLIT_DEV_DOMAIN ?? "";

const allowedOrigins = [
  "127.0.0.1",
  "localhost",
  "*.localhost",
  "*.replit.dev",
  "*.repl.co",
  "*.picard.replit.dev",
  ...(replitDomain ? [replitDomain] : []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: allowedOrigins,
  // Include pdfkit's AFM font-metric files in the production file trace so
  // they are available alongside the bundled server routes.
  outputFileTracingIncludes: {
    "/api/jobs/[id]/deliver": ["./node_modules/pdfkit/js/data/**"],
  },
  experimental: {
    serverActions: {
      allowedOrigins: allowedOrigins,
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
