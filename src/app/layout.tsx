import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CareFlow | Care that feels personal",
    template: "%s · CareFlow",
  },
  description:
    "CareFlow is a warm, AI-assisted patient portal for booking appointments, asking clinic questions, and keeping your care in one calm place.",
  keywords: ["Healthcare", "AI Receptionist", "Patient Portal", "Medical Booking"],
  applicationName: "CareFlow",
  openGraph: {
    title: "CareFlow | Care that feels personal",
    description:
      "Book visits, ask clinic questions, and keep your care in one calm place.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf7f0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh bg-background font-sans text-on-surface antialiased">
        {children}
      </body>
    </html>
  );
}
