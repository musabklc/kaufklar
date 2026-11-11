/** Bildmarke: ein Kennzeichen-Ausschnitt – blauer EU-Streifen, daneben ein Haken in Kennzeichen-Schwarz. */
export function Logo({ className = "h-7 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 28" className={className} aria-hidden="true">
      <rect x="0.75" y="0.75" width="38.5" height="26.5" rx="2.5" fill="#fff" stroke="#131417" strokeWidth="1.5" />
      <rect x="2.5" y="2.5" width="8" height="23" rx="1" fill="#0b3c9e" />
      <path d="m17 14.5 4.2 4.2L33 7.5" fill="none" stroke="#131417" strokeWidth="3.2" strokeLinecap="square" />
    </svg>
  );
}
