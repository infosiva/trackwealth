'use client'
import { useEffect, useState } from 'react'

interface HistoryEntry { date: string; value: number; cost: number }

// Real data only: derived from the user's own saved analysis history (written by TrackWealthPage).
// No data yet -> render nothing (no placeholder numbers). Savings rate / goal progress were never
// written by anything, so they were removed.
export default function WealthStats() {
  const [s, setS] = useState<{ value: number; change: number } | null>(null)

  useEffect(() => {
    try {
      const h: HistoryEntry[] = JSON.parse(localStorage.getItem('wealthpilot-history') || '[]')
      if (h.length >= 2 && h[0].value > 0) {
        const latest = h[h.length - 1].value
        setS({ value: latest, change: parseFloat((((latest - h[0].value) / h[0].value) * 100).toFixed(2)) })
      }
    } catch { /* ignore */ }
  }, [])

  if (!s) return null
  const pill = 'flex-1 min-w-0 flex flex-col gap-1 rounded-lg px-4 py-2'
  const box = { background: 'var(--surface-1)', border: '1px solid var(--border-default)' }
  const label = { fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--label-dim)' }
  const val = { fontSize: '0.95rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }
  return (
    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
      <div className={pill} style={box}>
        <span style={label}>Last analysis value</span>
        <span style={{ ...val, color: '#34d399' }}>${s.value.toLocaleString()}</span>
      </div>
      <div className={pill} style={box}>
        <span style={label}>Change since first run</span>
        <span style={{ ...val, color: s.change >= 0 ? '#4ade80' : '#f87171' }}>{s.change >= 0 ? '+' : ''}{s.change}%</span>
      </div>
    </div>
  )
}
