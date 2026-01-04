import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/api/auth/signin");
  return <DashboardClient userName={session.user?.name || "User"} />;
}
