"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  FolderHeart,
  HeartPulse,
  Home,
  LifeBuoy,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  Settings,
  ShieldAlert,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Wordmark } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

const primaryLinks = [
  { name: "Reception", path: "/", icon: Home },
  { name: "Appointments", path: "/appointments", icon: CalendarDays },
  { name: "Medical records", path: "/records", icon: FolderHeart },
];

const accountLink = { name: "Settings", path: "/settings", icon: Settings };

export function Sidebar({
  isOpen,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const [showEmergency, setShowEmergency] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const renderLink = (
    link: (typeof primaryLinks)[number],
    options?: { compact?: boolean }
  ) => {
    const Icon = link.icon;
    const isActive = pathname === link.path;

    return (
      <Link
        key={link.path}
        href={link.path}
        onClick={onClose}
        title={options?.compact ? link.name : undefined}
        aria-label={options?.compact ? link.name : undefined}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors duration-200",
          options?.compact && "lg:h-11 lg:justify-center lg:px-0",
          isActive
            ? "bg-primary-container text-primary"
            : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary transition-opacity",
            isActive ? "opacity-100" : "opacity-0",
            options?.compact && "lg:hidden"
          )}
          aria-hidden
        />
        <Icon
          className={cn("h-[18px] w-[18px] flex-shrink-0", isActive && "text-primary")}
          strokeWidth={1.9}
          aria-hidden
        />
        {options?.compact ? (
          <span className="lg:sr-only">{link.name}</span>
        ) : (
          <span className="truncate">{link.name}</span>
        )}
      </Link>
    );
  };

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-[55] bg-[#2c2a25]/35 backdrop-blur-[2px] lg:hidden"
        />
      ) : null}

      <aside
        aria-label="Main navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-[60] flex w-64 flex-col border-r border-outline-variant/70 bg-surface-container-low/95 backdrop-blur-xl transition-all duration-300 ease-out lg:top-16 lg:z-40 lg:h-[calc(100dvh-4rem)] lg:translate-x-0",
          isOpen ? "translate-x-0 shadow-float" : "-translate-x-full",
          collapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-4 lg:hidden">
          <Wordmark className="text-[19px]" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-2.5 pb-3 pt-3">
          <div className="mb-2 hidden lg:flex">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-pressed={!collapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface",
                collapsed ? "mx-auto" : "ml-auto"
              )}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
              ) : (
                <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
              )}
            </button>
          </div>

          <p
            className={cn(
              "mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant/60",
              collapsed && "lg:hidden"
            )}
          >
            Your care
          </p>
          <nav className="space-y-1" aria-label="Primary">
            {primaryLinks.map((link) => renderLink(link, { compact: collapsed }))}
          </nav>

          <div className="mt-auto space-y-2 pt-4">
            <div
              className={cn(
                "h-px bg-outline-variant/70",
                collapsed && "lg:mx-auto lg:w-8"
              )}
            />

            {collapsed ? (
              <div className="lg:flex lg:flex-col lg:items-center">
                <button
                  type="button"
                  onClick={() => setShowEmergency(true)}
                  title="Emergency support"
                  aria-label="Emergency support"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container transition-colors hover:bg-secondary-container/70"
                >
                  <HeartPulse className="h-[18px] w-[18px]" aria-hidden />
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-secondary/15 bg-secondary-container/55 p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface-container-lowest/80 text-secondary">
                    <LifeBuoy className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-on-secondary-container">
                      Need urgent help?
                    </p>
                    <p className="mt-0.5 text-[11px] leading-4 text-on-secondary-container/80">
                      Call local emergency services. This portal isn&apos;t monitored.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmergency(true)}
                  className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-[12px] font-semibold text-on-secondary transition-colors hover:bg-secondary/90"
                >
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                  Emergency support
                </button>
              </div>
            )}

            <nav className="space-y-1" aria-label="Account">
              {renderLink(accountLink, { compact: collapsed })}
            </nav>

            <p
              className={cn(
                "px-3 pt-1 text-[10.5px] leading-4 text-on-surface-variant/60",
                collapsed && "lg:hidden"
              )}
            >
              Care that feels personal.
              <br />
              Answers from clinic-approved information.
            </p>
          </div>
        </div>
      </aside>

      <Modal
        open={showEmergency}
        onClose={() => setShowEmergency(false)}
        title="Emergency contacts"
        description="Please read before calling — this portal is not monitored for emergencies."
        footer={
          <Button variant="outline" className="w-full" onClick={() => setShowEmergency(false)}>
            Close window
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl bg-error-container/60 p-4 text-on-error-container">
            <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden />
            <p className="text-body-sm leading-6">
              If you are experiencing a life-threatening medical emergency, please
              immediately call your local emergency services.
            </p>
          </div>

          <a
            href="tel:911"
            className="group flex items-center gap-4 rounded-2xl bg-error p-4 text-on-error transition-transform active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
              <Phone className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-label-lg text-label-lg">Call 911</span>
              <span className="block text-sm opacity-90">Medical emergency</span>
            </span>
          </a>

          <a
            href="tel:1-800-273-8255"
            className="flex items-center gap-4 rounded-2xl border border-error/25 bg-surface-container-lowest p-4 text-error transition-colors hover:bg-error-container/40"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-error-container">
              <LifeBuoy className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-label-lg text-label-lg">24/7 Nurse Hotline</span>
              <span className="block text-sm opacity-80">1-800-CAREFLOW</span>
            </span>
          </a>
        </div>
      </Modal>
    </>
  );
}
