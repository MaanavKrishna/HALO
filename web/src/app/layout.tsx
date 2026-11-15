import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Footer } from "@/components/ui/Footer";
import { Navbar } from "@/components/ui/Navbar";
import { THEME_INIT_SCRIPT } from "@/components/ui/theme";
import { SITE_DESCRIPTION, SITE_EXPANSION, SITE_NAME, SITE_URL, TAGLINE, THEME_DARK, THEME_LIGHT } from "@/lib/site";
import "./globals.css";

// Self-hosted at build time by next/font: no external font requests at runtime.
// Display, UI and body: one Inter variable file with its optical-size axis,
// so headlines get the tight display cut and body text the text cut.
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
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: ${SITE_EXPANSION}`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Maanav Krishna" }],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: `${SITE_NAME}: ${SITE_EXPANSION}`,
    description: TAGLINE,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: `${SITE_NAME}: ${SITE_EXPANSION}`, description: TAGLINE },
  appleWebApp: { title: SITE_NAME, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: THEME_DARK },
    { media: "(prefers-color-scheme: light)", color: THEME_LIGHT },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${ui.variable} ${mono.variable}`}>
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
