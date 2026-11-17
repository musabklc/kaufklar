import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/site";
import { Host_Grotesk } from "next/font/google";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { Logo } from "@/components/logo";
import "./globals.css";

// Host Grotesk: ruhig und präzise, eine Familie für alles.
const sans = Host_Grotesk({ variable: "--font-sans", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Tachoklar – KI-Kaufberater für Gebrauchtwagen",
  description: "Inserat einfügen, Risiken erkennen, fair verhandeln. Unabhängige Analyse für Gebrauchtwagen in Deutschland.",
};

export const viewport: Viewport = { themeColor: "#eef0f3", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-40 bg-background">
          <div className="mx-auto flex h-16 max-w-[78rem] items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex min-h-11 items-center gap-2.5 text-lg font-bold" aria-label="Tachoklar Startseite">
              <Logo />
              Tachoklar
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/forum" className="inline-flex min-h-11 items-center px-3 font-medium text-foreground/75 transition-colors hover:text-foreground">Forum</Link>
              <Link href="/vergleich" className="hidden min-h-11 items-center px-3 font-medium text-foreground/75 transition-colors hover:text-foreground sm:inline-flex">Vergleich</Link>
              <Link href="/analysen" className="inline-flex min-h-11 items-center px-3 font-medium text-foreground/75 transition-colors hover:text-foreground"><span className="sm:hidden">Analysen</span><span className="hidden sm:inline">Meine Analysen</span></Link>
              <Link href="/#pruefen" className="ml-1 inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-primary px-4 font-medium text-primary-foreground transition-[background-color,transform] hover:bg-[color-mix(in_oklch,var(--primary),black_14%)] active:translate-y-px">Inserat prüfen</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mt-16 lg:mt-24 bg-foreground text-background">
          <div className="mx-auto max-w-[78rem] px-4 pb-10 pt-16 sm:px-6">
            <p className="text-[clamp(3.5rem,14vw,10rem)] font-bold leading-[0.85] tracking-[-0.04em]">Tachoklar</p>
            <div className="mt-10 flex flex-col gap-6 text-sm text-background/70 sm:flex-row sm:items-end sm:justify-between">
              <p className="max-w-md">
                Unabhängige Kaufberatung für Gebrauchtwagen in Deutschland. Ersetzt keine Begutachtung durch eine Werkstatt oder Prüforganisation; Kosten sind unverbindliche Richtwerte.
              </p>
              <nav className="flex flex-wrap gap-6 text-background">
                <Link href="/melden" className="hover:underline">Problem melden</Link>
                <Link href="/methodik" className="hover:underline">Methodik & Quellen</Link>
                <Link href="/datenschutz" className="hover:underline">Datenschutz</Link>
                <Link href="/impressum" className="hover:underline">Impressum</Link>
              </nav>
            </div>
            <p className="mt-10 text-xs text-background/50">
              Fotos: Trop86 (CC0), Kickaffe/Mario von Berg (CC BY-SA 4.0), Charles from Port Chester (CC0) – Wikimedia Commons.
            </p>
          </div>
        </footer>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
