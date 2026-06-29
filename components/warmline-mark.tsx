export function WarmlineMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Warmline">
      <defs>
        <linearGradient id="warmline-mark" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f6e3ad" />
          <stop offset="1" stopColor="#e2b766" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#warmline-mark)" />
      <g fill="none" stroke="#2a231a" strokeWidth="5.5" strokeLinecap="round">
        <path d="M21.7 38.2 A11 11 0 0 1 42.3 38.2" />
        <path d="M15.5 32.5 A19 19 0 0 1 48.5 32.5" />
      </g>
      <circle cx="32" cy="42" r="5" fill="#2a231a" />
    </svg>
  );
}
