import { Suspense } from "react";
import { InspectionMode } from "./inspection-mode";

export const metadata = { title: "Besichtigung – Tachoklar", robots: { index: false } };

async function View({ params }: { params: Promise<{ id: string }> }) {
  return <InspectionMode id={(await params).id} />;
}

export default function BesichtigungPage({ params }: PageProps<"/analyse/[id]/besichtigung">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-20 text-sm text-muted-foreground">Lade …</div>}>
      <View params={params} />
    </Suspense>
  );
}
