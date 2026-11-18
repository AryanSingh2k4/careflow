"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CalendarClock,
  CalendarPlus,
  CalendarSearch,
  CalendarX,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { CalendarIllustration } from "@/components/brand/Illustrations";
import { cn } from "@/lib/cn";

type AppointmentCard = {
  id: string;
  date: string;
  time: string;
  patient_name: string | null;
  symptoms: string | null;
  doctor: string | null;
  weekday: string;
  day: string;
  month: string;
};

const quickActions = [
  { label: "Book visit", action: "Book Appointment", icon: CalendarPlus, tone: "sage" },
  { label: "Check times", action: "Check Availability", icon: CalendarSearch, tone: "honey" },
  { label: "Reschedule", action: "Reschedule Appointment", icon: CalendarClock, tone: "clay" },
  { label: "Cancel visit", action: "Cancel Appointment", icon: CalendarX, tone: "neutral" },
] as const;

const toneStyles = {
  sage: "bg-primary-container text-primary",
  honey: "bg-tertiary-container text-tertiary",
  clay: "bg-secondary-container text-secondary",
  neutral: "bg-surface-container text-on-surface-variant",
} as const;

export function InfoPanel({
  onAction,
  refreshTrigger = 0,
}: {
  onAction?: (action: string) => void;
  refreshTrigger?: number;
}) {
  const [appointments, setAppointments] = useState<AppointmentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let active = true;

    async function fetchAppointments() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("auth_user_id", user.id)
        .single();

      if (!active) return;

      if (!profile) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("appointments")
        .select("id, symptoms, status, slots(start_time), doctors(name)")
        .eq("patient_id", profile.id)
        .eq("status", "scheduled")
        .limit(3);

      if (!active) return;

      if (!error && data) {
        const rows = data as unknown as Array<{
          id: string;
          symptoms: string | null;
          slots: { start_time: string } | null;
          doctors: { name: string } | null;
        }>;

        const sortedData = rows.sort(
          (a, b) =>
            new Date(a.slots?.start_time ?? 0).getTime() -
            new Date(b.slots?.start_time ?? 0).getTime()
        );

        const formatted = sortedData.map((appt) => {
          const startTime = new Date(appt.slots?.start_time ?? 0);
          const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Kolkata",
            weekday: "long",
          });
          const dayFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Kolkata",
            day: "numeric",
          });
          const monthFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Kolkata",
            month: "short",
          });

          return {
            id: appt.id,
            date: startTime.toLocaleDateString(),
            time: startTime.toLocaleTimeString("en-US", {
              timeZone: "Asia/Kolkata",
              hour: "2-digit",
              minute: "2-digit",
            }),
            patient_name: profile.name,
            symptoms: appt.symptoms,
            doctor: appt.doctors?.name ?? null,
            weekday: weekdayFormatter.format(startTime),
            day: dayFormatter.format(startTime),
            month: monthFormatter.format(startTime),
          };
        });

        setAppointments(formatted);
      }

      setLoading(false);
    }

    fetchAppointments();

    return () => {
      active = false;
    };
  }, [refreshTrigger, supabase]);

  const nextVisit = appointments[0];

  return (
    <aside className="hidden w-full flex-col gap-4 px-3 pb-6 pt-1 sm:px-4 md:flex md:w-[21rem] md:flex-shrink-0 md:overflow-y-auto md:min-h-0 md:p-0 md:py-5 md:pr-4 md:pl-0 lg:w-[22rem] xl:w-[23rem] custom-scrollbar">
      {/* Next visit */}
      {loading ? (
        <div className="rounded-panel border border-outline-variant/70 bg-surface-container-lowest p-5 shadow-card">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-4 h-14 w-32" />
          <Skeleton className="mt-4 h-4 w-40" />
          <Skeleton className="mt-2 h-4 w-28" />
        </div>
      ) : nextVisit ? (
        <div className="relative overflow-hidden rounded-panel bg-primary p-5 text-on-primary shadow-card">
          <div
            className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-on-primary/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-on-primary/5"
            aria-hidden
          />

          <div className="flex items-center justify-between gap-3">
            <p className="text-label-sm uppercase tracking-[0.16em] text-on-primary/75">
              Next visit
            </p>
            <span className="flex items-center gap-1.5 rounded-full bg-on-primary/15 px-2.5 py-1 text-[11px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-on-primary" aria-hidden />
              Confirmed
            </span>
          </div>

          <div className="mt-3 flex items-end gap-3">
            <span className="font-display text-[3.4rem] leading-[0.9] font-semibold tracking-tight">
              {nextVisit.day}
            </span>
            <span className="pb-1 text-sm leading-5 text-on-primary/85">
              {nextVisit.weekday}
              <br />
              {nextVisit.month}
            </span>
          </div>

          <p className="mt-3 text-[15px] font-semibold">{nextVisit.time}</p>
          <p className="mt-1 flex items-center gap-2 text-[13px] text-on-primary/85">
            <Stethoscope className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
            <span className="truncate">
              {nextVisit.doctor ? `Dr. ${nextVisit.doctor}` : "Care team"}
            </span>
          </p>

          {nextVisit.symptoms ? (
            <p className="mt-3 line-clamp-2 rounded-xl bg-on-primary/10 px-3 py-2 text-[12px] leading-5 text-on-primary/85">
              {nextVisit.symptoms}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onAction?.("Reschedule Appointment")}
              className="inline-flex items-center gap-1.5 rounded-full bg-on-primary px-3.5 py-2 text-[12px] font-semibold text-primary transition-transform hover:scale-[1.02] active:scale-95"
            >
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              Reschedule
            </button>
            <Link
              href="/appointments"
              className="inline-flex items-center gap-1.5 rounded-full border border-on-primary/30 px-3.5 py-2 text-[12px] font-semibold text-on-primary transition-colors hover:bg-on-primary/10"
            >
              All visits
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-panel border border-outline-variant/70 bg-surface-container-lowest p-5 text-center shadow-card">
          <CalendarIllustration className="mx-auto h-28 w-32" />
          <h2 className="mt-2 font-headline-sm text-headline-sm text-on-surface">
            No visits yet
          </h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            When you&apos;re ready, I can help you find a time.
          </p>
          <Button className="mt-4 w-full" onClick={() => onAction?.("Book Appointment")}>
            <CalendarPlus className="h-4 w-4" aria-hidden />
            Book an appointment
          </Button>
        </div>
      )}

      {/* Upcoming list */}
      {!loading && appointments.length > 1 ? (
        <div className="rounded-card border border-outline-variant/70 bg-surface-container-lowest p-4 shadow-soft">
          <p className="mb-2.5 text-label-sm uppercase tracking-[0.14em] text-on-surface-variant/75">
            Coming up
          </p>
          <div className="space-y-2">
            {appointments.slice(1).map((appt) => (
              <div key={appt.id} className="flex items-center gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-surface-container text-[11px] font-semibold leading-none text-on-surface">
                  <span className="text-[9px] uppercase text-on-surface-variant">{appt.month}</span>
                  {appt.day}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-on-surface">
                    {appt.weekday} · {appt.time}
                  </p>
                  <p className="truncate text-[11px] text-on-surface-variant">
                    {appt.doctor ? `Dr. ${appt.doctor}` : "Care team"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Quick actions */}
      <div className="rounded-card border border-outline-variant/70 bg-surface-container-lowest p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Quick actions</h2>
          <span className="text-[11px] text-on-surface-variant/70">Ask Mira</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.action}
                type="button"
                onClick={() => onAction?.(action.action)}
                className="group flex flex-col items-start gap-2 rounded-2xl border border-outline-variant/60 bg-surface p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft active:translate-y-0"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-transform group-hover:scale-105",
                    toneStyles[action.tone]
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-[12px] font-semibold leading-4 text-on-surface">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Care note */}
      <div className="rounded-card border border-outline-variant/60 bg-surface-container-low/70 p-4">
        <p className="flex items-center gap-2 text-[12px] font-semibold text-on-surface">
          <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden />
          Calm, clear answers
        </p>
        <p className="mt-1.5 text-[12px] leading-5 text-on-surface-variant">
          Questions about hours, preparation or records are answered from clinic-approved
          information, with sources you can open.
        </p>
        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-on-surface-variant/80">
          <ShieldCheck className="h-3 w-3" aria-hidden />
          Your details stay in your account.
        </p>
        <Link
          href="/settings"
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
        >
          Review your profile
          <ArrowUpRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
    </aside>
  );
}
