import NextAuth, { type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import PostgresAdapter from "@auth/pg-adapter";
import { getAuthDatabasePool, verifyAuthSchema } from "@/lib/auth/postgres";
import { loadWebAuthEnv } from "@/lib/auth/env";
import { resolveAuthRedirect } from "@/lib/auth/redirect";
import { buildClientSession } from "@/lib/auth/session";

const env = loadWebAuthEnv();

const config: NextAuthConfig = {
  adapter: PostgresAdapter(getAuthDatabasePool()),
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/sign-in",
    error: "/auth/error",
  },
  providers: [
    GitHub({
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
      authorization: {
        params: {
          scope: "read:user user:email",
        },
      },
      allowDangerousEmailAccountLinking: false,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      await verifyAuthSchema();

      if (account?.provider !== "github") {
        console.warn("[auth] Rejected unsupported provider during sign-in.");
        return false;
      }

      if (!account.providerAccountId) {
        console.error("[auth] Rejected GitHub callback because providerAccountId was missing.");
        return false;
      }

      if (profile !== undefined && (typeof profile !== "object" || profile === null)) {
        console.error("[auth] Rejected GitHub callback because profile payload was malformed.");
        return false;
      }

      return true;
    },
    async session({ session, user }) {
      return buildClientSession(session, user);
    },
    async redirect({ url, baseUrl }) {
      return resolveAuthRedirect(url, baseUrl);
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      console.info("[auth] Sign-in succeeded.", {
        provider: account?.provider ?? "unknown",
        userId: user.id,
        isNewUser,
      });
    },
    async signOut(message) {
      const sessionUserId =
        "session" in message &&
        message.session &&
        "user" in message.session &&
        message.session.user &&
        typeof message.session.user === "object" &&
        "id" in message.session.user
          ? message.session.user.id
          : null;
      const tokenSub = "token" in message && message.token && "sub" in message.token ? message.token.sub : null;

      console.info("[auth] Sign-out completed.", {
        sessionUserId,
        tokenSub,
      });
    },
    async linkAccount({ user, account }) {
      console.info("[auth] Provider account linked.", {
        provider: account.provider,
        userId: user.id,
      });
    },
  },
};

export const { auth, handlers, signIn, signOut } = NextAuth(config);
