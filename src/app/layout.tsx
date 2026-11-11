import type { Metadata, Viewport } from "next";
import { Barlow } from "next/font/google";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { Logo } from "@/components/logo";
import "./globals.css";

// Barlow: nah an der DIN-Schrift deutscher Kennzeichen und Verkehrsschilder – eine Familie für alles.
const sans = Barlow({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Kaufklar – KI-Kaufberater für Gebrauchtwagen",
  description: "Inserat einfügen, Risiken erkennen, fair verhandeln. Unabhängige Analyse für Gebrauchtwagen in Deutschland.",
};

export const viewport: Viewport = { themeColor: "#f4f4f0", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-40 bg-background">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5 text-lg font-bold" aria-label="Kaufklar Startseite">
              <Logo />
              Kaufklar
            </Link>
            <nav className="flex items-center gap-1 text-sm text-muted-foreground">
              <Link href="/vergleich" className="px-3 py-2 font-medium text-foreground/75 hover:text-foreground">Vergleich</Link>
              <Link href="/analysen" className="px-3 py-2 font-medium text-foreground/75 hover:text-foreground">Meine Analysen</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mt-16 lg:mt-24 bg-primary text-primary-foreground">
          <div className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-6">
            <p className="text-[clamp(3.5rem,14vw,10rem)] font-bold leading-[0.85] tracking-[-0.04em]">Kaufklar</p>
            <div className="mt-10 flex flex-col gap-6 text-sm text-primary-foreground/70 sm:flex-row sm:items-end sm:justify-between">
              <p className="max-w-md">
                Unabhängige Kaufberatung für Gebrauchtwagen in Deutschland. Ersetzt keine Begutachtung durch eine Werkstatt oder Prüforganisation; Kosten sind unverbindliche Richtwerte.
              </p>
              <nav className="flex gap-6 text-primary-foreground">
                <Link href="/melden" className="hover:underline">Problem melden</Link>
                <Link href="/methodik" className="hover:underline">Methodik & Quellen</Link>
                <Link href="/datenschutz" className="hover:underline">Datenschutz</Link>
                <Link href="/impressum" className="hover:underline">Impressum</Link>
              </nav>
            </div>
          </div>
        </footer>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
