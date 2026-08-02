'use client'

/**
 * PromoBar — inline "have a promo code?" toggle + unlocked-state banner.
 * Uses existing lib/promoCode.ts (server) + hooks/usePromo.ts (client) backend.
 */

import { useState } from 'react'
import { usePromo } from '@/hooks/usePromo'

const ACCENT = 'var(--accent, #f59e0b)'

export default function PromoBar() {
  const { isUnlocked, daysLeft } = usePromo()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'invalid'>('idle')

  if (isUnlocked) {
    return (
      <p style={{ fontSize: '0.6875rem', color: ACCENT, marginTop: '0.5rem' }}>
        🎉 Pro access active — {daysLeft} day{daysLeft === 1 ? '' : 's'} remaining
      </p>
    )
  }

  async function submit() {
    if (!code.trim()) return
    setStatus('checking')
    try {
      const res = await fetch('/api/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (data.valid) {
        window.location.reload()
      } else {
        setStatus('invalid')
      }
    } catch {
      setStatus('invalid')
    }
  }

  if (!open) {
    return (
      <p style={{ fontSize: '0.6875rem', opacity: 0.5, marginTop: '0.5rem' }}>
        Have a promo code?{' '}
        <button
          onClick={() => setOpen(true)}
          style={{ color: ACCENT, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
        >
          Enter it here
        </button>
      </p>
    )
  }

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value); setStatus('idle') }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Enter code"
          style={{ borderRadius: 6, border: '1px solid rgba(245,158,11,0.4)', padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'transparent', color: 'inherit' }}
        />
        <button
          onClick={submit}
          disabled={status === 'checking'}
          style={{ borderRadius: 6, padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 600, color: '#fff', background: ACCENT, opacity: status === 'checking' ? 0.6 : 1 }}
        >
          {status === 'checking' ? '...' : 'Apply'}
        </button>
      </div>
      {status === 'invalid' && <p style={{ color: '#f87171', fontSize: '0.6875rem', marginTop: '0.25rem' }}>Invalid code</p>}
    </div>
  )
}
