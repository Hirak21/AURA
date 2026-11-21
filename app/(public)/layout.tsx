import { PublicHeader, PublicFooter } from "@/components/public-header";

/** Public surfaces receive the scoped gold accent (design.md §2.2). */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-surface flex min-h-dvh flex-col">
      <PublicHeader />
      <main id="main" className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
