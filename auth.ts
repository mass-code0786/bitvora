import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { verifyLoginCredentials } from "@/lib/auth/credentials";

const sessionMaxAge = 30 * 24 * 60 * 60;
const databaseSessionBridge = {
  id: "database-session-bridge",
  name: "Database session bridge",
  type: "oauth",
  issuer: "https://disabled.invalid",
} satisfies Provider;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "database", maxAge: sessionMaxAge },
  pages: { signIn: "/login" },
  providers: [Credentials({
    credentials: { email: { type: "email" }, password: { type: "password" } },
    authorize: verifyLoginCredentials,
  }), databaseSessionBridge],
  // Auth.js currently routes Credentials through its JWT callback even with a
  // database adapter. Store and return an opaque database session token here.
  jwt: {
    async encode({ token }) {
      if (!token?.sub) return "";
      const sessionToken = randomUUID();
      await prisma.session.create({ data: {
        sessionToken,
        userId: token.sub,
        expires: new Date(Date.now() + sessionMaxAge * 1000),
      } });
      return sessionToken;
    },
    async decode() { return null; },
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.uid = user.uid;
      session.user.role = user.role;
      session.user.country = user.country;
      return session;
    },
  },
});
