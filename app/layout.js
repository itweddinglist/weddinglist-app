import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import AppShell from "./components/AppShell";
import CookieConsent from "./components/CookieConsent";
import { PostHogProvider } from "./lib/posthog/provider";
import { Suspense } from "react";
import { PostHogPageView } from "./lib/posthog/pageview";

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
});
const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata = {
  title: "WeddingList",
  description: "Platforma premium de planificare nunta",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body
        className={`${cormorant.variable} ${dmSans.variable}`}
        suppressHydrationWarning
      >
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          <AppShell>{children}</AppShell>
          <CookieConsent />
        </PostHogProvider>
      </body>
    </html>
  );
}
