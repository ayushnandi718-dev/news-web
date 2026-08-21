"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/v1/admin/session", { method: "DELETE" });
        router.push("/admin/login");
        router.refresh();
      }}
      className="font-semibold text-slate-500 hover:text-brand"
    >
      Log out
    </button>
  );
}
