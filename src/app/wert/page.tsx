import { WertForm } from "./wert-form";

export const metadata = {
  alternates: { canonical: "/wert" },
  title: "Was ist mein Auto wert? – Tachoklar",
  description: "Kostenlose Auto-Bewertung aus echten, geprüften Angeboten: realistischer Privatverkaufspreis und was ein Händler zahlt.",
};

export default function WertPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-16">
      <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">Was ist mein Auto wert?</h1>
      <p className="mt-4 max-w-2xl text-lg">
        Wir suchen live nach vergleichbaren Autos und lesen die Preise direkt in den Inseraten ab. Du siehst, was du privat realistisch bekommst und was ein Händler zahlt.
      </p>
      <WertForm />
    </div>
  );
}
