import { Search } from "lucide-react";

/** Forum-Suche als einfaches GET-Formular: funktioniert auch ohne JavaScript, Ergebnis-URL ist teilbar. */
export function SearchForm({ q = "", className = "" }: { q?: string; className?: string }) {
  return (
    <form action="/forum/suche" role="search" className={`flex w-full max-w-xl gap-2 ${className}`}>
      <label className="relative flex-1">
        <span className="sr-only">Forum durchsuchen</span>
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          minLength={2}
          maxLength={100}
          required
          placeholder="Forum durchsuchen, z. B. „320d Steuerkette“"
          className="h-11 w-full rounded-full border border-input bg-card pr-4 pl-11 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <button type="submit" className="h-11 shrink-0 rounded-full bg-primary px-5 font-medium text-primary-foreground">Suchen</button>
    </form>
  );
}
