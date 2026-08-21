import type { Metadata, Viewport } from "next";
import { Geist_Mono, Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RecallAI — your second brain",
  description:
    "RecallAI is an AI-powered personal memory system for capturing, organizing, and connecting all your important information.",
  openGraph: {
    title: "RecallAI — your second brain",
    description:
      "An AI-powered personal memory system for everything you don't want to forget.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "RecallAI — your second brain",
    description:
      "An AI-powered personal memory system for everything you don't want to forget.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximum-scale: pinch zoom stays available.
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        "font-sans",
        plusJakartaSans.variable,
        instrumentSerif.variable,
        geistMono.variable,
      )}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
