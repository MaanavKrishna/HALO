import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export type CardVariant = "solid" | "glass" | "outline";

const VARIANT: Record<CardVariant, string> = {
  solid: "bg-surface-1 border border-line shadow-[var(--inner-highlight),var(--elev-2)]",
  glass: "glass",
  outline: "border border-line bg-transparent",
};

type CardProps = HTMLAttributes<HTMLElement> & {
  variant?: CardVariant;
  /** Adds hover lift and press feedback. Use when the whole card is one link or button (put it inside). */
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  as?: "div" | "article" | "section" | "li";
};

const PAD = { none: "", sm: "p-4", md: "p-5 sm:p-6", lg: "p-6 sm:p-8" } as const;

/**
 * A grouped surface. Cards hold one idea each; never nest cards (use a Divider
 * inside instead). Glass only when the card floats over imagery or the orb.
 */
export function Card({ variant = "solid", interactive = false, padding = "md", as: Tag = "div", className, ...rest }: CardProps) {
  return (
    <Tag
      className={cx(
        "relative rounded-[var(--radius-lg)]",
        VARIANT[variant],
        PAD[padding],
        interactive &&
          "transition-[transform,box-shadow,border-color] duration-[var(--dur-base)] ease-out focus-within:border-accent-line hover:-translate-y-0.5 hover:border-accent-line hover:shadow-[var(--inner-highlight),var(--glow-1)] active:translate-y-0 active:scale-[0.99] [&_a]:after:absolute [&_a]:after:inset-0 [&_a]:after:rounded-[inherit] [&_a:focus-visible]:outline-none",
        className,
      )}
      {...rest}
    />
  );
}
