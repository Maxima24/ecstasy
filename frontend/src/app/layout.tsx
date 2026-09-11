import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

import { ProfileProvider } from "@/lib/profile/context";
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
  title: "Ecstacy: Adaptive Quant Prep",
  description: "Adaptive GRE and GMAT quantitative reasoning practice.",
};

/*
 * Mobile-first and responsive. Device-width keeps the smallest layout honest;
 * the CSS expands the same screen through tablet and desktop. The colour scheme
 * remains light because the product does not yet define dark tokens.
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
        <QueryProvider>
          <ProfileProvider>{children}</ProfileProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
