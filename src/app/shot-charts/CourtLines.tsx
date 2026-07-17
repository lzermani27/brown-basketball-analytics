export function CourtLines() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 50 50"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="49" height="49" fill="none" stroke="#4e3629" strokeWidth="0.35" />
      <rect x="22" y="0" width="6" height="2.2" fill="none" stroke="#4e3629" strokeWidth="0.35" />
      <circle cx="25" cy="5.25" r="1.7" fill="none" stroke="#4e3629" strokeWidth="0.35" />
      <rect x="19" y="0" width="12" height="19" fill="none" stroke="#4e3629" strokeWidth="0.35" />
      <line x1="19" y1="19" x2="31" y2="19" stroke="#4e3629" strokeWidth="0.35" />
      <path d="M19 19 A6 6 0 0 0 31 19" fill="none" stroke="#4e3629" strokeWidth="0.35" />
      <path d="M3 0 L3 4 A22 22 0 0 0 47 4 L47 0" fill="none" stroke="#4e3629" strokeWidth="0.45" />
    </svg>
  );
}
