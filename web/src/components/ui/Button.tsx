import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium tracking-[-0.005em] " +
  "transition-[background-color,border-color,color,box-shadow,scale] duration-[var(--dur-fast)] ease-out " +
  "active:scale-[0.97] disabled:active:scale-100 disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-fill text-accent-ink shadow-[inset_0_1px_0_var(--fill-highlight),0_4px_18px_-6px_var(--accent-glow)] " +
    "hover:bg-[var(--accent-fill-hover)] hover:shadow-[inset_0_1px_0_var(--fill-highlight),0_8px_28px_-6px_var(--accent-glow)]",
  secondary:
    "border border-line bg-surface-1 text-fg shadow-[var(--inner-highlight),var(--elev-1)] hover:border-line-strong hover:bg-surface-2",
  ghost: "text-fg-2 hover:bg-surface-2 hover:text-fg",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 rounded-[var(--radius-pill)] px-3.5 text-[0.8125rem]",
  md: "h-10 rounded-[var(--radius-pill)] px-5 text-[0.9375rem]",
  lg: "h-12 rounded-[var(--radius-pill)] px-7 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cx(BASE, VARIANT[variant], SIZE[size], className);
}

function Spinner() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" className="animate-[spin_700ms_linear_infinite]">
      <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M17 10a7 7 0 00-7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, keeps the width, and blocks repeat presses. */
  loading?: boolean;
  /** Text announced and shown while loading, e.g. "Generating brief…". */
  loadingLabel?: string;
  icon?: ReactNode;
  iconEnd?: ReactNode;
};

/** The one button. Primary for the single main action on a view; secondary for alternatives; ghost for low-emphasis. */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel,
  icon,
  iconEnd,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
      {!loading && iconEnd}
    </button>
  );
}

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: ReactNode;
    iconEnd?: ReactNode;
    className?: string;
  };

/** A link styled as a button, for navigation actions ("Build a brief"). */
export function ButtonLink({ variant = "primary", size = "md", icon, iconEnd, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      <span>{children}</span>
      {iconEnd}
    </Link>
  );
}

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  /** Required: icon buttons have no visible text. */
  label: string;
  variant?: "secondary" | "ghost";
  size?: "sm" | "md";
};

/** Square icon-only button. Always 40px+ hit area on md; label becomes the accessible name. */
export function IconButton({ label, variant = "ghost", size = "md", className, children, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cx(
        BASE,
        VARIANT[variant],
        size === "sm" ? "size-8 rounded-[var(--radius-sm)]" : "size-10 rounded-[var(--radius-md)]",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
