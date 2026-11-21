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
                  active ? "bg-ink text-paper" : "text-strong hover:bg-mist hover:text-ink"
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
    <nav aria-label="Workspace" className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-lg border-t border-white/20 tutor-scroll flex gap-1 overflow-x-auto px-3 pb-2">
      {items.map(({ href, label }) => {
        const active = isActivePath(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] ${
              active ? "bg-ink text-paper" : "text-strong"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
