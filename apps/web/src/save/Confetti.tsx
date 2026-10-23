import type { CSSProperties } from "react";

// The handoff's burst: 14 particles in lime, ink, amber, violet and cyan.
const COLORS = ["var(--primary)", "var(--foreground)", "oklch(0.82 0.15 75)", "oklch(0.75 0.13 300)", "oklch(0.78 0.12 200)"];
const COUNT = 14;

type Particle = { style: CSSProperties; className: string };

function particles(spread: number): Particle[] {
  return Array.from({ length: COUNT }, (_, i) => {
    const angle = (i / COUNT) * Math.PI * 2 + (i % 4) * 0.12;
    const distance = spread + ((i * 7) % 10) * spread * 0.07;
    return {
      className: i % 2 ? "rounded-full" : "rounded-[2px]",
      style: {
        width: i % 3 ? 6 : 8,
        height: i % 3 ? 6 : 3,
        background: COLORS[i % COLORS.length],
        animationDuration: `${String(0.6 + (i % 4) * 0.1)}s`,
        "--dx": `${String(Math.cos(angle) * distance)}px`,
        "--dy": `${String(Math.sin(angle) * distance - 6)}px`,
        "--r": `${String((i * 97) % 540)}deg`,
      } as CSSProperties,
    };
  });
}

// Hidden under reduced motion: with zero-length animations the particles would only flash.
export function Confetti({ spread = 34 }: { spread?: number }) {
  return (
    <span aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 size-0 motion-reduce:hidden">
      {particles(spread).map((particle, i) => (
        <span key={i} className={`absolute -top-[3px] -left-[3px] animate-burst ${particle.className}`} style={particle.style} />
      ))}
    </span>
  );
}
