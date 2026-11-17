import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalysisView } from "@/components/analysis/analysis-view";

// Persönliche Analysen nie in Suchmaschinen
export const metadata: Metadata = { title: "Analyse – Tachoklar", robots: { index: false, follow: false } };

const Loading = () => <div className="mx-auto max-w-[78rem] px-4 py-20 text-sm text-muted-foreground">Lade Analyse …</div>;

async function View({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AnalysisView id={id} />;
}

export default function AnalysePage({ params }: PageProps<"/analyse/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <View params={params} />
    </Suspense>
  );
}
