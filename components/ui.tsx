import * as React from "react";
import clsx from "clsx";

/* ============ Button ============ */
type ButtonVariant = "primary" | "secondary" | "tertiary" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

export const buttonClasses = (variant: ButtonVariant = "primary", size: ButtonSize = "md") =>
  clsx(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:opacity-45",
    size === "sm" && "h-8 px-3 text-[13px]",
    size === "md" && "h-10 px-4 text-sm",
    size === "lg" && "h-12 px-6 text-[15px]",
    variant === "primary" && "bg-ink text-paper hover:bg-black active:bg-black",
    variant === "secondary" && "border border-ink bg-paper text-ink hover:bg-mist active:bg-cloud",
    variant === "tertiary" && "text-ink underline-offset-4 hover:underline",
    variant === "destructive" && "border border-ink bg-paper text-ink hover:bg-cloud",
  );

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={clsx(buttonClasses(variant, size), className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <a className={clsx(buttonClasses(variant, size), className)} {...props} />;
}

/* ============ Form primitives ============ */
export function Label({ children, htmlFor, required }: { children: React.ReactNode; htmlFor?: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-ink">
      {children}
      {required ? <span className="ml-0.5 text-strong">*</span> : <span className="ml-1 text-mid">(optional)</span>}
    </label>
  );
}

const fieldBase =
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-disabled " +
  "transition-colors hover:border-mid focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={clsx(fieldBase, "h-10", className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={clsx(fieldBase, "min-h-[96px] resize-y", className)} {...props} />;
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={clsx(fieldBase, "h-10 appearance-none bg-[length:16px] pr-9", className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23555555' stroke-width='1.6'><path d='M4 6l4 4 4-4'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
        }}
        {...props}
      />
    );
  },
);

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 text-[12.5px] leading-snug text-ink">
      <span aria-hidden className="mr-1 font-mono">!</span>
      {children}
    </p>
  );
}

export function Helper({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-[12.5px] leading-snug text-mid">{children}</p>;
}

/* ============ Surfaces ============ */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("rounded-card border border-line bg-paper", className)}>{children}</div>;
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? <p className="eyebrow mb-1.5">{eyebrow}</p> : null}
        <h2 className="text-[19px] font-semibold tracking-[-0.02em]">{title}</h2>
        {description ? <p className="mt-1 max-w-prose text-[13.5px] leading-relaxed text-strong">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ============ Badges (neutral only — no colour-coded statuses) ============ */
export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "solid" | "outline" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium",
        tone === "solid" && "bg-ink text-paper",
        tone === "neutral" && "bg-cloud text-ink",
        tone === "outline" && "border border-line text-strong",
      )}
    >
      {label}
    </span>
  );
}

export function DemoBadge({ children = "Demo data" }: { children?: React.ReactNode }) {
  return (
    <span className="demo-pill" title="Fictional sample record created for the prototype">
      <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden><circle cx="4.5" cy="4.5" r="3.5" fill="currentColor" /></svg>
      {children}
    </span>
  );
}

/* ============ Empty state ============ */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-line px-6 py-12 text-center">
      <p className="text-[15px] font-medium">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-strong">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ============ Meter: evidence, not vanity ============ */
export function EvidenceMeter({ filled, total, label }: { filled: number; total: number; label: string }) {
  const segments = Array.from({ length: total });
  return (
    <div>
      <div className="flex gap-1" role="img" aria-label={`${label}: ${filled} of ${total} steps with evidence`}>
        {segments.map((_, i) => (
          <span
            key={i}
            className={clsx("h-1.5 flex-1 rounded-full", i < filled ? "bg-ink" : "bg-cloud")}
          />
        ))}
      </div>
      <p className="mt-2 text-[12.5px] text-strong">
        <span className="metric text-ink">{filled}</span> of {total} — {label}
      </p>
    </div>
  );
}

/* ============ Alert ============ */
export function InlineAlert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn" | "error" | "success";
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={clsx(
        "rounded-lg border px-3.5 py-3 text-[13px] leading-relaxed",
        tone === "info" && "border-line bg-mist text-strong",
        tone === "warn" && "border-ink/25 bg-mist text-ink",
        tone === "error" && "border-ink bg-cloud text-ink",
        tone === "success" && "border-ink bg-ink text-paper",
      )}
    >
      {title ? <p className="mb-0.5 font-medium">{title}</p> : null}
      {children}
    </div>
  );
}

/* ============ Data table wrapper ============ */
export function DataTable({ children, caption }: { children: React.ReactNode; caption?: string }) {
  return (
    <div className="table-wrap rounded-card border border-line">
      <table className="w-full border-collapse text-left text-[13.5px]">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={clsx("border-b border-line bg-mist px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-strong", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={clsx("border-b border-line px-4 py-3 align-top last:border-b-0", className)}>{children}</td>;
}
