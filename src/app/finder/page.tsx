import { FinderForm } from "./finder-form";

export const metadata = {
  title: "Auto-Finder: Welches Auto passt zu mir? – Tachoklar",
  description: "Budget, Fahrprofil und Wünsche eingeben: passende Gebrauchtwagen mit zuverlässigen Motoren, typischen Schwachstellen und echten Marktpreisen.",
};

export default function FinderPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-16">
      <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">Welches Auto passt zu mir?</h1>
      <p className="mt-4 max-w-2xl text-lg">
        Sag uns Budget und wie du fährst. Du bekommst passende Modelle mit dem richtigen Motor, worauf du achten musst und was sie gerade kosten.
      </p>
      <FinderForm />
    </div>
  );
}
