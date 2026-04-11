import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    backendAccessToken?: string;
    backendUserId?: string;
    backendUsername?: string;
    backendRoles?: string[];
    githubAccessToken?: string;
    error?: string;
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  interface User {
    backendAccessToken?: string;
    backendRefreshToken?: string;
    backendUserId?: string;
    backendUsername?: string;
    backendRoles?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendAccessToken?: string;
    backendRefreshToken?: string;
    backendUserId?: string;
    backendUsername?: string;
    backendRoles?: string[];
    backendAccessTokenExpires?: number;
    githubAccessToken?: string;
    error?: string;
  }
}
