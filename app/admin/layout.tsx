import { redirect } from "next/navigation";
import { getCurrentUser, canAccessWorkspace } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!canAccessWorkspace(user)) redirect("/app");
  return (
    <AppShell user={user} context="admin">
      {children}
    </AppShell>
  );
}
