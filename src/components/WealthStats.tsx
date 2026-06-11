'use client'
import { useEffect, useState } from 'react'

interface StoredPortfolio {
  total_value?: number
  total_cost?: number
}

interface HistoryEntry {
  date: string
  value: number
  cost: number
}

const PILL_STYLE: React.CSSProperties = {
  background: 'rgba(2,15,7,0.7)',
  border: '1px solid rgba(5,150,105,0.15)',
  borderRadius: '0.5rem',
  padding: '0.625rem 1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  flex: 1,
  minWidth: 0,
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '0.6rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#064e3b',
}

const VALUE_STYLE: React.CSSProperties = {
  fontSize: '0.9375rem',
  fontWeight: 700,
  fontFamily: 'JetBrains Mono, monospace',
  color: '#34d399',
}

const EMPTY_STYLE: React.CSSProperties = {
  ...VALUE_STYLE,
  color: '#1a5c3a',
}

export default function WealthStats() {
  const [netWorth, setNetWorth] = useState<number | null>(null)
  const [monthlyChange, setMonthlyChange] = useState<number | null>(null)
  const [savingsRate, setSavingsRate] = useState<number | null>(null)
  const [goalProgress, setGoalProgress] = useState<number | null>(null)

  useEffect(() => {
    try {
      // Portfolio result
      const raw = localStorage.getItem('wealthpilot-last-result')
      if (raw) {
        const portfolio: StoredPortfolio = JSON.parse(raw)
        if (portfolio.total_value) setNetWorth(portfolio.total_value)
        if (portfolio.total_value && portfolio.total_cost) {
          const gainPct = ((portfolio.total_value - portfolio.total_cost) / portfolio.total_cost) * 100
          setMonthlyChange(parseFloat(gainPct.toFixed(2)))
        }
      }

      // History for monthly change
      const histRaw = localStorage.getItem('wealthpilot-history')
      if (histRaw) {
        const history: HistoryEntry[] = JSON.parse(histRaw)
        if (history.length >= 2) {
          const latest = history[history.length - 1].value
          const prev = history[0].value
          const changePct = ((latest - prev) / prev) * 100
          setMonthlyChange(parseFloat(changePct.toFixed(2)))
          // Use latest value as net worth if no direct result
          if (!netWorth) setNetWorth(latest)
        }
      }

      // Savings rate placeholder from localStorage if stored
      const srRaw = localStorage.getItem('tw_savings_rate')
      if (srRaw) setSavingsRate(parseFloat(srRaw))

      // Goal progress placeholder
      const gpRaw = localStorage.getItem('tw_goal_progress')
      if (gpRaw) setGoalProgress(parseFloat(gpRaw))
    } catch { /* ignore */ }
  }, [])

  const hasAnyData = netWorth !== null || monthlyChange !== null

  if (!hasAnyData) {
    // Show placeholder strip when no data
    return (
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
      }}>
        {[
          { label: 'Net Worth', value: '--' },
          { label: 'Monthly Change', value: '--' },
          { label: 'Savings Rate', value: '--' },
          { label: 'Goal Progress', value: '--' },
        ].map(pill => (
          <div key={pill.label} style={PILL_STYLE}>
            <span style={LABEL_STYLE}>{pill.label}</span>
            <span style={EMPTY_STYLE}>{pill.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      gap: '0.75rem',
      marginBottom: '1.25rem',
      flexWrap: 'wrap',
    }}>
      {/* Net Worth */}
      <div style={PILL_STYLE}>
        <span style={LABEL_STYLE}>Net Worth</span>
        <span style={VALUE_STYLE}>
          {netWorth !== null ? `$${netWorth.toLocaleString()}` : '--'}
        </span>
      </div>

      {/* Monthly Change */}
      <div style={PILL_STYLE}>
        <span style={LABEL_STYLE}>Monthly Change</span>
        <span style={{
          ...VALUE_STYLE,
          color: monthlyChange === null ? '#1a5c3a' : monthlyChange >= 0 ? '#4ade80' : '#f87171',
        }}>
          {monthlyChange !== null ? `${monthlyChange >= 0 ? '+' : ''}${monthlyChange}%` : '--'}
        </span>
      </div>

      {/* Savings Rate */}
      <div style={PILL_STYLE}>
        <span style={LABEL_STYLE}>Savings Rate</span>
        <span style={VALUE_STYLE}>
          {savingsRate !== null ? `${savingsRate}%` : '--'}
        </span>
      </div>

      {/* Goal Progress */}
      <div style={PILL_STYLE}>
        <span style={LABEL_STYLE}>Goal Progress</span>
        <span style={VALUE_STYLE}>
          {goalProgress !== null ? `${goalProgress}%` : '--'}
        </span>
      </div>
    </div>
  )
}
