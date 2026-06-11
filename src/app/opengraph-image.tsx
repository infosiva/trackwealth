import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'TrackWealth — AI Wealth Tracker'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #0f172a 50%, #022c22 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        <div style={{ fontSize: 72, marginBottom: 16 }}>📈</div>
        <div style={{ fontSize: 56, fontWeight: 900, color: '#ffffff', letterSpacing: '-1px', textAlign: 'center' }}>
          TrackWealth
        </div>
        <div style={{ fontSize: 26, color: '#6ee7b7', marginTop: 16, textAlign: 'center', maxWidth: 700 }}>
          AI Wealth Tracker — Know Your Next Money Move
        </div>
        <div style={{ fontSize: 18, color: '#a7f3d0', marginTop: 24, opacity: 0.8 }}>
          trackwealth.app
        </div>
      </div>
    ),
    { ...size }
  )
}
