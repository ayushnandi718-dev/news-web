import { getCurrentUser } from "@/lib/auth";
import AdminConsole from "./console-client";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  return (
    <AdminConsole
      user={{
        name: user?.name ?? "",
        role: user?.role ?? "",
        permissions: user?.permissions ?? [],
      }}
    />
  );
}
