"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FolderHeart, MessageCircle, Settings } from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { name: "Chat", path: "/", icon: MessageCircle },
  { name: "Visits", path: "/appointments", icon: CalendarDays },
  { name: "Records", path: "/records", icon: FolderHeart },
  { name: "Settings", path: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/70 bg-surface/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto flex h-[4.5rem] max-w-md items-center justify-around px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;

          return (
            <Link
              key={item.path}
              href={item.path}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 transition-colors",
                isActive ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-12 items-center justify-center rounded-full transition-colors",
                  isActive && "bg-primary-container"
                )}
              >
                <Icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.2 : 1.9} aria-hidden />
              </span>
              <span className="text-[10.5px] font-semibold tracking-wide">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
