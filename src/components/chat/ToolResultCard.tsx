"use client";

import {
  CalendarCheck2,
  CalendarDays,
  CalendarClock,
  CircleAlert,
  ListChecks,
  Loader2,
} from "lucide-react";
import type { Message } from "ai/react";
import { Badge } from "@/components/ui/Badge";

type ToolInvocation = NonNullable<Message["toolInvocations"]>[number];

type AvailabilitySlot = { slotId: string; doctor: string; time: string; specialty: string };
type UpcomingAppointment = { id: string; date: string; time: string };

export const appointmentToolNames = new Set([
  "checkAvailability",
  "bookAppointment",
  "getAppointments",
  "rescheduleAppointment",
  "cancelAppointment",
]);

function Card({
  icon,
  title,
  tone = "neutral",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone?: "neutral" | "sage" | "clay" | "error";
  children: React.ReactNode;
}) {
  const toneClasses = {
    neutral: "border-outline-variant/70 bg-surface-container-lowest",
    sage: "border-success/20 bg-success-container/55",
    clay: "border-secondary/20 bg-secondary-container/45",
    error: "border-error/20 bg-error-container/45",
  } as const;

  return (
    <div className={`rounded-2xl border p-3.5 ${toneClasses[tone]}`}>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-lowest/80 text-primary">
          {icon}
        </span>
        <p className="text-[13px] font-semibold text-on-surface">{title}</p>
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

export function ToolResultCard({
  tool,
  isLoading,
  onAction,
}: {
  tool: ToolInvocation;
  isLoading: boolean;
  onAction: (message: string) => void;
}) {
  if (tool.state !== "result") {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest/70 px-3.5 py-2.5 text-[13px] font-medium text-on-surface-variant">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        {tool.toolName === "checkAvailability" ? "Checking the schedule…" : "Taking care of that…"}
      </div>
    );
  }

  const result = tool.result;

  if (result && result.success === false) {
    return (
      <Card icon={<CircleAlert className="h-4 w-4 text-error" aria-hidden />} title="That didn't go through" tone="error">
        <p className="text-[13px] leading-5 text-on-error-container">{result.message}</p>
      </Card>
    );
  }

  if (tool.toolName === "bookAppointment" && result?.success) {
    return (
      <Card
        icon={<CalendarCheck2 className="h-4 w-4 text-success" aria-hidden />}
        title="Appointment confirmed"
        tone="sage"
      >
        <div className="space-y-1.5">
          {result.appointmentId ? (
            <p className="text-[12px] text-on-surface-variant">
              Reference{" "}
              <span className="rounded-md bg-surface-container-lowest px-1.5 py-0.5 font-mono text-[11px] text-primary">
                {result.appointmentId}
              </span>
            </p>
          ) : null}
          <p className="text-[13px] leading-5 text-on-surface">{result.message}</p>
          <p className="text-[12px] text-on-surface-variant">
            You can view the visit any time under Appointments.
          </p>
        </div>
      </Card>
    );
  }

  if (tool.toolName === "checkAvailability") {
    const slots: AvailabilitySlot[] = result?.availableSlots ?? [];

    return (
      <Card icon={<CalendarDays className="h-4 w-4 text-primary" aria-hidden />} title="Available times">
        {slots.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <button
                key={slot.slotId}
                type="button"
                disabled={isLoading}
                onClick={() =>
                  onAction(`Book slot ${slot.slotId} with ${slot.doctor} at ${slot.time}`)
                }
                className="flex min-w-[7.5rem] flex-col items-start gap-0.5 rounded-xl border border-outline-variant/70 bg-surface-container-lowest px-3 py-2 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary-container/50 active:translate-y-0 disabled:opacity-50"
              >
                <span className="text-[13px] font-semibold text-on-surface">{slot.time}</span>
                <span className="text-[11px] text-on-surface-variant">{slot.doctor}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">
                  {slot.specialty}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-error">No times are open for that date.</p>
        )}
      </Card>
    );
  }

  if (tool.toolName === "getAppointments" && result?.success) {
    const appointments: UpcomingAppointment[] = result.appointments ?? [];

    return (
      <Card icon={<ListChecks className="h-4 w-4 text-primary" aria-hidden />} title="Your visits">
        {appointments.length > 0 ? (
          <div className="space-y-2">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-on-surface">
                    {appt.date} at {appt.time}
                  </p>
                  <p className="truncate text-[11px] text-on-surface-variant">
                    Reference <span className="font-mono">{appt.id.split("-")[0]}</span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onAction(`Cancel appointment ${appt.id}`)}
                  className="flex-shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold text-error transition-colors hover:bg-error-container disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-on-surface-variant">No upcoming visits found.</p>
        )}
      </Card>
    );
  }

  if (
    (tool.toolName === "rescheduleAppointment" || tool.toolName === "cancelAppointment") &&
    result?.success
  ) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-secondary/20 bg-secondary-container/45 px-3.5 py-2.5">
        {tool.toolName === "rescheduleAppointment" ? (
          <CalendarClock className="h-4 w-4 text-secondary" aria-hidden />
        ) : (
          <Badge tone="clay" dot>
            Updated
          </Badge>
        )}
        <span className="text-[13px] font-medium text-on-surface">{result.message}</span>
      </div>
    );
  }

  return null;
}

export function ToolStates({ tool }: { tool: ToolInvocation }) {
  if (tool.state === "result") return null;
  return <Loader2 className="h-4 w-4 animate-spin" aria-hidden />;
}
