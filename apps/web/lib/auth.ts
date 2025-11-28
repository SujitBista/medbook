import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { env } from "./env";

/**
 * NextAuth configuration
 * Uses Credentials provider for email/password authentication
 * Session strategy: JWT
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Call backend API to validate credentials
          // Note: This runs server-side (NextAuth API route), so no Origin header is sent
          // The API must have CORS_ALLOW_NO_ORIGIN=true for server-to-server requests
          const response = await fetch(`${env.apiUrl}/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            return null;
          }

          const data = await response.json();

          // Return user object that will be stored in JWT
          if (data.user) {
            return {
              id: data.user.id,
              email: data.user.email,
              name: data.user.email, // User model doesn't have name field, use email as display name
              role: data.user.role,
            };
          }

          return null;
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    signOut: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in - add user data to token
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user data to session
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  secret: env.nextAuthSecret,
});
