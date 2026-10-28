import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { RealtimeProvider } from "@/components/realtime-provider";
import { SiteHeader } from "@/components/site-header";
import { MatchNotifier } from "@/components/match-notifier";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Sportz — Live scores & commentary",
    template: "%s · Sportz",
  },
  description: "Real-time match centre with live scores and play-by-play commentary.",
};

export const viewport: Viewport = {
  themeColor: "#06080c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <RealtimeProvider>
          <SiteHeader />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
            {children}
          </main>
          <footer className="border-t border-line">
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-6 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <span>Sportz · Real-time sports engine</span>
              <span>Scores and commentary update live over WebSocket.</span>
            </div>
          </footer>
          <MatchNotifier />
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "var(--surface-2)",
                border: "1px solid var(--line-strong)",
                color: "var(--fg)",
              },
            }}
          />
        </RealtimeProvider>
      </body>
    </html>
  );
}
