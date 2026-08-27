import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminShell from "@/components/admin/shell";

export default async function AdminDashLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser();
  if (!session) redirect("/admin/login");

  return (
    <AdminShell
      user={{ name: session.name, email: session.email, role: session.role, permissions: session.permissions }}
    >
      {children}
    </AdminShell>
  );
}
