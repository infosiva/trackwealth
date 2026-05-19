'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

export default function StickyFooterCTA() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      if (localStorage.getItem('trackwealth_cta_dismissed') === '1') {
        setDismissed(true)
        return
      }
    } catch {}
    timerRef.current = setTimeout(() => setVisible(true), 3000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  function dismiss() {
    setDismissed(true)
    setVisible(false)
    try { localStorage.setItem('trackwealth_cta_dismissed', '1') } catch {}
  }

  if (dismissed || !visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '12px 20px',
        background: 'rgba(2, 15, 7, 0.95)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(5,150,105,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        boxShadow: '0 -4px 24px rgba(5,150,105,0.12)',
      }}
    >
      <span style={{ color: '#d1fae5', fontSize: '0.9375rem', fontWeight: 500 }}>
        Track your investments with AI insights — free to start
      </span>
      <Link
        href="/"
        onClick={dismiss}
        style={{
          display: 'inline-block',
          padding: '10px 24px',
          minHeight: '44px',
          background: 'linear-gradient(135deg, #059669, #34d399)',
          color: '#fff',
          fontWeight: 700,
          fontSize: '0.9375rem',
          borderRadius: '10px',
          textDecoration: 'none',
          lineHeight: '24px',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Start Free — No credit card required
      </Link>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          background: 'none',
          border: 'none',
          color: '#9ca3af',
          fontSize: '1.2rem',
          cursor: 'pointer',
          padding: '4px 8px',
          lineHeight: 1,
          touchAction: 'manipulation',
        }}
      >
        ×
      </button>
    </div>
  )
}
