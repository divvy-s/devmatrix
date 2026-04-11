import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables");
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:8080";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        // Initial sign in — exchange OAuth token with our backend
        try {
          if (account.provider === "google") {
            const res = await fetch(`${apiUrl}/api/v1/auth/google`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken: account.id_token }),
            });
            const data = await res.json();
            if (res.ok && data) {
              token.backendAccessToken = data.accessToken;
              token.backendRefreshToken = data.refreshToken;
              token.backendUserId = data.user?.id;
              token.backendUsername = data.user?.username;
              token.backendRoles = data.user?.roles;
              token.backendAccessTokenExpires = Date.now() + 59 * 60 * 1000;
            } else {
              token.error = "BackendAuthenticationError";
            }
          } else if (account.provider === "github") {
            // Store the GitHub access token for repo access
            token.githubAccessToken = account.access_token;

            const res = await fetch(`${apiUrl}/api/v1/auth/github`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ accessToken: account.access_token }),
            });
            const data = await res.json();
            if (res.ok && data) {
              token.backendAccessToken = data.accessToken;
              token.backendRefreshToken = data.refreshToken;
              token.backendUserId = data.user?.id;
              token.backendUsername = data.user?.username;
              token.backendRoles = data.user?.roles;
              token.backendAccessTokenExpires = Date.now() + 59 * 60 * 1000;
            } else {
              token.error = "BackendAuthenticationError";
            }
          }
        } catch (error) {
          token.error = "BackendAuthenticationError";
        }
        return token;
      }

      // Check if token needs refresh
      if (Date.now() < ((token.backendAccessTokenExpires as number) || 0)) {
        return token;
      }

      // Refresh token
      try {
        const res = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: token.backendRefreshToken }),
        });
        const data = await res.json();
        if (res.ok && data) {
          token.backendAccessToken = data.accessToken;
          token.backendRefreshToken = data.refreshToken;
          token.backendAccessTokenExpires = Date.now() + 59 * 60 * 1000;
        } else {
          token.error = "RefreshAccessTokenError";
        }
      } catch (error) {
        token.error = "RefreshAccessTokenError";
      }

      return token;
    },
    async session({ session, token }) {
      session.backendAccessToken = token.backendAccessToken;
      session.backendUserId = token.backendUserId;
      session.backendUsername = token.backendUsername;
      session.backendRoles = token.backendRoles;
      session.error = token.error;
      (session as any).githubAccessToken = token.githubAccessToken;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
