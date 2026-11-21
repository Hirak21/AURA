import { redirect } from "next/navigation";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function MentorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mentor");
  if (!hasRole(user, "mentor", "reviewer", "admin")) redirect("/app");
  return (
    <AppShell user={user} context="mentor">
      {children}
    </AppShell>
  );
}
