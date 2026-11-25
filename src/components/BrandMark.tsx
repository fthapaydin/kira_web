import { Link } from 'react-router-dom';

interface BrandMarkProps {
  inverted?: boolean;
  to?: string;
}

export function BrandMark({ inverted = false, to = '/' }: BrandMarkProps) {
  const content = (
    <span className="inline-flex items-center gap-2.5 select-none">
      <img
        src="/app-logo.png"
        alt="Kira Takip Logo"
        width={28}
        height={28}
        className="w-7 h-7 rounded-lg object-cover shrink-0 shadow-[0_3px_12px_-4px_rgba(29,161,242,0.55)] ring-1 ring-white/15"
      />
      <span
        className={`text-[16px] font-bold tracking-[-0.02em] whitespace-nowrap ${
          inverted ? 'text-[#E8E8E8]' : 'text-ink'
        }`}
      >
        Kira Takip
      </span>
    </span>
  );

  if (!to) return content;
  return (
    <Link to={to} className="inline-flex items-center focus:outline-none">
      {content}
    </Link>
  );
}
