"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { cn } from "@/lib/cn";

const storageKey = "careflow_sidebar_collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setCollapsed(localStorage.getItem(storageKey) === "1");
      } catch {
        // Sidebar still works when storage is blocked.
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        // Preference simply won't persist.
      }
      return next;
    });
  };

  return (
    <div className="min-h-dvh bg-background">
      <Header onMenuClick={() => setMobileOpen(true)} />
      <Sidebar
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />

      <main
        className={cn(
          "min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-16 transition-[padding] duration-300 ease-out lg:pb-0",
          collapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        {children}
      </main>

      <MobileNav />
    </div>
  );
}
