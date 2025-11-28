import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { env } from "./env";
import jwt from "jsonwebtoken";

/**
 * Generate JWT token for backend API calls
 * Uses the same secret as the backend
 */
function generateBackendToken(userId: string, role: string): string {
  return jwt.sign({ id: userId, role }, env.jwtSecret, { expiresIn: "7d" });
}

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
          console.error("[Auth] Missing credentials");
          return null;
        }

        try {
          // Call backend API to validate credentials
          // Note: This runs server-side (NextAuth API route), so no Origin header is sent
          // The API must have CORS_ALLOW_NO_ORIGIN=true for server-to-server requests
          const apiUrl = `${env.apiUrl}/auth/login`;
          console.log("[Auth] Attempting login:", {
            email: credentials.email,
            apiUrl,
            apiUrlEnv: env.apiUrl,
          });

          let response;
          try {
            response = await fetch(apiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            });
          } catch (fetchError) {
            console.error(
              "[Auth] Fetch error (network/CORS issue):",
              fetchError
            );
            // Re-throw with more context
            throw new Error(
              fetchError instanceof Error
                ? `Network error: ${fetchError.message}. Is the API server running at ${apiUrl}?`
                : "Network error: Unable to reach API server"
            );
          }

          console.log(
            "[Auth] Response status:",
            response.status,
            response.statusText
          );
          console.log(
            "[Auth] Response headers:",
            Object.fromEntries(response.headers.entries())
          );

          if (!response.ok) {
            let errorData;
            const contentType = response.headers.get("content-type");
            try {
              if (contentType && contentType.includes("application/json")) {
                errorData = await response.json();
              } else {
                const text = await response.text();
                console.error("[Auth] Non-JSON error response:", text);
                errorData = {
                  message: `HTTP ${response.status}: ${response.statusText}`,
                  raw: text,
                };
              }
            } catch (parseError) {
              const text = await response.text();
              console.error(
                "[Auth] Failed to parse error response:",
                text,
                parseError
              );
              errorData = {
                message: `HTTP ${response.status}: ${response.statusText}`,
                raw: text,
              };
            }

            console.error("[Auth] Login failed:", {
              status: response.status,
              statusText: response.statusText,
              error: errorData,
            });

            // Return null to trigger CredentialsSignin, but log the actual error
            return null;
          }

          let data;
          try {
            const responseText = await response.text();
            console.log("[Auth] Raw response text:", responseText);
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error(
              "[Auth] Failed to parse success response:",
              parseError
            );
            return null;
          }

          console.log(
            "[Auth] Parsed response data:",
            JSON.stringify(data, null, 2)
          );

          // Validate response structure
          if (!data || typeof data !== "object") {
            console.error("[Auth] Invalid response: not an object", data);
            return null;
          }

          // Return user object that will be stored in JWT
          if (data.user && data.user.id && data.user.email) {
            console.log("[Auth] Login successful:", {
              userId: data.user.id,
              email: data.user.email,
              role: data.user.role,
              mustResetPassword: data.user.mustResetPassword,
            });
            return {
              id: data.user.id,
              email: data.user.email,
              name: data.user.email, // User model doesn't have name field, use email as display name
              role: data.user.role,
              mustResetPassword: data.user.mustResetPassword ?? false,
            };
          }

          console.error(
            "[Auth] Login response missing user data:",
            JSON.stringify(data, null, 2)
          );
          return null;
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown authentication error";
          console.error("[Auth] Authentication error:", {
            message: errorMessage,
            error: error instanceof Error ? error.stack : String(error),
          });
          // Return null to trigger CredentialsSignin
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
    async jwt({ token, user, trigger }) {
      // Initial sign in - add user data to token
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.mustResetPassword = (user as any).mustResetPassword ?? false;
      }

      // When session is updated (e.g., after password change), fetch fresh user data
      if (trigger === "update" && token.id) {
        try {
          console.log(
            "[Auth] Session update triggered, fetching fresh user data..."
          );
          console.log("[Auth] API URL:", `${env.apiUrl}/users/profile`);

          // Fetch fresh user data from the API
          const response = await fetch(`${env.apiUrl}/users/profile`, {
            headers: {
              Authorization: `Bearer ${generateBackendToken(token.id as string, token.role as string)}`,
              "Content-Type": "application/json",
            },
          });

          console.log("[Auth] Profile fetch response:", {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
          });

          if (response.ok) {
            const responseText = await response.text();
            console.log("[Auth] Profile response text:", responseText);

            let userData;
            try {
              userData = JSON.parse(responseText);
            } catch (parseError) {
              console.error(
                "[Auth] Failed to parse profile response:",
                parseError
              );
              return token; // Return existing token if parse fails
            }

            // Handle both { user: {...} } and { data: { user: {...} } } response formats
            const user = userData.user || userData.data?.user;
            if (user) {
              console.log("[Auth] Fresh user data fetched:", {
                userId: user.id,
                mustResetPassword: user.mustResetPassword,
                role: user.role,
              });
              token.mustResetPassword = user.mustResetPassword ?? false;
              token.role = user.role;
            } else {
              console.warn("[Auth] User data not found in response:", userData);
            }
          } else {
            const errorText = await response
              .text()
              .catch(() => "Unable to read error");
            console.error("[Auth] Failed to fetch fresh user data:", {
              status: response.status,
              statusText: response.statusText,
              error: errorText,
            });
            // Don't update token if fetch fails - keep existing values
          }
        } catch (error) {
          console.error("[Auth] Error fetching fresh user data:", error);
          // Don't throw - use existing token data as fallback
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Add user data to session
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.mustResetPassword =
          (token.mustResetPassword as boolean) ?? false;
      }
      return session;
    },
  },
  secret: env.nextAuthSecret,
});
