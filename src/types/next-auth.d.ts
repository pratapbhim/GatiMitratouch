import "next-auth";

declare module "next-auth" {
  interface User {
    organization?: string;
  }
  interface Session {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      organization?: string;
    };
  }
}
