import Link from "next/link";
import clsx from "clsx";

/**
 * Official A.U.R.A. artwork from the supplied brand kit.
 *
 * Per 05-guidelines/brand-guidelines.md: never retype or redraw the logo. These
 * components reference the supplied SVG files directly, preserve the original
 * aspect ratio, and switch to the white variant on dark surfaces.
 *
 * The landing-page headline ("Build skills. Create what matters.") is product
 * copy, not part of the logo lockup.
 */

export function Wordmark({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <Link href="/" aria-label="AURA home" className={clsx("inline-flex shrink-0 items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={inverse ? "/brand/aura-wordmark-white.svg" : "/brand/aura-wordmark.svg"}
        alt="AURA"
        className="h-[22px] w-auto object-contain sm:h-[24px]"
        draggable={false}
      />
    </Link>
  );
}

export function Symbol({
  size = 28,
  inverse = false,
  className,
}: {
  size?: number;
  inverse?: boolean;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={inverse ? "/brand/aura-symbol-white.svg" : "/brand/aura-symbol.svg"}
      alt=""
      aria-hidden
      width={size}
      height={Math.round(size * 0.95)}
      className={clsx("shrink-0 object-contain", className)}
      draggable={false}
    />
  );
}

/** Core logo: drone emblem above the dotted A.U.R.A. wordmark. */
export function CoreLogo({
  width = 160,
  inverse = false,
  className,
}: {
  width?: number;
  inverse?: boolean;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={inverse ? "/brand/aura-core-white.svg" : "/brand/aura-core.svg"}
      alt="AURA — Automation & Robotics Association"
      style={{ width }}
      className={clsx("h-auto max-w-full object-contain", className)}
      draggable={false}
    />
  );
}

/** Extended institutional lockup, including the association descriptor. */
export function FullLockup({
  width = 320,
  inverse = false,
  className,
}: {
  width?: number;
  inverse?: boolean;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={inverse ? "/brand/aura-full-lockup-white.svg" : "/brand/aura-full-lockup.svg"}
      alt="AURA — Automation & Robotics Association"
      style={{ width }}
      className={clsx("h-auto max-w-full object-contain", className)}
      draggable={false}
    />
  );
}
