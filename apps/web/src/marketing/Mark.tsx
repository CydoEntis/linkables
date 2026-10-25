// The flat mark: a lime square behind a white one. Matches public/favicon.svg.
export function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect x="12.5" y="3.5" width="16" height="16" rx="4.5" fill="oklch(0.89 0.19 125)" transform="rotate(7 20.5 11.5)" />
      <rect x="3.5" y="10" width="17.5" height="17.5" rx="5" fill="#ecebe8" />
    </svg>
  );
}

export function MarkWordmark({ size = 26, textClass = "text-[18px]" }: { size?: number; textClass?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <Mark size={size} />
      <span className={`font-display font-semibold tracking-[-0.03em] ${textClass}`}>linkables</span>
    </span>
  );
}
