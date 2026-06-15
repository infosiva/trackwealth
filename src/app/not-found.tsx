import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '40px 16px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 64,
          fontWeight: 900,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1,
        }}
      >
        404
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f4f4f5', margin: 0 }}>
        Page not found
      </h1>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0, maxWidth: 320 }}>
        This page has moved or doesn&apos;t exist.
      </p>
      <Link
        href="/"
        style={{
          marginTop: 8,
          padding: '12px 28px',
          borderRadius: 12,
          background: 'rgba(16,185,129,0.15)',
          color: '#34d399',
          fontWeight: 800,
          fontSize: 14,
          textDecoration: 'none',
          border: '1px solid rgba(16,185,129,0.4)',
        }}
      >
        Go home →
      </Link>
    </div>
  )
}
