import { ReportForm } from "@/components/community/report-form";

export const metadata = { title: "Problem melden – Kaufklar" };

export default function MeldenPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-bold leading-[0.95] sm:text-5xl">Welches Problem hatte dein Auto?</h1>
      <p className="mt-6 max-w-2xl text-lg">
        Deine Erfahrung hilft dem nächsten Käufer. Jede Meldung wird geprüft, anonym gespeichert und erst in Analysen gezeigt, wenn mehrere Personen dasselbe Problem unabhängig gemeldet haben.
      </p>
      <div className="mt-10 bg-card p-5 sm:p-8">
        <ReportForm />
      </div>
    </div>
  );
}
