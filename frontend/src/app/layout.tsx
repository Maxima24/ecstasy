import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

import { QueryProvider } from "@/lib/query/provider";
import "./globals.css";

/*
 * next/font self-hosts at build time, subsets to Latin, and generates a
 * size-adjust fallback automatically — which is most of the CLS budget handled
 * without hand-written @font-face metrics.
 *
 * Budget: <= 100 KB across 2-4 files (FRONTEND_PLAN.md §16). Adding a weight
 * costs a file; check the build output before you do.
 */
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ecstacy",
  description: "Adaptive GRE and GMAT quantitative reasoning practice.",
};

/*
 * Mobile only. PRD §1 puts desktop layout and dark mode out of scope, so the
 * viewport is locked and the colour scheme is declared light — a browser must
 * not apply its own dark treatment to a product that has no dark tokens.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      {/*
        `data-profile` carries the whole design system: accent, type settings and
        density all resolve from it. The profile provider rewrites this attribute
        on flip — components never read the profile themselves.

        `rusty` is the documented default for a first-time render.
      */}
      <body data-profile="rusty" className="min-h-full flex flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
