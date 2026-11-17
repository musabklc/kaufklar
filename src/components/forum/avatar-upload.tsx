"use client";

import { startTransition, useActionState } from "react";
import { Loader2 } from "lucide-react";

type State = { ok?: boolean; message?: string };

/** Quadratisch zuschneiden, auf 256 px verkleinern; WebP wenn der Browser es kann, sonst JPEG. Entfernt nebenbei EXIF-Daten (z. B. GPS). */
async function toSquare(file: File): Promise<Blob | null> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  canvas.getContext("2d")!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 256, 256);
  const as = (type: string) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.85));
  const webp = await as("image/webp");
  return webp?.type === "image/webp" ? webp : as("image/jpeg");
}

export function AvatarUpload({ action }: { action: (s: State, f: FormData) => Promise<State> }) {
  const [state, run, pending] = useActionState(action, {});

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const blob = await toSquare(file).catch(() => null);
    const f = new FormData();
    if (blob) f.set("avatar", new File([blob], blob.type === "image/webp" ? "avatar.webp" : "avatar.jpg", { type: blob.type }));
    startTransition(() => run(f));
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onChange} className="sr-only" id="avatar-file" />
      <label
        htmlFor="avatar-file"
        className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-input bg-card px-5 font-medium hover:bg-muted"
      >
        {pending && <Loader2 className="size-4 animate-spin" />} Bild auswählen
      </label>
      {state.message && (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-ok" : "text-bad"}>
          {state.message}
        </p>
      )}
    </div>
  );
}
