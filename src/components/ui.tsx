import type { ComponentProps, ReactNode } from "react";

/** Shared primitives. Kept in one file because there are only a handful. */

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-border bg-surface shadow-sm ${className}`}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          {typeof title === "string" ? (
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted">
              {title}
            </h2>
          ) : (
            title
          )}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-4 py-8 text-center text-sm text-muted sm:px-5">{children}</p>;
}

// min-h-11 is 44px: the smallest thing a thumb hits reliably. Relaxed from sm up,
// where a pointer is doing the aiming.
const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9";

const buttonVariants = {
  primary: "bg-accent text-white hover:opacity-90",
  secondary: "border border-border bg-surface text-foreground hover:bg-surface-muted",
  danger: "border border-border text-negative hover:bg-accent-soft",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      {...props}
      className={`${buttonBase} ${buttonVariants[variant]} ${className}`}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

/**
 * Everything but the width, for the fields that are not full-bleed. Appending a
 * narrower w-* to inputClass does not work: both are width utilities and which
 * one wins is decided by their order in the generated stylesheet, not by the
 * order you wrote them in.
 */
export const inputBaseClass =
  // text-base is 16px, and iOS Safari zooms the whole page when you focus a field
  // smaller than that. Back to 14px from sm up, where nothing zooms.
  "min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 sm:min-h-0 sm:text-sm";

export const inputClass = `w-full ${inputBaseClass}`;

/**
 * The small bordered actions that sit at the end of a list row -- Delete, Close
 * season, Deactivate. Same 44px floor as Button; the label stays small.
 */
export const rowActionClass =
  "inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-xs text-muted transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-50 sm:min-h-8";

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-negative/40 bg-accent-soft px-3 py-2 text-sm text-negative"
    >
      {message}
    </p>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "active";
}) {
  const tones = {
    neutral: "border-border text-muted",
    active: "border-positive/40 bg-positive/10 text-positive",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
