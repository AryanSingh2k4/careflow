import { LogoMark } from "@/components/brand/Logo";

export function LoadingScreen({ label = "Preparing your care space…" }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <span className="absolute inset-0 -z-10 animate-ping rounded-[1.25rem] bg-primary/10" />
          <LogoMark className="h-14 w-14 animate-pulse" />
        </div>
        <p className="mt-5 font-headline-sm text-headline-sm text-primary">CareFlow</p>
        <p className="mt-1 text-body-sm text-on-surface-variant" role="status">
          {label}
        </p>
      </div>
    </div>
  );
}
