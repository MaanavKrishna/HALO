import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist_Mono, Inter } from "next/font/google";
import { Footer } from "@/components/ui/Footer";
import { Navbar } from "@/components/ui/Navbar";
import { THEME_INIT_SCRIPT } from "@/components/ui/theme";
import "./globals.css";

// Self-hosted at build time by next/font: no external font requests at runtime.
// Display: Bricolage Grotesque (optical size + width axes) for headlines.
const display = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  display: "swap",
});

// UI and body: Inter with optical sizing.
const ui = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

// Data and telemetry: Geist Mono (tabular by construction).
const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HALO",
  description:
    "Habitat Assessment from Low-gravity Observations: a cited fire brief from NASA microgravity combustion data.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#05080f" },
    { media: "(prefers-color-scheme: light)", color: "#f3f5f8" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${ui.variable} ${mono.variable}`}>
      <head>
        {/* Applies a stored theme before first paint (static string, allowed by the CSP's 'unsafe-inline'). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col bg-canvas text-fg">
        <a
          href="#main"
          className="no-print sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[var(--z-overlay)] focus:rounded-[var(--radius-sm)] focus:bg-surface-1 focus:px-3 focus:py-2 focus:shadow-[var(--elev-3)]"
        >
          Skip to content
        </a>
        <Navbar />
        <div id="main" className="flex flex-1 flex-col">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
