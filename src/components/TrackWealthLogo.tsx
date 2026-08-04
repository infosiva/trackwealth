'use client'

/**
 * TrackWealth logo mark — ascending bar/line glyph that draws itself in on mount
 * (stroke-dashoffset animation), matching the app/icon.tsx favicon shape+accent.
 */
export default function TrackWealthLogo({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="tw-logo-mark"
    >
      <rect x="1" y="1" width="22" height="22" rx="6" fill="url(#tw-logo-grad)" />
      <path
        className="tw-logo-line"
        d="M5 15.5L9.5 10.5L13 13.5L19 6.5"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle className="tw-logo-dot" cx="19" cy="6.5" r="1.6" fill="#fff" />
      <defs>
        <linearGradient id="tw-logo-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#047857" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
      <style>{`
        .tw-logo-line {
          stroke-dasharray: 20;
          stroke-dashoffset: 20;
          animation: tw-logo-draw 0.7s cubic-bezier(0.23,1,0.32,1) 0.15s forwards;
        }
        .tw-logo-dot {
          opacity: 0;
          animation: tw-logo-pop 0.3s cubic-bezier(0.23,1,0.32,1) 0.75s forwards;
        }
        @keyframes tw-logo-draw { to { stroke-dashoffset: 0; } }
        @keyframes tw-logo-pop { from { opacity: 0; transform: scale(0.5); transform-origin: 19px 6.5px; } to { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .tw-logo-line { animation: none; stroke-dashoffset: 0; }
          .tw-logo-dot { animation: none; opacity: 1; }
        }
      `}</style>
    </svg>
  )
}
