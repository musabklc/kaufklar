"use client";

import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { askDraft } from "@/lib/forum-board";
import type { AnalysisResult } from "@/lib/types";

/** Öffnet das passende Unterforum mit einem vorausgefüllten Thema zu diesem Auto. */
export function AskCommunity({ r }: { r: AnalysisResult }) {
  const d = askDraft(r);
  const href = `/forum/${d.board}?${new URLSearchParams({ titel: d.title, text: d.body })}#neu`;
  return (
    <Link href={href} className="no-print inline-flex min-h-11 items-center gap-2 rounded-full border border-input bg-card px-4 text-sm font-medium hover:bg-muted">
      <MessagesSquare className="size-4" /> Community fragen
    </Link>
  );
}
