import Link from "next/link";
import { ArrowUpRight, FlaskConical, Pill, ScanLine, ShieldCheck } from "lucide-react";
import { FolderIllustration } from "@/components/brand/Illustrations";
import { Badge } from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type MedicalRecord = {
  id: string;
  type: string;
  title: string;
  doctor: string;
  date: string;
  status: string;
};

const recordTypes = [
  {
    title: "Lab results",
    description: "Bloodwork and routine test results, explained in plain language.",
    icon: FlaskConical,
    tone: "bg-primary-container text-primary",
  },
  {
    title: "Imaging",
    description: "Scans and reports from your care team, ready when you need them.",
    icon: ScanLine,
    tone: "bg-secondary-container text-secondary",
  },
  {
    title: "Prescriptions",
    description: "Medication history and refill information in one place.",
    icon: Pill,
    tone: "bg-tertiary-container text-tertiary",
  },
];

function RecordIcon({ type }: { type: string }) {
  if (type === "Lab Results") return <FlaskConical className="h-5 w-5" aria-hidden />;
  if (type === "Imaging") return <ScanLine className="h-5 w-5" aria-hidden />;
  return <Pill className="h-5 w-5" aria-hidden />;
}

export default function MedicalRecordsPage() {
  // Records are not yet stored for this demo; the rendering path below is ready for them.
  const records: MedicalRecord[] = [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label-sm uppercase tracking-[0.16em] text-primary/75">Your care</p>
          <h1 className="mt-1.5 font-headline-lg text-headline-lg text-on-surface">
            Medical records
          </h1>
          <p className="mt-1.5 max-w-lg text-body-md text-on-surface-variant">
            Lab results, imaging and prescriptions, kept together and private to your account.
          </p>
        </div>
        <Badge tone="sage" className="shrink-0">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Private to you
        </Badge>
      </header>

      {records.length > 0 ? (
        <ul className="mt-7 space-y-3">
          {records.map((record) => (
            <li key={record.id}>
              <div className="group flex cursor-pointer flex-col gap-4 rounded-card border border-outline-variant/70 bg-surface-container-lowest p-5 shadow-soft transition-all hover:border-primary/35 hover:shadow-card sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container text-secondary transition-colors group-hover:bg-primary group-hover:text-on-primary">
                    <RecordIcon type={record.type} />
                  </span>
                  <div>
                    <p className="font-label-lg text-label-lg font-semibold text-on-surface">
                      {record.title}
                    </p>
                    <p className="text-body-sm text-on-surface-variant">
                      {record.type} · Ordered by {record.doctor}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:ml-auto sm:flex-col sm:items-end">
                  <span className="text-body-sm font-medium text-on-surface">
                    {new Date(record.date).toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <Badge tone={record.status === "Available" ? "sage" : "neutral"}>
                    {record.status}
                  </Badge>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-7 space-y-4">
          <div className="relative overflow-hidden rounded-panel border border-outline-variant/70 bg-surface-container-lowest px-6 py-10 text-center shadow-card sm:px-10">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary-container/45 to-transparent"
              aria-hidden
            />
            <div className="relative flex flex-col items-center">
              <FolderIllustration className="h-32 w-36" />
              <h2 className="mt-2 font-headline-md text-headline-md text-on-surface">
                Your records will appear here
              </h2>
              <p className="mt-1.5 max-w-md text-body-sm text-on-surface-variant">
                There isn&apos;t anything in your file yet. As soon as your care team shares a
                result, scan or prescription, you&apos;ll find it here.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link href="/" className={buttonStyles({})}>
                  Ask Mira a question
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/settings"
                  className={buttonStyles({ variant: "outline" })}
                >
                  Check your profile
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {recordTypes.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.title}
                  className="rounded-card border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-soft"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full",
                      type.tone
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <p className="mt-3 font-label-lg text-label-lg font-semibold text-on-surface">
                    {type.title}
                  </p>
                  <p className="mt-1 text-body-sm text-on-surface-variant">{type.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-[11px] text-on-surface-variant/70">
        Records are only visible to you and your care team.
      </p>
    </div>
  );
}
