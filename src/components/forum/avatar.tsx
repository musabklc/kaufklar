import { avatarUrl } from "@/lib/forum";

/** Profilbild oder, ohne Bild, der erste Buchstabe des Benutzernamens. */
export function Avatar({ name, path, size = 40 }: { name: string | null | undefined; path?: string | null; size?: number }) {
  const url = avatarUrl(path);
  const style = { width: size, height: size };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- kleines, bereits auf 256 px verkleinertes Bild aus dem eigenen Speicher
    return <img src={url} alt="" width={size} height={size} loading="lazy" style={style} className="shrink-0 rounded-full bg-muted object-cover" />;
  }
  return (
    <span aria-hidden="true" style={{ ...style, fontSize: size * 0.42 }} className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand/10 font-semibold uppercase text-brand">
      {(name ?? "?").slice(0, 1)}
    </span>
  );
}
