"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BookOpenCheck, CalendarCheck2, Lock, Sparkles, Stethoscope } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

export function LoginScene({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  const float = (delay = 0, distance = 12, duration = 7) =>
    reduce
      ? {}
      : {
          y: [0, -distance, 0],
          transition: { duration, repeat: Infinity, ease: "easeInOut" as const, delay },
        };

  return (
    <div className={className}>
      <div className="relative mx-auto aspect-square w-full max-w-[34rem]">
        {/* Ambient glow */}
        <div
          className="absolute inset-6 rounded-full bg-[radial-gradient(circle_at_35%_30%,#dce9df_0%,rgba(220,233,223,0)_62%)]"
          aria-hidden
        />
        <div
          className="absolute inset-10 rounded-full bg-[radial-gradient(circle_at_70%_75%,#f6dfd3_0%,rgba(246,223,211,0)_58%)]"
          aria-hidden
        />
        <div
          className="absolute inset-16 rounded-full bg-[radial-gradient(circle_at_50%_50%,#f4e5c2_0%,rgba(244,229,194,0)_60%)]"
          aria-hidden
        />

        <svg viewBox="0 0 560 560" className="absolute inset-0 h-full w-full" fill="none" aria-hidden>
          <defs>
            <linearGradient id="login-vine" x1="120" y1="470" x2="450" y2="70" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3F6350" stopOpacity="0.18" />
              <stop offset="0.55" stopColor="#3F6350" stopOpacity="0.5" />
              <stop offset="1" stopColor="#9C4F36" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          <motion.circle
            cx="280"
            cy="280"
            r="218"
            stroke="#3F6350"
            strokeOpacity="0.12"
            strokeDasharray="2 12"
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
            style={{ originX: "280px", originY: "280px" }}
          />
          <circle cx="280" cy="280" r="168" stroke="#3F6350" strokeOpacity="0.1" />
          <circle cx="280" cy="280" r="112" stroke="#3F6350" strokeOpacity="0.12" />

          <motion.path
            d="M118 466C174 396 212 330 292 262c56-48 92-104 150-186"
            stroke="url(#login-vine)"
            strokeWidth="2.2"
            strokeLinecap="round"
            initial={reduce ? undefined : { pathLength: 0 }}
            animate={reduce ? undefined : { pathLength: 1 }}
            transition={{ duration: 2.4, ease }}
          />

          <motion.g animate={float(0.4, 9, 9)}>
            <path d="M196 360c-30-3-48-19-52-48 30-2 50 16 52 48Z" fill="#B9CFBE" />
            <path d="M214 332c2-28 18-45 44-49 2 28-14 47-44 49Z" fill="#C7DCCB" />
          </motion.g>
          <motion.g animate={float(1.2, 11, 8)}>
            <path d="M352 196c26-2 42-16 46-41-26-2-44 14-46 41Z" fill="#E3CC97" />
            <path d="M380 214c-2-22 10-36 30-40 2 22-10 36-30 40Z" fill="#F0E0B8" />
          </motion.g>
          <motion.g animate={float(0.8, 8, 10)}>
            <path d="M392 376c-24 6-38 20-40 44 24 2 38-14 40-44Z" fill="#E7BEA9" />
          </motion.g>

          <motion.circle
            cx="126"
            cy="188"
            r="5"
            fill="#9C4F36"
            animate={reduce ? undefined : { opacity: [0.25, 0.7, 0.25], scale: [1, 1.15, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle
            cx="446"
            cy="300"
            r="4"
            fill="#3F6350"
            animate={reduce ? undefined : { opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <motion.circle
            cx="322"
            cy="98"
            r="3.5"
            fill="#8A6414"
            animate={reduce ? undefined : { opacity: [0.3, 0.75, 0.3] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
          />
        </svg>

        {/* Appointment card */}
        <motion.div
          initial={reduce ? undefined : { opacity: 0, y: 26, rotate: -4 }}
          animate={reduce ? undefined : { opacity: 1, y: 0, rotate: -4 }}
          transition={{ duration: 0.9, ease, delay: 0.15 }}
          className="absolute left-[8%] top-[24%] w-[62%] max-w-[19rem]"
        >
          <motion.div
            animate={float(0, 10, 8)}
            className="rounded-[1.5rem] border border-[#d8cbb4]/80 bg-[#fffdf8] p-4 shadow-[0_28px_60px_-32px_rgba(63,99,80,0.55)] sm:p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#8a8069]">
                Next visit
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#dce9df] px-2 py-0.5 text-[9px] font-semibold text-[#1e3a2a]">
                <span className="h-1 w-1 rounded-full bg-[#3f6350]" aria-hidden />
                Confirmed
              </span>
            </div>
            <div className="mt-2.5 flex items-end gap-2.5">
              <span className="font-display text-[2.6rem] leading-[0.85] font-semibold tracking-tight text-[#233b2d] sm:text-[3rem]">
                20
              </span>
              <span className="pb-0.5 text-[10px] leading-4 text-[#8a8069]">
                Friday
                <br />
                November
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] font-medium text-[#4c473d]">
              <Stethoscope className="h-3.5 w-3.5 text-[#3f6350]" aria-hidden />
              9:30 AM · Dr. Sarah Chen
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[#efe6d8]">
              <motion.span
                className="block h-full rounded-full bg-[#3f6350]"
                initial={{ width: "24%" }}
                animate={reduce ? undefined : { width: ["24%", "72%", "24%"] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Verified source chip */}
        <motion.div
          initial={reduce ? undefined : { opacity: 0, y: -18, rotate: 3 }}
          animate={reduce ? undefined : { opacity: 1, y: 0, rotate: 3 }}
          transition={{ duration: 0.9, ease, delay: 0.35 }}
          className="absolute right-[4%] top-[13%] w-[48%] max-w-[14rem]"
        >
          <motion.div
            animate={float(0.8, 9, 9)}
            className="flex items-center gap-2.5 rounded-2xl border border-[#e2d7c6] bg-[#fffdf8]/95 px-3 py-2.5 shadow-[0_18px_40px_-26px_rgba(63,99,80,0.5)] backdrop-blur"
          >
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#dce9df] text-[#3f6350]">
              <BookOpenCheck className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-[#2c2a25]">Verified answer</p>
              <p className="truncate text-[9px] text-[#8a8069]">From clinic sources</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Chat bubble */}
        <motion.div
          initial={reduce ? undefined : { opacity: 0, y: 20 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.5 }}
          className="absolute bottom-[19%] right-[6%] w-[46%] max-w-[13.5rem]"
        >
          <motion.div
            animate={float(0.4, 12, 7.5)}
            className="rounded-2xl rounded-br-md bg-[#3f6350] px-3.5 py-3 text-[#fffdf8] shadow-[0_22px_44px_-24px_rgba(63,99,80,0.65)]"
          >
            <p className="text-[10px] leading-4 opacity-90">
              I can move that to Friday morning — shall I hold 9:30?
            </p>
            <div className="mt-2 flex items-center gap-1">
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  className="h-1.5 w-1.5 rounded-full bg-[#dce9df]"
                  animate={reduce ? undefined : { opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: dot * 0.16,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Private chip */}
        <motion.div
          initial={reduce ? undefined : { opacity: 0, y: 18, rotate: -2 }}
          animate={reduce ? undefined : { opacity: 1, y: 0, rotate: -2 }}
          transition={{ duration: 0.9, ease, delay: 0.65 }}
          className="absolute bottom-[7%] left-[13%] w-[48%] max-w-[14rem]"
        >
          <motion.div
            animate={float(1.2, 8, 8.5)}
            className="flex items-center gap-2.5 rounded-2xl border border-[#e2d7c6] bg-[#fffdf8]/95 px-3 py-2.5 shadow-[0_18px_40px_-26px_rgba(63,99,80,0.5)] backdrop-blur"
          >
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#f6dfd3] text-[#9c4f36]">
              <Lock className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-[#2c2a25]">Private to you</p>
              <p className="truncate text-[9px] text-[#8a8069]">Your account only</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Floating sparkles */}
        <motion.span
          className="absolute left-[52%] top-[8%] text-[#8a6414]"
          animate={reduce ? undefined : { opacity: [0.3, 0.9, 0.3], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          <Sparkles className="h-4 w-4" />
        </motion.span>
        <motion.span
          className="absolute bottom-[40%] left-[2%] text-[#9c4f36]"
          animate={reduce ? undefined : { opacity: [0.25, 0.7, 0.25], rotate: [0, 12, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          <CalendarCheck2 className="h-3.5 w-3.5" />
        </motion.span>
      </div>
    </div>
  );
}
