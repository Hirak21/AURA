"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/domain/types";
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
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Compact label for the bottom bar, where width is tight. */
  short?: string;
  /** Roles allowed to see this link. Mirrors the page's requireRolePage() guard. */
  roles?: readonly Role[];
}

/* Icon resolution happens inside this client module, so nothing
   non-serialisable crosses the server/client boundary. */

const STUDENT_NAV: NavItem[] = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/tutor", label: "AI Tutor", icon: MessagesSquare },
  { href: "/app/learning", label: "My Learning", short: "Learning", icon: GraduationCap },
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
  { href: "/admin", label: "Overview", icon: ShieldCheck, roles: ["admin", "curator", "liaison", "organizer", "custodian"] },
  { href: "/admin/learning", label: "Learning content", icon: BookOpenCheck, roles: ["curator", "admin", "mentor"] },
  { href: "/admin/events", label: "Events", icon: CalendarDays, roles: ["organizer", "admin", "curator"] },
  { href: "/admin/projects", label: "Projects", icon: Hammer, roles: ["admin", "curator", "mentor", "reviewer"] },
  { href: "/admin/schools", label: "School requests", icon: School, roles: ["liaison", "admin", "organizer"] },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes, roles: ["custodian", "admin"] },
  { href: "/admin/members", label: "Members", icon: Users, roles: ["admin"] },
];

function allowed(item: NavItem, userRoles: readonly Role[]): boolean {
  return !item.roles || item.roles.some((role) => userRoles.includes(role));
}

function isActivePath(pathname: string, href: string) {
  if (href === "/app" || href === "/admin" || href === "/mentor") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function Group({
  title,
  items,
  pathname,
  userRoles,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  userRoles: readonly Role[];
}) {
  const visible = items.filter((item) => allowed(item, userRoles));
  if (visible.length === 0) return null;
  return (
    <div className="mb-6">
      <p className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-strong">{title}</p>
      <ul className="space-y-0.5">
        {visible.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors ${
                  active
                    ? "bg-ink font-medium text-paper shadow-[0_1px_2px_rgba(0,0,0,0.18)]"
                    : "text-strong hover:bg-white/70 hover:text-ink"
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

export function SidebarNav({ isStaff, isAdmin, roles }: { isStaff: boolean; isAdmin: boolean; roles: readonly Role[] }) {
  const pathname = usePathname();
  return (
    <>
      <Group title="Learn" items={STUDENT_NAV} pathname={pathname} userRoles={roles} />
      {isStaff ? (
        <Group title="Operate" items={isAdmin ? ADMIN_NAV : MENTOR_NAV} pathname={pathname} userRoles={roles} />
      ) : null}
    </>
  );
}

/**
 * Overflow disclosure for the bottom bar.
 *
 * This is intentionally a stateful button, not a native disclosure element
 * inside a scrolling nav. `overflow-x: auto` computes `overflow-y: auto` too,
 * which clips a `bottom-full` popover: it looks laid out but cannot be clicked
 * (elementFromPoint returns null). The nav below is therefore never a scroll
 * container — these five items are sized to always fit.
 */
function MobileMoreMenu({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Navigation closes the menu, including when a link inside it is followed.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-1">
      <button
        type="button"
        aria-label="More workspace links"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-medium transition-colors duration-150 active:scale-[0.98] ${
          open ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <MoreHorizontal size={18} strokeWidth={1.8} aria-hidden />
        <span className="w-full truncate text-center">More</span>
      </button>

      {open ? (
        <div
          id={menuId}
          className="absolute bottom-full right-0 mb-2 w-52 rounded-xl border border-white/15 bg-night/95 p-2 shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
        >
          <ul className="flex flex-col">
            {items.map(({ href, label, icon: Icon }) => {
              const active = isActivePath(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                      active ? "bg-white text-ink" : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon size={15} strokeWidth={1.8} aria-hidden />
                    <span className="truncate">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * On mobile the four visible tabs follow the workspace the user is actually
 * in: an admin on /admin sees admin destinations first, a mentor on /mentor
 * sees mentor destinations first, and the student workspace is the default.
 * Ordering only changes — every link stays reachable, with no duplicates.
 */
export function tabsFor(pathname: string, isStaff: boolean, isAdmin: boolean, userRoles: readonly Role[]): NavItem[] {
  const staffNav = (isAdmin ? ADMIN_NAV : isStaff ? MENTOR_NAV : []).filter((item) => allowed(item, userRoles));
  const context: NavItem[] = pathname.startsWith("/admin") || pathname.startsWith("/mentor") ? staffNav : [];
  const seen = new Set<string>();
  return [...context, ...STUDENT_NAV, ...staffNav].filter((item) => {
    if (!allowed(item, userRoles) || seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}

export function MobileTabs({ isStaff, isAdmin, roles }: { isStaff: boolean; isAdmin: boolean; roles: readonly Role[] }) {
  const pathname = usePathname();
  const items = tabsFor(pathname, isStaff, isAdmin, roles);
  const primary = items.slice(0, 4);
  const overflow = items.slice(4);

  return (
    <nav
      aria-label="Workspace"
      className="fixed inset-x-0 bottom-0 z-50 flex items-stretch gap-1 border-t border-white/15 bg-night/95 px-2 pt-2 shadow-[0_-10px_40px_-12px_rgba(0,0,0,0.35)] backdrop-blur-2xl supports-[backdrop-filter]:bg-night/75 lg:hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      {primary.map(({ href, label, short, icon: Icon }) => {
        const active = isActivePath(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-medium transition-colors duration-150 active:scale-[0.98] ${
              active
                ? "bg-white text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={17} strokeWidth={1.8} aria-hidden />
            <span className="w-full truncate text-center">{short ?? label}</span>
          </Link>
        );
      })}
      {overflow.length > 0 ? <MobileMoreMenu items={overflow} pathname={pathname} /> : null}
    </nav>
  );
}
