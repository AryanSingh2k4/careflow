"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  CalendarPlus,
  Clock3,
  Stethoscope,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Badge } from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { CalendarIllustration } from "@/components/brand/Illustrations";
import { cn } from "@/lib/cn";

type Appointment = {
  id: string;
  symptoms: string;
  status: string;
  slots: {
    start_time: string;
  };
  doctors: {
    name: string;
    specialty: string;
  };
};

type Tab = "upcoming" | "past" | "cancelled" | "all";

const tabs: { id: Tab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "All" },
];

function statusTone(status: string) {
  if (status === "cancelled") return "danger" as const;
  if (status === "completed") return "neutral" as const;
  return "sage" as const;
}

function statusLabel(status: string) {
  if (!status) return "Confirmed";
  if (status === "scheduled") return "Confirmed";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [now, setNow] = useState(0);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(timer);
  }, []);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        setLoadError(true);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile) {
        setAppointments([]);
        return;
      }

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          id,
          symptoms,
          status,
          slots (
            start_time
          ),
          doctors (
            name,
            specialty
          )
        `
        )
        .eq("patient_id", profile.id);

      if (error) throw error;
      setAppointments((data || []) as unknown as Appointment[]);
    } catch {
      setLoadError(true);
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => void fetchAppointments(), 0);
    return () => clearTimeout(timer);
  }, [fetchAppointments]);

  const counts = useMemo(
    () => ({
      upcoming: appointments.filter(
        (appointment) =>
          appointment.status !== "cancelled" &&
          new Date(appointment.slots?.start_time || 0).getTime() >= now
      ).length,
      past: appointments.filter(
        (appointment) => new Date(appointment.slots?.start_time || 0).getTime() < now
      ).length,
      cancelled: appointments.filter((appointment) => appointment.status === "cancelled").length,
      all: appointments.length,
    }),
    [appointments, now]
  );

  const visible = useMemo(() => {
    const filtered = appointments.filter((appointment) => {
      const start = new Date(appointment.slots?.start_time || 0).getTime();
      if (tab === "upcoming") return appointment.status !== "cancelled" && start >= now;
      if (tab === "past") return start < now;
      if (tab === "cancelled") return appointment.status === "cancelled";
      return true;
    });

    return filtered.sort((a, b) => {
      const first = new Date(a.slots?.start_time || 0).getTime();
      const second = new Date(b.slots?.start_time || 0).getTime();
      return tab === "upcoming" ? first - second : second - first;
    });
  }, [appointments, tab, now]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label-sm uppercase tracking-[0.16em] text-primary/75">Your care</p>
          <h1 className="mt-1.5 font-headline-lg text-headline-lg text-on-surface">
            Appointments
          </h1>
          <p className="mt-1.5 max-w-lg text-body-md text-on-surface-variant">
            Every visit, past and upcoming, in one calm place.
          </p>
        </div>
        <Link href="/" className={buttonStyles({ variant: "primary", className: "shrink-0" })}>
          <CalendarPlus className="h-4 w-4" aria-hidden />
          Book a visit
        </Link>
      </header>

      <div className="mt-7 flex flex-wrap gap-2" role="tablist" aria-label="Appointment filters">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors",
              tab === item.id
                ? "border-primary bg-primary text-on-primary"
                : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary/30 hover:text-on-surface"
            )}
          >
            {item.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] leading-none",
                tab === item.id ? "bg-on-primary/20" : "bg-surface-container"
              )}
            >
              {counts[item.id]}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="flex items-center gap-4 rounded-card border border-outline-variant/70 bg-surface-container-lowest p-5"
              >
                <Skeleton className="h-16 w-16 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="hidden h-8 w-20 rounded-full sm:block" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div
            className="flex flex-col items-center rounded-panel border border-outline-variant/70 bg-surface-container-lowest px-6 py-12 text-center shadow-card"
            role="alert"
          >
            <h2 className="font-headline-md text-headline-md text-on-surface">
              Couldn’t load your appointments
            </h2>
            <p className="mt-1 max-w-sm text-body-sm text-on-surface-variant">
              Please check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => void fetchAppointments()}
              className={buttonStyles({ className: "mt-5" })}
            >
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center rounded-panel border border-outline-variant/70 bg-surface-container-lowest px-6 py-12 text-center shadow-card">
            <CalendarIllustration className="h-32 w-36" />
            <h2 className="mt-2 font-headline-md text-headline-md text-on-surface">
              {tab === "upcoming"
                ? "No upcoming visits"
                : tab === "cancelled"
                  ? "Nothing cancelled"
                  : tab === "past"
                    ? "No past visits yet"
                    : "No visits yet"}
            </h2>
            <p className="mt-1 max-w-sm text-body-sm text-on-surface-variant">
              {tab === "upcoming"
                ? "When you book a visit it will appear here with the time and care team."
                : "Anything that happens to your visits will be collected here."}
            </p>
            <Link href="/" className={buttonStyles({ className: "mt-5" })}>
              Talk to Mira
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((appointment) => {
              const startTime = new Date(appointment.slots?.start_time || new Date());

              const weekday = new Intl.DateTimeFormat("en-US", {
                timeZone: "Asia/Kolkata",
                weekday: "short",
              }).format(startTime);
              const day = new Intl.DateTimeFormat("en-US", {
                timeZone: "Asia/Kolkata",
                day: "numeric",
              }).format(startTime);
              const month = new Intl.DateTimeFormat("en-US", {
                timeZone: "Asia/Kolkata",
                month: "short",
              }).format(startTime);
              const time = startTime.toLocaleTimeString("en-US", {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
              });
              const longDate = startTime.toLocaleDateString("en-US", {
                timeZone: "Asia/Kolkata",
                weekday: "long",
                month: "long",
                day: "numeric",
              });

              return (
                <li
                  key={appointment.id}
                  className="group flex flex-col gap-4 rounded-card border border-outline-variant/70 bg-surface-container-lowest p-4 shadow-soft transition-all hover:border-primary/30 hover:shadow-card sm:flex-row sm:items-center sm:p-5"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-[4.25rem] w-[4.25rem] flex-shrink-0 flex-col items-center justify-center rounded-2xl bg-primary-container/70 text-primary">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-80">
                        {month}
                      </span>
                      <span className="font-display text-[26px] leading-7 font-semibold">
                        {day}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                        {weekday}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-on-surface">
                        {longDate}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-on-surface-variant">
                        <Clock3 className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                        {time}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-[13px] text-on-surface-variant">
                        <Stethoscope className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                        <span className="truncate">
                          Dr. {appointment.doctors?.name || "Unassigned"} ·{" "}
                          {appointment.doctors?.specialty || "General"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-3 border-t border-outline-variant/50 pt-3 sm:ml-auto sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                    <Badge tone={statusTone(appointment.status)} dot>
                      {statusLabel(appointment.status)}
                    </Badge>
                    {appointment.symptoms ? (
                      <p
                        className="line-clamp-1 max-w-[14rem] text-[12px] text-on-surface-variant"
                        title={appointment.symptoms}
                      >
                        {appointment.symptoms}
                      </p>
                    ) : (
                      <p className="flex items-center gap-1 text-[12px] text-on-surface-variant/70">
                        <CalendarDays className="h-3 w-3" aria-hidden />
                        General visit
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-6 text-center text-[11px] text-on-surface-variant/70">
        Times are shown in India Standard Time.
      </p>
    </div>
  );
}
