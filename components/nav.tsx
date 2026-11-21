"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessagesSquare,
  GraduationCap,
  ListChecks,
  Hammer,
  CalendarDays,
  UserRound,
  ShieldCheck,
  Users,
  ClipboardCheck,
  School,
  Boxes,
  BookOpenCheck,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/* Icon resolution happens inside this client module, so nothing
   non-serialisable crosses the server/client boundary. */

const STUDENT_NAV: NavItem[] = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/tutor", label: "AI Tutor", icon: MessagesSquare },
  { href: "/app/learning", label: "My Learning", icon: GraduationCap },
  { href: "/app/practice", label: "Practice", icon: ListChecks },
  { href: "/app/projects", label: "Projects", icon: Hammer },
  { href: "/app/events", label: "Events", icon: CalendarDays },
  { href: "/app/profile", label: "Profile", icon: UserRound },
];

const MENTOR_NAV: NavItem[] = [
  { href: "/mentor", label: "Assigned work", icon: ClipboardCheck },
  { href: "/mentor/learners", label: "Learners", icon: Users },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: ShieldCheck },
  { href: "/admin/learning", label: "Learning content", icon: BookOpenCheck },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/projects", label: "Projects", icon: Hammer },
  { href: "/admin/schools", label: "School requests", icon: School },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/members", label: "Members", icon: Users },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/app" || href === "/admin" || href === "/mentor") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function Group({
  title,
  items,
  pathname,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-mid">{title}</p>
      <ul className="space-y-0.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors ${
                  active ? "bg-white/10 backdrop-blur-lg border border-white/20 text-ink" : "text-strong hover:bg-mist hover:text-ink"
                }`}
              >
                <Icon size={15} strokeWidth={1.8} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SidebarNav({ isStaff, isAdmin }: { isStaff: boolean; isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <>
      <Group title="Learn" items={STUDENT_NAV} pathname={pathname} />
      {isStaff ? (
        <Group title="Operate" items={isAdmin ? ADMIN_NAV : MENTOR_NAV} pathname={pathname} />
      ) : null}
    </>
  );
}

export function MobileTabs({ isStaff, isAdmin }: { isStaff: boolean; isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isStaff
    ? [...STUDENT_NAV.slice(0, 4), ...(isAdmin ? ADMIN_NAV : MENTOR_NAV)]
    : STUDENT_NAV;
  return (
    <nav
      aria-label="Workspace"
      className="fixed inset-x-0 bottom-0 z-50 flex gap-1 overflow-x-auto border-t border-white/15 bg-night/95 px-3 pt-2 shadow-[0_-10px_40px_-12px_rgba(0,0,0,0.35)] backdrop-blur-2xl [scrollbar-color:rgba(255,255,255,0.25)_transparent] supports-[backdrop-filter]:bg-night/75 lg:hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      {items.slice(0, 4).map(({ href, label, icon: Icon }) => {
        const active = isActivePath(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex h-11 min-w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-3 text-[11px] font-medium transition-colors duration-150 active:scale-[0.98] ${
              active
                ? "bg-white text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={17} strokeWidth={1.8} aria-hidden />
            <span className="whitespace-nowrap">{label}</span>
          </Link>
        );
      })}
      {/* More button */}
      {items.length > 4 && (
        <details className="relative">
          <summary className="flex h-11 min-w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-3 text-[11px] font-medium text-white/70 hover:bg-white/10 hover:text-white cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
            More
          </summary>
          <div className="absolute bottom-full mb-2 w-40 rounded bg-white/10 backdrop-blur-lg border border-white/20 shadow-lg">
            <ul className="flex flex-col p-2">
              {items.slice(4).map(({ href, label }) => (
                <li key={href} className="my-1">
                  <Link href={href} className="block px-2 py-1 text-sm text-ink hover:bg-white/20 rounded">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}

    </nav>
  );
}
