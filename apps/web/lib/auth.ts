import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { env } from "./env";
import jwt from "jsonwebtoken";

/**
 * Generate JWT token for backend API calls
 * Uses the same secret as the backend
 */
export function generateBackendToken(userId: string, role: string): string {
  try {
    if (!env.jwtSecret) {
      console.error("[Auth] JWT_SECRET is not configured!");
      throw new Error("JWT_SECRET is not configured");
    }

    const token = jwt.sign({ id: userId, role }, env.jwtSecret, {
      expiresIn: "7d",
    });

    // Verify the token can be decoded (basic sanity check)
    try {
      const decoded = jwt.decode(token);
      if (!decoded || typeof decoded !== "object" || !decoded.id) {
        console.error("[Auth] Generated token failed validation");
        throw new Error("Generated token is invalid");
      }
    } catch (verifyError) {
      console.error("[Auth] Token verification failed:", verifyError);
      throw new Error("Failed to verify generated token");
    }

    return token;
  } catch (error) {
    console.error("[Auth] Error generating backend token:", {
      error: error instanceof Error ? error.message : String(error),
      userId,
      role,
      hasJwtSecret: !!env.jwtSecret,
      jwtSecretLength: env.jwtSecret?.length || 0,
    });
    throw error;
  }
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

            // Check for CORS errors specifically
            const isCorsError =
              response.status === 403 &&
              (errorData?.error?.code === "CORS_ERROR" ||
                errorData?.error?.message?.includes("CORS") ||
                errorData?.message?.includes("CORS"));

            if (isCorsError) {
              console.error("[Auth] CORS Error detected:", {
                status: response.status,
                error: errorData,
                apiUrl,
                hint: "Set CORS_ALLOW_NO_ORIGIN=true in API server environment variables",
              });
            }

            console.error("[Auth] Login failed:", {
              status: response.status,
              statusText: response.statusText,
              error: errorData,
              isCorsError,
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
    async jwt({ token, user, trigger, session }) {
      // Initial sign in - add user data to token
      if (user) {
        token.id = user.id;
        token.role = user.role;
        // Type assertion needed because NextAuth user type doesn't include mustResetPassword
        token.mustResetPassword =
          (user as { mustResetPassword?: boolean }).mustResetPassword ?? false;
        // Optional profile picture URL (may be undefined/null if not set)
        token.profilePictureUrl = (
          user as { profilePictureUrl?: string | null }
        ).profilePictureUrl;
      }

      // When session is updated (e.g., after profile change), we may receive
      // partial session data from the client. Use it to keep lightweight fields
      // like profilePictureUrl in sync without requiring a backend round-trip.
      if (trigger === "update" && session?.user) {
        const sessionUser = session.user as {
          profilePictureUrl?: string | null;
          mustResetPassword?: boolean;
          role?: string;
        };

        if (typeof sessionUser.profilePictureUrl !== "undefined") {
          token.profilePictureUrl = sessionUser.profilePictureUrl ?? null;
        }

        if (typeof sessionUser.mustResetPassword !== "undefined") {
          token.mustResetPassword = sessionUser.mustResetPassword;
        }

        if (typeof sessionUser.role === "string") {
          token.role = sessionUser.role;
        }
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
                hasProfilePictureUrl: !!user.profilePictureUrl,
              });
              token.mustResetPassword = user.mustResetPassword ?? false;
              token.role = user.role;
              // Sync profile picture URL from backend profile response.
              // If not present or null, clear it on the token so UI can fall back.
              token.profilePictureUrl =
                (user as { profilePictureUrl?: string | null })
                  .profilePictureUrl ?? null;
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
        session.user.profilePictureUrl =
          (token.profilePictureUrl as string | null | undefined) ?? null;
      }
      return session;
    },
  },
  secret: env.nextAuthSecret,
});
