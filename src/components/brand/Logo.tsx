import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden
      className={cn("h-10 w-10", className)}
      fill="none"
    >
      <rect width="48" height="48" rx="15" fill="#3F6350" />
      <rect
        x="0.75"
        y="0.75"
        width="46.5"
        height="46.5"
        rx="14.25"
        stroke="#FBF7F0"
        strokeOpacity="0.18"
        strokeWidth="1.5"
      />
      <path
        d="M24 13.5v21M13.5 24h21"
        stroke="#FFFDF8"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M29.5 12.4c3.7-.4 6.6 1.2 7.9 4.8-3.6 1.5-6.9.3-7.9-4.8Z"
        fill="#E3CC97"
      />
      <path
        d="M11.8 31.6c.9-3 3.3-4.6 6.6-4.3-.8 3.2-3.2 4.8-6.6 4.3Z"
        fill="#B9CFBE"
      />
    </svg>
  );
}

export function Wordmark({
  className,
  tone = "primary",
}: {
  className?: string;
  tone?: "primary" | "onPrimary";
}) {
  return (
    <span
      className={cn(
        "font-headline-md font-semibold leading-none tracking-tight",
        tone === "primary" ? "text-primary" : "text-on-primary",
        className
      )}
    >
      CareFlow
    </span>
  );
}
