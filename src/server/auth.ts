import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/server/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "CANDIDATE" | "SUPER_ADMIN" | "REVIEWER";
      isEmailVerified?: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: "CANDIDATE" | "SUPER_ADMIN" | "REVIEWER";
    isEmailVerified?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "CANDIDATE" | "SUPER_ADMIN" | "REVIEWER";
    isEmailVerified?: boolean;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        userType: { label: "User Type", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const userType = credentials.userType as "candidate" | "admin";

        if (userType === "candidate") {
          const candidate = await prisma.candidate.findUnique({
            where: { email: credentials.email },
          });

          if (!candidate) {
            throw new Error("Candidate not found");
          }

          const isValid = await compare(credentials.password, candidate.password);
          if (!isValid) {
            throw new Error("Invalid password");
          }

          return {
            id: candidate.id,
            email: candidate.email,
            name: candidate.fullName,
            role: "CANDIDATE" as const,
            isEmailVerified: candidate.isEmailVerified,
          };
        } else {
          const admin = await prisma.admin.findUnique({
            where: { email: credentials.email },
          });

          if (!admin) {
            throw new Error("Admin not found");
          }

          if (!admin.isActive) {
            throw new Error("Account is disabled");
          }

          const isValid = await compare(credentials.password, admin.password);
          if (!isValid) {
            throw new Error("Invalid password");
          }

          await prisma.admin.update({
            where: { id: admin.id },
            data: { lastLogin: new Date() },
          });

          await prisma.auditLog.create({
            data: {
              adminId: admin.id,
              action: "LOGIN",
              entity: "admin",
              entityId: admin.id,
            },
          });

          return {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role as "SUPER_ADMIN" | "REVIEWER",
          };
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isEmailVerified = user.isEmailVerified;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id as string,
        email: token.email as string,
        name: token.name as string,
        role: token.role as "CANDIDATE" | "SUPER_ADMIN" | "REVIEWER",
        isEmailVerified: token.isEmailVerified as boolean | undefined,
      };
      return session;
    },
  },
  pages: {
    signIn: "/fr/login",
    error: "/fr/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};