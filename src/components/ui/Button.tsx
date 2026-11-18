import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "soft"
  | "outline"
  | "ghost"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-full font-label-md font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary shadow-[0_10px_24px_-14px_rgba(63,99,80,0.9)] hover:bg-primary/92 hover:shadow-[0_14px_28px_-14px_rgba(63,99,80,0.85)]",
  secondary:
    "bg-secondary-container text-on-secondary-container hover:bg-secondary-container/75",
  soft: "bg-primary-container text-on-primary-container hover:bg-primary-fixed-dim/70",
  outline:
    "border border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary/40 hover:bg-surface-container-low",
  ghost: "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
  danger: "bg-error text-on-error hover:bg-error/90",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-5",
  lg: "h-12 px-7 text-[15px]",
  icon: "h-10 w-10 p-0",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  );
});
