"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { LogoMark, Wordmark } from "@/components/brand/Logo";
import { LoginScene } from "@/components/brand/LoginScene";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const highlights = [
  "Book, move or cancel a visit in a normal conversation.",
  "Answers come from clinic-approved information, with sources.",
  "Your details and records stay private to your account.",
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      console.error(error);
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg("");

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });
      if (error) {
        setErrorMsg(error.message);
      } else {
        router.push("/");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setErrorMsg(error.message);
      } else {
        router.push("/");
      }
    }
    setLoading(false);
  };

  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_27rem] xl:grid-cols-[minmax(0,1fr)_28rem]">
      {/* Brand panel — 70% on desktop */}
      <section className="relative hidden overflow-hidden border-r border-outline-variant/60 bg-[#f5edde] lg:flex lg:flex-col">        <div
          className="pointer-events-none absolute -left-24 -top-24 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,#dce9df_0%,rgba(220,233,223,0)_70%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 right-[-6rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,#f6dfd3_0%,rgba(246,223,211,0)_70%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-1/3 top-1/2 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(244,229,194,0.8)_0%,rgba(244,229,194,0)_70%)]"
          aria-hidden
        />

        <header className="relative flex items-center gap-3 px-8 py-7 xl:px-12">
          <LogoMark className="h-11 w-11" />
          <div>
            <Wordmark className="block text-[23px] text-[#233b2d]" />
            <span className="block text-[9px] font-semibold uppercase tracking-[0.28em] text-[#8a8069]">
              Patient portal
            </span>
          </div>
          <span className="ml-auto hidden items-center gap-2 rounded-full border border-[#3f6350]/15 bg-[#fffdf8]/70 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#3f6350] xl:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3f6350]" aria-hidden />
            Care that listens
          </span>
        </header>

        <div className="relative grid flex-1 items-center gap-6 px-8 pb-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:px-12">
          <div className="max-w-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9c4f36]">
              A calmer way to get care
            </p>
            <h1 className="mt-3 font-display text-[clamp(2.5rem,3.9vw,4rem)] leading-[1.02] font-semibold tracking-[-0.02em] text-[#233b2d]">
              Care that feels personal.
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-7 text-[#6b6459]">
              Find a time, ask a question, and keep your care in one quiet place — with a
              receptionist that never rushes you.
            </p>

            <ul className="mt-6 space-y-3">
              {highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#fffdf8] text-[#3f6350] shadow-[0_4px_12px_-8px_rgba(63,99,80,0.7)]">
                    <Sparkles className="h-3 w-3" aria-hidden />
                  </span>
                  <span className="text-[12.5px] leading-5 text-[#6b6459]">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>

          <LoginScene className="hidden w-full xl:block" />
        </div>

        <footer className="relative flex flex-wrap items-center justify-between gap-3 px-8 pb-6 text-[10.5px] text-[#8a8069] xl:px-12">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#3f6350]" aria-hidden />
            Non-emergency care · CareFlow Demo Clinic
          </span>
          <span>Fictional demo data</span>
        </footer>
      </section>

      {/* Form panel — 30% on desktop */}
      <section className="flex flex-col justify-center overflow-y-auto bg-surface-container-lowest px-5 py-10 sm:px-10 lg:px-8 xl:px-10">
        <div className="mx-auto w-full max-w-[24rem]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <LogoMark className="h-10 w-10" />
            <Wordmark className="text-[22px]" />
          </div>

          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/75">
            {isSignUp ? "New here" : "Welcome back"}
          </p>
          <h2 className="mt-2 font-headline-lg text-[28px] leading-9 font-semibold tracking-tight text-on-surface">
            {isSignUp ? "Create your account" : "Sign in to CareFlow"}
          </h2>
          <p className="mt-2 text-[13px] leading-5 text-on-surface-variant">
            {isSignUp
              ? "A few details and your care space is ready."
              : "Pick up your conversations and appointments where you left off."}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-1 rounded-full border border-outline-variant/80 bg-surface-container-low p-1">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMsg("");
              }}
              className={cn(
                "rounded-full py-2 text-[12px] font-semibold transition-all",
                !isSignUp
                  ? "bg-surface-container-lowest text-primary shadow-soft"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setErrorMsg("");
              }}
              className={cn(
                "rounded-full py-2 text-[12px] font-semibold transition-all",
                isSignUp
                  ? "bg-surface-container-lowest text-primary shadow-soft"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              Create account
            </button>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-3.5 flex w-full items-center justify-center gap-2.5 rounded-field border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-[13px] font-semibold text-on-surface shadow-soft transition-colors hover:bg-surface-container-low disabled:opacity-50"
          >
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/70" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface-container-lowest px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-on-surface-variant/70">
                or with email
              </span>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            {errorMsg ? (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-2xl border border-error/20 bg-error-container px-3.5 py-2.5 text-[12px] text-on-error-container"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
                {errorMsg}
              </div>
            ) : null}

            {isSignUp ? (
              <Field
                id="name"
                label="Full name"
                icon={<UserRound className="h-4 w-4" aria-hidden />}
              >
                <input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full bg-transparent py-2.5 pr-3 text-[13.5px] text-on-surface outline-none placeholder:text-on-surface-variant/50"
                  placeholder="Your full name"
                />
              </Field>
            ) : null}

            <Field
              id="email"
              label="Email address"
              icon={<Mail className="h-4 w-4" aria-hidden />}
            >
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full bg-transparent py-2.5 pr-3 text-[13.5px] text-on-surface outline-none placeholder:text-on-surface-variant/50"
                placeholder="you@example.com"
              />
            </Field>

            <Field
              id="password"
              label="Password"
              icon={<Lock className="h-4 w-4" aria-hidden />}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              }
            >
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent py-2.5 pr-1 text-[13.5px] text-on-surface outline-none placeholder:text-on-surface-variant/50"
                placeholder="••••••••"
              />
            </Field>

            <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {loading ? "One moment…" : isSignUp ? "Create account" : "Sign in"}
              {loading ? null : <ArrowRight className="h-4 w-4" aria-hidden />}
            </Button>
          </form>

          <p className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-on-surface-variant/80">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" aria-hidden />
            By continuing you agree to receive care communications from CareFlow. This demo
            contains synthetic data only.
          </p>
        </div>
      </section>
    </main>
  );
}

function Field({
  id,
  label,
  icon,
  trailing,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-[11px] font-semibold text-on-surface-variant">
        {label}
      </label>
      <div className="flex items-center rounded-field border border-outline-variant bg-surface-container-lowest pl-3 shadow-soft transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
        <span className="flex-shrink-0 text-on-surface-variant/70">{icon}</span>
        {children}
        {trailing}
      </div>
    </div>
  );
}
