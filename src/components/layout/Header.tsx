"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronLeft, LogOut, Menu, Settings, ShieldCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Avatar } from "@/components/ui/Skeleton";
import { LogoMark, Wordmark } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

const sectionTitles: Record<string, string> = {
  "/": "Reception",
  "/appointments": "Appointments",
  "/records": "Medical records",
  "/settings": "Settings",
  "/dashboard": "Clinician view",
};

export function Header({
  onMenuClick,
  showBack = false,
}: {
  onMenuClick?: () => void;
  showBack?: boolean;
}) {
  const [name, setName] = useState("?");
  const [email, setEmail] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    let active = true;

    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active || !user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("auth_user_id", user.id)
        .single();

      if (!active) return;
      setName(profile?.name || user.email || "?");
      setEmail(user.email || "");
    }

    fetchUser();
    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!showDropdown && !showNotifications) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowNotifications(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowDropdown(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showDropdown, showNotifications]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.assign("/login");
    }
  };

  const sectionTitle = sectionTitles[pathname] ?? "CareFlow";

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between gap-4 border-b border-outline-variant/60 bg-surface/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        {showBack ? (
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="Back to reception"
            className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open navigation"
            className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        )}

        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-full transition-opacity hover:opacity-85"
          aria-label="CareFlow home"
        >
          <LogoMark className="h-9 w-9" />
          <Wordmark className="hidden text-[21px] sm:inline" />
        </Link>

        <span className="hidden h-6 w-px bg-outline-variant lg:block" aria-hidden />
        <span className="hidden truncate text-label-md font-medium text-on-surface-variant lg:block">
          {sectionTitle}
        </span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <div ref={menuRef} className="relative flex items-center gap-1.5 sm:gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotifications((open) => !open);
                setShowDropdown(false);
              }}
              aria-label="Notifications"
              aria-expanded={showNotifications}
              aria-haspopup="dialog"
              className={cn(
                "relative rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface",
                showNotifications && "bg-surface-container text-on-surface"
              )}
            >
              <Bell className="h-5 w-5" aria-hidden />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-secondary ring-2 ring-surface" />
            </button>

            {showNotifications ? (
              <div
                role="dialog"
                aria-label="Notifications"
                className="absolute right-0 top-12 w-[19rem] overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-float"
              >
                <div className="flex items-center justify-between border-b border-outline-variant/70 px-4 py-3">
                  <p className="font-label-lg text-label-lg text-on-surface">Notifications</p>
                  <span className="rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                    0 new
                  </span>
                </div>
                <div className="flex flex-col items-center px-6 py-7 text-center">
                  <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary-container text-primary">
                    <Bell className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="font-label-md text-on-surface">You&apos;re all caught up</p>
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    We&apos;ll let you know here when a visit is confirmed or changed.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowDropdown((open) => !open);
                setShowNotifications(false);
              }}
              aria-label="Open account menu"
              aria-expanded={showDropdown}
              aria-haspopup="menu"
              className="rounded-full transition-transform hover:scale-[1.03] active:scale-95"
            >
              <Avatar name={name} size="md" />
            </button>

            {showDropdown ? (
              <div
                role="menu"
                aria-label="Account"
                className="absolute right-0 top-12 w-60 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-float"
              >
                <div className="border-b border-outline-variant/70 px-4 py-3">
                  <p className="truncate font-label-md font-semibold text-on-surface">{name}</p>
                  <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                    {email || "Signed in"}
                  </p>
                </div>
                <div className="p-1.5">
                  <Link
                    href="/settings"
                    role="menuitem"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-label-md text-on-surface transition-colors hover:bg-surface-container"
                  >
                    <Settings className="h-4 w-4 text-on-surface-variant" aria-hidden />
                    Account settings
                  </Link>
                  <div className="flex items-start gap-2.5 rounded-xl px-3 py-2.5">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
                    <p className="text-xs leading-5 text-on-surface-variant">
                      Your health information stays private to your account.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-label-md text-error transition-colors hover:bg-error-container/60"
                  >
                    <LogOut className="h-4 w-4" aria-hidden />
                    Sign out
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
