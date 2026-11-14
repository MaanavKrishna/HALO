import Link from "next/link";
import { cx } from "./cx";

/** The HALO mark: a small limb-brightened ring (the flame) beside the wordmark. */
export function BrandMark({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" className={className}>
      <defs>
        <radialGradient id="halo-mark" cx="50%" cy="50%" r="50%">
          <stop offset="0.55" stopColor="var(--accent)" stopOpacity="0" />
          <stop offset="0.78" stopColor="var(--accent)" stopOpacity="1" />
          <stop offset="0.9" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="10" cy="10" r="10" fill="url(#halo-mark)" />
      <circle cx="10" cy="10" r="1.4" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="HALO home" className={cx("group inline-flex items-center gap-2 rounded-[var(--radius-xs)]", className)}>
      <BrandMark size={20} className="text-fg transition-transform duration-[var(--spring-dur-smooth)] ease-[var(--spring)] group-hover:scale-110" />
      <span className="font-display text-[1.0625rem] font-bold tracking-[0.02em] text-fg">
        HALO
      </span>
    </Link>
  );
}
