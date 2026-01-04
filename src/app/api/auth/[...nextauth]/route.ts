import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      // Only allow users with a valid email domain (organization-based access)
      if (profile?.email && profile.email.endsWith("@yourorg.com")) {
        return true;
      }
      // Optionally, allow all domains for now (customize as needed)
      return true;
    },
    async session({ session, token, user }) {
      // Add organization domain to session
      if (session.user?.email) {
        const domain = session.user.email.split("@")[1];
        session.user.organization = domain;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/api/auth/signin',
    // signOut: '/api/auth/signout', // Removed to prevent redirect loop
    error: '/api/auth/error',
    verifyRequest: '/api/auth/verify-request',
    newUser: '/dashboard', // Redirect new users to dashboard
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // This event is for logging, not redirecting
    },
  },
  redirect({ url, baseUrl }) {
    // Always redirect to dashboard after sign in
    if (url.startsWith("/")) return `${baseUrl}/dashboard`;
    return url;
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };