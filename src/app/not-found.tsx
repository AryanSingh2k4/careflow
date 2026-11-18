import Link from "next/link";
import { Compass } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { buttonStyles } from "@/components/ui/Button";
import { FolderIllustration } from "@/components/brand/Illustrations";

export default function NotFound() {
  return (
    <div className="warm-bloom flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-lg rounded-panel border border-outline-variant/80 bg-surface-container-lowest p-8 text-center shadow-card sm:p-10">
        <div className="flex items-center justify-center gap-2.5">
          <LogoMark className="h-10 w-10" />
          <span className="font-headline-sm text-headline-sm text-primary">CareFlow</span>
        </div>
        <FolderIllustration className="mx-auto mt-4 h-32 w-36" />
        <p className="mt-2 text-label-sm uppercase tracking-[0.18em] text-primary/70">
          Page not found
        </p>
        <h1 className="mt-2 font-headline-lg text-headline-lg text-on-surface">
          This page has wandered off
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-body-sm text-on-surface-variant">
          The link may be old, or the page may have moved. Mira can help you get back to your
          care.
        </p>
        <Link href="/" className={buttonStyles({ className: "mt-6" })}>
          <Compass className="h-4 w-4" aria-hidden />
          Back to reception
        </Link>
      </div>
    </div>
  );
}
