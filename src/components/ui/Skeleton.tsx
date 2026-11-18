import { cn } from "@/lib/cn";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-xl bg-surface-container-high/80",
        className
      )}
      {...props}
    />
  );
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = (name || "?").trim().charAt(0).toUpperCase() || "?";
  const sizes = {
    xs: "h-7 w-7 text-[11px]",
    sm: "h-9 w-9 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex flex-shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-on-primary ring-2 ring-surface-container-lowest",
        sizes[size],
        className
      )}
    >
      {initials}
    </span>
  );
}
