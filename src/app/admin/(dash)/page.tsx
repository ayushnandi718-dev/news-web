import { getSession } from "@/lib/auth";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getSession();
  return <DashboardClient userName={session?.name ?? ""} />;
}
