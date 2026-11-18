"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { Button, buttonStyles } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global Error caught:", error);
  }, [error]);

  return (
    <div className="warm-bloom flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-md rounded-panel border border-outline-variant/80 bg-surface-container-lowest p-8 text-center shadow-card">
        <LogoMark className="mx-auto h-12 w-12" />
        <span className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-error-container text-error">
          <AlertTriangle className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 font-headline-md text-headline-md text-on-surface">
          Something went wrong
        </h1>
        <p className="mt-2 text-body-sm text-on-surface-variant">
          We hit an unexpected snag loading this page. Your information is safe — please try
          again.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => reset()} className="flex-1">
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </Button>
          <Link href="/" className={buttonStyles({ variant: "outline", className: "flex-1" })}>
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
