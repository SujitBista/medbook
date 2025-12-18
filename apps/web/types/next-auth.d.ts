import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string;
      mustResetPassword?: boolean;
      /**
       * Optional URL to the user's profile picture.
       * May be null/undefined if the user has not uploaded one.
       */
      profilePictureUrl?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: string;
    mustResetPassword?: boolean;
    /**
     * Optional URL to the user's profile picture.
     * May be null/undefined if the user has not uploaded one.
     */
    profilePictureUrl?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    mustResetPassword?: boolean;
    /**
     * Optional URL to the user's profile picture.
     * May be null/undefined if the user has not uploaded one.
     */
    profilePictureUrl?: string | null;
  }
}
