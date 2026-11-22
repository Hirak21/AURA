import { Wordmark } from "./brand";
import { hasRole, type SessionUser } from "@/lib/auth";
import { signOut } from "@/actions/session";
import { SidebarNav, MobileTabs } from "./nav";

export function AppShell({
  user,
  children,
  context = "student",
}: {
  user: SessionUser;
  children: React.ReactNode;
  context?: "student" | "mentor" | "admin";
}) {
  const isStaff = hasRole(user, "mentor", "reviewer", "admin", "curator", "liaison", "organizer", "custodian");
  const isAdmin = hasRole(user, "admin", "curator", "liaison", "organizer", "custodian");
  const initials = user.displayName.split(" ").map((p) => p[0]).join("").slice(0, 2);

  return (
    <div className="min-h-dvh bg-[linear-gradient(115deg,#f4f4f5_0%,#fafafa_18%,#ffffff_38%)]">
      <div className="mx-auto flex max-w-workspace">
        <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-white/40 bg-white/55 px-3 py-5 shadow-[4px_0_24px_rgba(0,0,0,0.04)] backdrop-blur-lg supports-[backdrop-filter]:bg-white/55 lg:flex">
          {/* Crisp 1px edge highlight so the glass plate reads against the pale canvas. */}
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-black/[0.07] to-transparent" />
          <div className="px-3 pb-6">
            <Wordmark />
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-mid">
              {context === "admin" ? "Core OS" : context === "mentor" ? "Mentor" : "Learning"}
            </p>
          </div>
          <nav aria-label="Workspace" className="flex-1 overflow-y-auto tutor-scroll">
            <SidebarNav isStaff={isStaff} isAdmin={isAdmin} roles={user.roles} />
          </nav>
          <div className="mt-4 border-t border-line pt-4">
            <div className="flex items-center gap-2.5 px-2">
              <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-mono text-[11px] text-paper">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium">{user.displayName}</p>
                <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.1em] text-mid">{user.roles[0]}</p>
              </div>
            </div>
            <form action={signOut} className="mt-2 px-2">
              <button type="submit" className="text-[12px] text-strong underline-offset-4 hover:text-ink hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80 lg:hidden">
            <div className="flex h-14 items-center justify-between px-4">
              <Wordmark />
              <form action={signOut}>
                <button type="submit" className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-strong">
                  Sign out
                </button>
              </form>
            </div>
          </div>

          <main id="main" className="px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-8 lg:pt-8">
            {children}
          </main>
        </div>
      </div>

      {/* Outside the blurred sticky header: a filter ancestor would make
          `position: fixed` resolve against the header instead of the viewport. */}
      <MobileTabs isStaff={isStaff} isAdmin={isAdmin} roles={user.roles} />
    </div>
  );
}
