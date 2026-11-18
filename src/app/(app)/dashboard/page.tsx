"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Stethoscope, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { CalendarIllustration } from "@/components/brand/Illustrations";

type Appointment = {
  id: string;
  patient_name: string;
  date: string;
  time: string;
  symptoms: string;
  created_at?: string;
};

export default function Dashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAppointments() {
      if (supabase) {
        const { data, error } = await supabase
          .from("appointments")
          .select("*")
          .order("date", { ascending: true })
          .order("time", { ascending: true });

        if (!error && data) {
          setAppointments(data);
        }
      } else {
        setAppointments([]);
      }
      setIsLoading(false);
    }

    fetchAppointments();
  }, []);

  const nextUp = appointments[0];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label-sm uppercase tracking-[0.16em] text-primary/75">
            Clinician view
          </p>
          <h1 className="mt-1.5 font-headline-lg text-headline-lg text-on-surface">
            Today&apos;s care
          </h1>
          <p className="mt-1.5 max-w-lg text-body-md text-on-surface-variant">
            A calm overview of the patients scheduled with your clinic.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-outline-variant/70 bg-surface-container-lowest px-4 py-3 shadow-soft">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-primary">
            <Stethoscope className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-on-surface">Dr. James Wilson</p>
            <p className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
              Active
            </p>
          </div>
        </div>
      </header>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-outline-variant/70 bg-surface-container-lowest p-4 shadow-soft">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-on-surface-variant">
            <Users className="h-3.5 w-3.5 text-primary" aria-hidden />
            Scheduled visits
          </div>
          <p className="mt-2 font-display text-[30px] leading-none font-semibold text-on-surface">
            {isLoading ? "—" : appointments.length}
          </p>
        </div>
        <div className="rounded-card border border-outline-variant/70 bg-surface-container-lowest p-4 shadow-soft">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-on-surface-variant">
            <CalendarDays className="h-3.5 w-3.5 text-secondary" aria-hidden />
            Next visit
          </div>
          <p className="mt-2 truncate font-label-lg text-label-lg font-semibold text-on-surface">
            {isLoading ? "—" : nextUp ? `${nextUp.date} · ${nextUp.time}` : "Nothing scheduled"}
          </p>
        </div>
        <div className="rounded-card border border-outline-variant/70 bg-primary p-4 text-on-primary shadow-card">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-on-primary/80">
            <Stethoscope className="h-3.5 w-3.5" aria-hidden />
            Clinic status
          </div>
          <p className="mt-2 font-label-lg text-label-lg font-semibold">Open today</p>
          <p className="mt-0.5 text-[11px] text-on-primary/75">Schedule is up to date</p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-panel border border-outline-variant/70 bg-surface-container-lowest shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant/60 bg-surface-container-low/50 px-5 py-4">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            Upcoming appointments
          </h2>
          <Badge tone="sage">{isLoading ? "Loading" : `${appointments.length} total`}</Badge>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="hidden h-4 w-32 sm:block" />
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <CalendarIllustration className="h-28 w-32" />
            <h3 className="mt-2 font-headline-md text-headline-md text-on-surface">
              No appointments
            </h3>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              There are no upcoming appointments scheduled yet.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <ul className="divide-y divide-outline-variant/50 md:hidden">
              {appointments.map((appointment) => (
                <li key={appointment.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container text-[13px] font-semibold text-on-secondary-container">
                      {appointment.patient_name?.charAt(0) ?? "?"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-on-surface">
                        {appointment.patient_name}
                      </p>
                      <p className="truncate text-[12px] text-on-surface-variant">
                        {appointment.symptoms}
                      </p>
                    </div>
                    <Badge tone="sage" className="ml-auto shrink-0">
                      Confirmed
                    </Badge>
                  </div>
                  <p className="mt-2.5 flex items-center gap-1.5 text-[12px] text-on-surface-variant">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                    {appointment.date} · {appointment.time}
                  </p>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-outline-variant/60 text-[11px] uppercase tracking-[0.1em] text-on-surface-variant/80">
                    <th className="px-5 py-3 font-semibold">Patient</th>
                    <th className="px-5 py-3 font-semibold">Date &amp; time</th>
                    <th className="px-5 py-3 font-semibold">Reason</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr
                      key={appointment.id}
                      className="border-b border-outline-variant/40 transition-colors last:border-0 hover:bg-surface-container-low/50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-container text-[12px] font-semibold text-on-secondary-container">
                            {appointment.patient_name?.charAt(0) ?? "?"}
                          </span>
                          <span className="text-[14px] font-medium text-on-surface">
                            {appointment.patient_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="text-[13px] text-on-surface">{appointment.date}</span>
                          <span className="text-[11px] font-semibold text-primary">
                            {appointment.time}
                          </span>
                        </div>
                      </td>
                      <td
                        className="max-w-xs truncate px-5 py-4 text-[13px] text-on-surface-variant"
                        title={appointment.symptoms}
                      >
                        {appointment.symptoms}
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone="sage" dot>
                          Confirmed
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
