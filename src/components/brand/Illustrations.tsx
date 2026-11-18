import { cn } from "@/lib/cn";

/* Hand-drawn-feeling, warm line illustrations built from the palette. */

export function LeafSprig({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden
      fill="none"
      className={cn("h-24 w-24", className)}
    >
      <path
        d="M28 96C44 74 58 52 86 26"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M50 72c-13-1-21-8-23-21 13-1 22 6 23 21Z"
        fill="#B9CFBE"
        opacity="0.9"
      />
      <path
        d="M66 54c1-13 8-21 21-23 1 13-6 22-21 23Z"
        fill="#E3CC97"
        opacity="0.9"
      />
      <path
        d="M40 86c-10 0-17-5-20-15 10-1 18 4 20 15Z"
        fill="#E7BEA9"
        opacity="0.9"
      />
      <circle cx="88" cy="22" r="3" fill="#9C4F36" opacity="0.55" />
      <circle cx="24" cy="40" r="2" fill="#3F6350" opacity="0.4" />
    </svg>
  );
}

export function CompanionIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 200"
      aria-hidden
      fill="none"
      className={cn("h-44 w-56", className)}
    >
      <ellipse cx="130" cy="174" rx="78" ry="12" fill="#EBE1D0" opacity="0.8" />
      <circle cx="130" cy="96" r="58" fill="#DCE9DF" />
      <circle cx="130" cy="96" r="58" stroke="#3F6350" strokeOpacity="0.18" strokeWidth="1.5" />
      <rect
        x="86"
        y="70"
        width="88"
        height="58"
        rx="26"
        fill="#FFFDF9"
        stroke="#3F6350"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
      <path
        d="M110 98h.02M150 98h.02"
        stroke="#3F6350"
        strokeWidth="4.4"
        strokeLinecap="round"
      />
      <path
        d="M118 112c4 4.6 20 4.6 24 0"
        stroke="#9C4F36"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M120 57c-1-12 8-20 20-20-1 12-8 19-20 20Z"
        fill="#B9CFBE"
      />
      <path
        d="M168 43c8-1 13 3 15 10-8 2-13-2-15-10Z"
        fill="#E3CC97"
      />
      <path
        d="M50 118c8-10 18-13 30-9"
        stroke="#9C4F36"
        strokeOpacity="0.45"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M190 134c10 2 17 8 20 18"
        stroke="#3F6350"
        strokeOpacity="0.35"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="202" cy="62" r="3.4" fill="#9C4F36" opacity="0.45" />
      <circle cx="58" cy="146" r="2.8" fill="#3F6350" opacity="0.4" />
    </svg>
  );
}

export function CalendarIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 160"
      aria-hidden
      fill="none"
      className={cn("h-36 w-40", className)}
    >
      <rect
        x="34"
        y="34"
        width="112"
        height="104"
        rx="22"
        fill="#FFFDF9"
        stroke="#3F6350"
        strokeOpacity="0.28"
        strokeWidth="1.6"
      />
      <path d="M34 62h112" stroke="#3F6350" strokeOpacity="0.22" strokeWidth="1.6" />
      <path
        d="M66 26v18M114 26v18"
        stroke="#3F6350"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <rect x="56" y="78" width="26" height="20" rx="7" fill="#DCE9DF" />
      <rect x="92" y="78" width="26" height="20" rx="7" fill="#F6DFD3" />
      <rect x="56" y="106" width="26" height="16" rx="7" fill="#F4E5C2" />
      <path
        d="M132 30c8-1 13 3 15 10-8 2-13-2-15-10Z"
        fill="#B9CFBE"
      />
      <path
        d="M26 116c-8 2-13 7-15 15 8 1 13-4 15-15Z"
        fill="#E7BEA9"
      />
      <circle cx="152" cy="132" r="3" fill="#9C4F36" opacity="0.45" />
    </svg>
  );
}

export function FolderIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 160"
      aria-hidden
      fill="none"
      className={cn("h-36 w-40", className)}
    >
      <path
        d="M28 56c0-10 6-16 16-16h28l12 14h52c10 0 16 6 16 16v52c0 10-6 16-16 16H44c-10 0-16-6-16-16V56Z"
        fill="#FFFDF9"
        stroke="#3F6350"
        strokeOpacity="0.28"
        strokeWidth="1.6"
      />
      <path d="M28 74h124" stroke="#3F6350" strokeOpacity="0.2" strokeWidth="1.6" />
      <rect x="54" y="92" width="52" height="8" rx="4" fill="#DCE9DF" />
      <rect x="54" y="108" width="34" height="8" rx="4" fill="#F6DFD3" />
      <path
        d="M132 54c9-1 15 4 17 12-9 2-15-3-17-12Z"
        fill="#E3CC97"
      />
      <path
        d="M36 32c-7 3-11 8-12 16 8 0 12-5 12-16Z"
        fill="#E7BEA9"
      />
      <circle cx="150" cy="128" r="3" fill="#3F6350" opacity="0.35" />
    </svg>
  );
}

export function LoginBloom({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 420"
      aria-hidden
      fill="none"
      className={cn("h-full w-full", className)}
    >
      <circle cx="210" cy="210" r="176" stroke="#FFFDF8" strokeOpacity="0.16" strokeWidth="1.4" />
      <circle cx="210" cy="210" r="132" stroke="#FFFDF8" strokeOpacity="0.12" strokeWidth="1.4" />
      <circle cx="210" cy="210" r="88" stroke="#FFFDF8" strokeOpacity="0.18" strokeWidth="1.4" />
      <path
        d="M130 300C168 246 208 196 300 120"
        stroke="#E3CC97"
        strokeOpacity="0.7"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M196 234c-28-2-46-18-50-45 28-3 48 14 50 45Z"
        fill="#B9CFBE"
        opacity="0.85"
      />
      <path
        d="M232 194c2-28 18-45 45-49 3 28-14 47-45 49Z"
        fill="#E3CC97"
        opacity="0.9"
      />
      <path
        d="M164 274c-22 0-37-10-44-31 22-3 39 8 44 31Z"
        fill="#E7BEA9"
        opacity="0.9"
      />
      <circle cx="318" cy="146" r="4" fill="#E7BEA9" opacity="0.7" />
      <circle cx="112" cy="186" r="3" fill="#E3CC97" opacity="0.6" />
      <circle cx="292" cy="322" r="3" fill="#B9CFBE" opacity="0.7" />
    </svg>
  );
}
