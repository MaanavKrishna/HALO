import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

/**
 * Data table primitives. The wrapper scrolls horizontally on phones and caps
 * height when `maxHeight` is set, with a sticky glass header. Numbers right-
 * align in mono tabular figures (`numeric`).
 */
export function TableFrame({
  caption,
  children,
  maxHeight,
  className,
}: {
  caption: ReactNode;
  children: ReactNode;
  maxHeight?: string;
  className?: string;
}) {
  return (
    <div
      className={cx("overflow-auto rounded-[var(--radius-lg)] border border-line bg-surface-1", className)}
      style={maxHeight ? { maxHeight } : undefined}
      tabIndex={0}
      role="region"
      aria-label={typeof caption === "string" ? caption : undefined}
    >
      <table className="w-full border-collapse text-left text-sm tabular-nums">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="glass-chrome sticky top-0 z-[1]">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="[&>tr]:border-t [&>tr]:border-line [&>tr:hover]:bg-surface-2">{children}</tbody>;
}

export function Tr(props: HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} className={cx("transition-colors duration-[var(--dur-fast)]", props.className)} />;
}

export function Th({ numeric, className, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cx("type-label whitespace-nowrap px-4 py-3 font-medium text-fg-3 shadow-[inset_0_-1px_0_var(--border)]", numeric && "text-right", className)}
      {...rest}
    />
  );
}

export function Td({ numeric, className, ...rest }: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return <td className={cx("px-4 py-3 align-top text-fg-2", numeric && "text-right font-mono text-fg", className)} {...rest} />;
}
