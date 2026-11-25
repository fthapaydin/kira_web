interface MiniProgressRingProps {
  percent: number;
  color: string;
}

/** Compact SVG progress donut used on tenant and building selector cards. */
export function MiniProgressRing({ percent, color }: MiniProgressRingProps) {
  const radius = 17.5;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth="3"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span
        className="absolute text-[8.5px] sm:text-[9.5px] font-mono font-bold tracking-tight"
        style={{ color }}
      >
        %{clamped}
      </span>
    </div>
  );
}
