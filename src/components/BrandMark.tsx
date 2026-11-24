import { Link } from 'react-router-dom';

interface BrandMarkProps {
  inverted?: boolean;
  to?: string;
}

export function BrandMark({ inverted = false, to = '/' }: BrandMarkProps) {
  const content = (
    <span className="inline-flex items-center gap-2.5 select-none">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="24" height="24" rx="7" fill="#1DA1F2" />
        <path
          d="M7 16V10.2L12 6.8L17 10.2V16"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="10"
          y1="13.5"
          x2="14"
          y2="13.5"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      <span
        className={`text-[16px] font-bold tracking-[-0.02em] ${
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
