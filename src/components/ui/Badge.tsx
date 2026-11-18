import { cn } from "@/lib/cn";

type BadgeTone = "sage" | "clay" | "honey" | "neutral" | "danger" | "outline";

const tones: Record<BadgeTone, string> = {
  sage: "bg-success-container text-on-success-container border-success/15",
  clay: "bg-secondary-container text-on-secondary-container border-secondary/15",
  honey: "bg-tertiary-container text-on-tertiary-container border-tertiary/20",
  neutral: "bg-surface-container text-on-surface-variant border-outline-variant",
  danger: "bg-error-container text-on-error-container border-error/15",
  outline: "bg-transparent text-on-surface-variant border-outline-variant",
};

export function Badge({
  children,
  tone = "sage",
  dot = false,
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-label-sm font-semibold leading-none",
        tones[tone],
        className
      )}
    >
      {dot ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
      ) : null}
      {children}
    </span>
  );
}
