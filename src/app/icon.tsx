import { ImageResponse } from 'next/og'
export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'
export default function Icon() {
  return new ImageResponse(
    <div style={{
      width: 32, height: 32, borderRadius: 8,
      background: 'linear-gradient(135deg, #047857, #059669)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Ascending bar chart — wealth/growth */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="14" width="4" height="7" rx="1" fill="white" opacity="0.6"/>
        <rect x="10" y="9" width="4" height="12" rx="1" fill="white" opacity="0.8"/>
        <rect x="17" y="3" width="4" height="18" rx="1" fill="white"/>
      </svg>
    </div>
  )
}
