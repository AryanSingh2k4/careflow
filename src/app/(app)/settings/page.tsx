"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

type Notice = { tone: "success" | "error"; text: string } | null;

export default function SettingsPage() {
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const supabase = createClient();

  useEffect(() => {
    let active = true;

    async function fetchProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("name, email, phone")
          .eq("auth_user_id", user.id)
          .single();

        if (!active) return;

        if (data) {
          setProfile({
            name: data.name || user.user_metadata?.full_name || "",
            email: data.email || user.email || "",
            phone: data.phone || "",
          });
        } else {
          setProfile({
            name: user.user_metadata?.full_name || "",
            email: user.email || "",
            phone: "",
          });
        }
      }
      setIsLoading(false);
    }

    fetchProfile();

    return () => {
      active = false;
    };
  }, [supabase]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setNotice(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({ name: profile.name, phone: profile.phone })
        .eq("auth_user_id", user.id);

      setNotice(
        error
          ? { tone: "error", text: "We couldn't save your profile. Please try again." }
          : { tone: "success", text: "Your profile is up to date." }
      );
    }

    setIsSaving(false);
  };

  const initials = (profile.name || profile.email || "?").trim().charAt(0).toUpperCase();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.assign("/login");
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <header>
        <p className="text-label-sm uppercase tracking-[0.16em] text-primary/75">Your account</p>
        <h1 className="mt-1.5 font-headline-lg text-headline-lg text-on-surface">
          Account settings
        </h1>
        <p className="mt-1.5 max-w-lg text-body-md text-on-surface-variant">
          Keep your details current so your care team can reach you.
        </p>
      </header>

      <div className="mt-7 grid gap-4 lg:grid-cols-[20rem_1fr] lg:items-start">
        {/* Profile summary */}
        <div className="rounded-panel border border-outline-variant/70 bg-surface-container-lowest p-6 shadow-card">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-14 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3.5">
                <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary font-display text-xl font-semibold text-on-primary ring-4 ring-primary-container/60">
                  {initials || "?"}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-headline-sm text-headline-sm text-on-surface">
                    {profile.name || "Your profile"}
                  </p>
                  <p className="truncate text-body-sm text-on-surface-variant">
                    {profile.email || "Signed in"}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2.5 border-t border-outline-variant/60 pt-4 text-[13px]">
                <p className="flex items-center gap-2 text-on-surface-variant">
                  <Mail className="h-3.5 w-3.5 text-primary" aria-hidden />
                  <span className="truncate">{profile.email || "No email on file"}</span>
                </p>
                <p className="flex items-center gap-2 text-on-surface-variant">
                  <Phone className="h-3.5 w-3.5 text-primary" aria-hidden />
                  <span className="truncate">{profile.phone || "No phone added yet"}</span>
                </p>
              </div>

              <div className="mt-5 rounded-2xl bg-primary-container/45 p-3.5">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-on-primary-container">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  Private to your account
                </p>
                <p className="mt-1 text-[11px] leading-5 text-on-primary-container/80">
                  Your name and phone are used only for your care and appointment updates.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Form */}
        <div className="rounded-panel border border-outline-variant/70 bg-surface-container-lowest p-5 shadow-card sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-headline-sm text-headline-sm text-on-surface">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-primary">
                <UserRound className="h-4 w-4" aria-hidden />
              </span>
              Personal information
            </h2>
            <Badge tone="outline" className="hidden sm:inline-flex">
              Profile
            </Badge>
          </div>

          {isLoading ? (
            <div className="mt-6 space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-11 w-28" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="mt-6 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <label
                    htmlFor="full-name"
                    className="text-[12px] font-semibold text-on-surface-variant"
                  >
                    Full name
                  </label>
                  <input
                    id="full-name"
                    type="text"
                    autoComplete="name"
                    value={profile.name}
                    onChange={(event) =>
                      setProfile({ ...profile, name: event.target.value })
                    }
                    className="w-full rounded-field border border-outline-variant bg-surface px-4 py-3 text-body-md text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/55 focus:border-primary focus:ring-2 focus:ring-primary/15"
                    placeholder="How should we address you?"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="text-[12px] font-semibold text-on-surface-variant"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full cursor-not-allowed rounded-field border border-outline-variant/60 bg-surface-container px-4 py-3 text-body-md text-on-surface-variant/80"
                  />
                  <p className="text-[11px] text-on-surface-variant/75">
                    Your email is managed by your sign-in provider.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="phone"
                    className="text-[12px] font-semibold text-on-surface-variant"
                  >
                    Phone number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    value={profile.phone}
                    onChange={(event) =>
                      setProfile({ ...profile, phone: event.target.value })
                    }
                    className="w-full rounded-field border border-outline-variant bg-surface px-4 py-3 text-body-md text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/55 focus:border-primary focus:ring-2 focus:ring-primary/15"
                    placeholder="e.g. 555-0123"
                  />
                  <p className="text-[11px] text-on-surface-variant/75">
                    Used for appointment reminders.
                  </p>
                </div>
              </div>

              {notice ? (
                <div
                  role={notice.tone === "error" ? "alert" : "status"}
                  className={`flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[13px] ${
                    notice.tone === "success"
                      ? "bg-success-container text-on-success-container"
                      : "bg-error-container text-on-error-container"
                  }`}
                >
                  {notice.tone === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
                  )}
                  {notice.text}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3 border-t border-outline-variant/60 pt-4">
                <p className="mr-auto hidden text-[11px] text-on-surface-variant/70 sm:block">
                  Changes apply to future visits.
                </p>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : null}
                  {isSaving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 rounded-panel border border-outline-variant/70 bg-surface-container-lowest p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Sign out</h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            You can sign back in any time with {profile.email || "your account email"}.
          </p>
        </div>
        <Button variant="outline" onClick={handleSignOut} className="shrink-0">
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </Button>
      </div>
    </div>
  );
}
