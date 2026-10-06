import { ImageResponse } from 'next/og'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0b6e4f' }}>
        <svg width="180" height="180" viewBox="0 0 64 64">
          <path d="M12 46 L26 32 L35 39 L50 20" fill="none" stroke="#ecfdf5" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="50" cy="20" r="5" fill="#34d399" stroke="#ecfdf5" strokeWidth="2" />
        </svg>
      </div>
    ),
    size,
  )
}
