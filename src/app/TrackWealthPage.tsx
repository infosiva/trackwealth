'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import WealthStats from '@/components/WealthStats'
import LiveStatsBar from '@/components/LiveStatsBar'
import { useGate } from '@/lib/shared/useGate'
import RegisterGate from '@/lib/shared/RegisterGate'
import GuidedTour, { type TourStep } from '@/components/GuidedTour'
import PromoBar from '@/components/PromoBar'
import { siteConfig } from '@/site.config'

// ─── Tour ────────────────────────────────────────────────────────────────────
const TOUR: TourStep[] = [
  { target: '#portfolio-form', title: 'Track your portfolio', icon: '📊', body: 'Add holdings — live prices show your real-time P&L instantly.', placement: 'bottom' },
  { target: '#pricing', title: 'Unlock unlimited analyses', icon: '💹', body: 'Pro removes daily limits — run AI checks any time.', placement: 'top' },
]

// ─── Types ───────────────────────────────────────────────────────────────────
interface Holding { ticker: string; shares: string; buyPrice: string }
interface Result { ticker: string; shares: number; buy_price: number; current_price: number; current_value: number; gain_loss_pct: number; error?: string }
interface HistoryEntry { date: string; value: number; cost: number }
interface PortfolioResult { holdings: Result[]; total_value: number; total_cost: number; total_gain_loss_pct: number; insights?: string }
interface Alert { ticker: string; targetPrice: number; direction: 'above' | 'below'; triggered?: boolean }

// ─── Colour map ──────────────────────────────────────────────────────────────
const COLORS: Record<string, string> = {
  AAPL:'#22c55e', MSFT:'#4ade80', GOOGL:'#86efac', AMZN:'#16a34a',
  TSLA:'#f87171', META:'#6ee7b7', NVDA:'#34d399', NFLX:'#a7f3d0',
  JPM:'#bbf7d0', default: '#22c55e',
}

// ─── Asset type pill ─────────────────────────────────────────────────────────
const CRYPTO_TICKERS = new Set(['BTC','ETH','SOL','BNB','XRP','ADA','DOGE','MATIC','DOT','AVAX','LINK','UNI','LTC'])
const CASH_TICKERS   = new Set(['USD','GBP','EUR','CASH','USDC','USDT','BUSD'])
const PROPERTY_TICKERS = new Set(['VNQ','O','SPG','AMT','EQIX','PLD'])

function assetType(ticker: string): { label: string; color: string; bg: string } {
  if (CRYPTO_TICKERS.has(ticker)) return { label: 'Crypto', color: '#fed7aa', bg: 'rgba(251,146,60,0.28)' }
  if (CASH_TICKERS.has(ticker))   return { label: 'Cash',   color: '#bbf7d0', bg: 'rgba(74,222,128,0.28)' }
  if (PROPERTY_TICKERS.has(ticker)) return { label: 'Property', color: '#e9d5ff', bg: 'rgba(192,132,252,0.28)' }
  return { label: 'Stock', color: '#bfdbfe', bg: 'rgba(96,165,250,0.28)' }
}

// ─── Animated Net-Worth Chart ─────────────────────────────────────────────────
type ChartRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'
const RANGES: ChartRange[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL']

interface ChartPoint { x: number; y: number; value: number; label: string }

// Deterministic pseudo-random so series don't reshuffle on every render/tab-revisit
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// Synthetic per-range series — no real portfolio history API exists server-side
// (checked src/app/api/portfolio/route.ts + src/app/api/data/route.ts: portfolio
// route only returns live current-price snapshots, data route is an unrelated
// public-API proxy). Point count/volatility/trend vary per range for realism.
function genSeries(range: ChartRange): ChartPoint[] {
  const base = 124840
  const cfg: Record<ChartRange, { points: number; vol: number; drift: number; fmt: (i: number) => string }> = {
    '1D':  { points: 24, vol: 0.006, drift: 0.0015,  fmt: i => `${i}:00` },
    '1W':  { points: 7,  vol: 0.012, drift: 0.004,   fmt: i => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i] },
    '1M':  { points: 30, vol: 0.014, drift: 0.003,   fmt: i => `Day ${i + 1}` },
    '3M':  { points: 13, vol: 0.02,  drift: 0.006,   fmt: i => `Wk ${i + 1}` },
    '1Y':  { points: 12, vol: 0.03,  drift: 0.01,    fmt: i => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i] },
    'ALL': { points: 18, vol: 0.035, drift: 0.014,   fmt: i => `M${i + 1}` },
  }
  const { points, vol, drift, fmt } = cfg[range]
  const seedBase = range.charCodeAt(0) * 97 + range.length
  let value = base * (1 - drift * points * 0.5)
  const values: number[] = []
  for (let i = 0; i < points; i++) {
    const r = seededRandom(seedBase + i * 13.37) - 0.5
    value = value * (1 + drift + r * vol)
    values.push(value)
  }
  const min = Math.min(...values), max = Math.max(...values)
  const span = max - min || 1
  return values.map((v, i) => ({
    x: (i / (points - 1)) * 540,
    y: 92 - ((v - min) / span) * 84,
    value: Math.round(v),
    label: fmt(i),
  }))
}

function NetWorthChart() {
  const canvasRef = useRef<SVGSVGElement>(null)
  const [progress, setProgress] = useState(0)
  const [range, setRange] = useState<ChartRange>('1D')
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)
  const [scrubIdx, setScrubIdx] = useState<number | null>(null)
  const prevEndValue = useRef<number | null>(null)

  const series = useMemo(() => genSeries(range), [range])
  const isUp = series.length > 1 ? series[series.length - 1].value >= series[0].value : true

  useEffect(() => {
    let frame: number
    let start: number | null = null
    const duration = 1200
    setProgress(0)
    const animate = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setProgress(p)
      if (p < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [range])

  useEffect(() => {
    const endValue = series[series.length - 1]?.value ?? null
    if (prevEndValue.current !== null && endValue !== null && endValue !== prevEndValue.current) {
      setFlash(endValue > prevEndValue.current ? 'up' : 'down')
      const t = setTimeout(() => setFlash(null), 550)
      prevEndValue.current = endValue
      return () => clearTimeout(t)
    }
    prevEndValue.current = endValue
  }, [series])

  const visiblePts = series.map((p, i) => {
    const threshold = i / (series.length - 1)
    if (progress < threshold) return null
    return p
  }).filter(Boolean) as ChartPoint[]

  const pathD = visiblePts.length > 1
    ? visiblePts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
    : ''

  const areaD = visiblePts.length > 1
    ? `${pathD} L ${visiblePts[visiblePts.length - 1].x} 100 L 0 100 Z`
    : ''

  const activeIdx = scrubIdx ?? series.length - 1
  const activePt = series[activeIdx]

  function handlePointer(e: React.PointerEvent<SVGSVGElement>) {
    const svg = canvasRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const relX = ((e.clientX - rect.left) / rect.width) * 540
    let nearest = 0
    let best = Infinity
    series.forEach((p, i) => {
      const d = Math.abs(p.x - relX)
      if (d < best) { best = d; nearest = i }
    })
    setScrubIdx(nearest)
  }

  function endScrub() { setScrubIdx(null) }

  const lineColor = isUp ? { from: '#16a34a', to: '#4ade80', fill: '#22c55e', dot: '#4ade80' }
                         : { from: '#dc2626', to: '#f87171', fill: '#ef4444', dot: '#f87171' }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        className={flash === 'up' ? 'tw-chart-value tw-value-flash-up' : flash === 'down' ? 'tw-chart-value tw-value-flash-down' : 'tw-chart-value'}
      >
        ${activePt ? activePt.value.toLocaleString() : '—'}
      </div>

      <div className="tw-range-tabs">
        {RANGES.map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`tw-range-tab ${range === r ? 'tw-range-tab-active' : ''}`}
          >
            {r}
          </button>
        ))}
      </div>

      <div style={{ position: 'relative', width: '100%', height: '80px', marginTop: '0.5rem' }}>
        <svg
          ref={canvasRef}
          viewBox="0 0 540 100"
          className="w-full h-full"
          preserveAspectRatio="none"
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerUp={endScrub}
          onPointerLeave={endScrub}
          style={{ touchAction: 'none', cursor: 'crosshair' }}
        >
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor.fill} stopOpacity="0.25" />
              <stop offset="100%" stopColor={lineColor.fill} stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="chartLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={lineColor.from} />
              <stop offset="100%" stopColor={lineColor.to} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {areaD && <path d={areaD} fill="url(#chartFill)" />}
          {pathD && <path d={pathD} fill="none" stroke="url(#chartLine)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" filter="url(#glow)" />}
          {scrubIdx !== null && activePt && (
            <line x1={activePt.x} y1="0" x2={activePt.x} y2="100" stroke="rgba(240,253,244,0.35)" strokeWidth="1" strokeDasharray="3,3" />
          )}
          {activePt && (
            <circle
              cx={activePt.x}
              cy={activePt.y}
              r="4"
              fill={lineColor.dot}
              filter="url(#glow)"
              style={scrubIdx === null ? { animation: 'pulseGreen 2s ease-in-out infinite' } : undefined}
            />
          )}
        </svg>
        {scrubIdx !== null && activePt && (
          <div
            className="tw-chart-tooltip"
            style={{ left: `${(activePt.x / 540) * 100}%`, top: `${(activePt.y / 100) * 80}px` }}
          >
            {activePt.label} · ${activePt.value.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Health Score Meter ───────────────────────────────────────────────────────
function HealthMeter({ score }: { score: number }) {
  const [displayed, setDisplayed] = useState(0)
  useEffect(() => {
    let frame: number
    let start: number | null = null
    const animate = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / 1200, 1)
      setDisplayed(Math.round(p * score))
      if (p < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [score])

  const pct = (displayed / 100) * 100
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  const label = score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs Work'

  return (
    <div className="tw-health-meter">
      <div className="tw-meter-ring">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(34,197,94,0.1)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="40" fill="none"
            stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 40}`}
            strokeDashoffset={`${2 * Math.PI * 40 * (1 - pct / 100)}`}
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dashoffset 0.05s linear', filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>
        <div className="tw-meter-center">
          <span className="tw-meter-score" style={{ color }}>{displayed}</span>
          <span className="tw-meter-label">{label}</span>
        </div>
      </div>
    </div>
  )
}

// ─── AI Insight Card ──────────────────────────────────────────────────────────
function InsightCard({ icon, text, highlight }: { icon: string; text: string; highlight?: boolean }) {
  return (
    <div className={`tw-insight-card ${highlight ? 'tw-insight-highlight' : ''}`}>
      <span className="tw-insight-icon">{icon}</span>
      <p className="tw-insight-text">{text}</p>
    </div>
  )
}

// ─── Monthly AI Insight Card ─────────────────────────────────────────────────
const MONTHLY_INSIGHTS = [
  "Your savings rate is 18% — increasing to 20% adds £240/year to your emergency fund.",
  "Markets are up 3.2% this month. Your growth allocation could be reviewed.",
  "You've tracked 3 consecutive months. Time to review your investment allocation.",
]

function MonthlyInsightCard() {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem('tw_insight_dismissed') === '1') setDismissed(true)
    } catch { /* ignore */ }
  }, [])

  if (dismissed) return null

  const monthIndex = new Date().getMonth() % MONTHLY_INSIGHTS.length
  const insight = MONTHLY_INSIGHTS[monthIndex]

  function dismiss() {
    setDismissed(true)
    try { localStorage.setItem('tw_insight_dismissed', '1') } catch { /* ignore */ }
  }

  return (
    <div style={{
      borderLeft: '3px solid #22c55e',
      background: 'rgba(2,15,7,0.85)',
      borderRadius: '0.625rem',
      padding: '0.875rem 1rem',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      position: 'relative',
      border: '1px solid rgba(34,197,94,0.15)',
      borderLeftColor: '#22c55e',
      borderLeftWidth: '3px',
    }}>
      <span style={{ fontSize: '1.25rem', flexShrink: 0, lineHeight: 1 }}>💡</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
          This month&apos;s AI insight
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#a7f3d0', lineHeight: 1.5, margin: 0 }}>{insight}</p>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss insight"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#064e3b', fontSize: '0.875rem', lineHeight: 1,
          padding: '0.125rem', flexShrink: 0, transition: 'color 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#064e3b' }}
      >✕</button>
    </div>
  )
}

// ─── Net Worth Trajectory Visual ─────────────────────────────────────────────
const TRAJECTORY_BARS = [
  { label: 'M-4', height: 40 },
  { label: 'M-3', height: 52 },
  { label: 'M-2', height: 61 },
  { label: 'M-1', height: 75 },
  { label: 'Now', height: 90 },
]

function NetWorthTrajectory() {
  const trend = TRAJECTORY_BARS[TRAJECTORY_BARS.length - 1].height > TRAJECTORY_BARS[0].height

  return (
    <div style={{
      background: 'rgba(2,15,7,0.7)',
      border: '1px solid rgba(5,150,105,0.12)',
      borderRadius: '0.75rem',
      padding: '1rem 1.25rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Net Worth Trajectory
        </span>
        <span style={{
          fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.5rem',
          borderRadius: '9999px', background: trend ? '#047857' : '#b91c1c',
          color: '#ffffff',
        }}>
          {trend ? '▲ Trending up' : '▼ Trending down'}
        </span>
      </div>

      {/* Bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '4.5rem' }}>
        {TRAJECTORY_BARS.map((bar, i) => (
          <div key={bar.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', height: '100%', justifyContent: 'flex-end' }}>
            <div
              style={{
                width: '100%',
                height: `${bar.height}%`,
                background: i === TRAJECTORY_BARS.length - 1
                  ? 'linear-gradient(180deg, #4ade80 0%, #16a34a 100%)'
                  : 'rgba(34,197,94,0.25)',
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.6s cubic-bezier(0.23,1,0.32,1)',
                boxShadow: i === TRAJECTORY_BARS.length - 1 ? '0 0 8px rgba(74,222,128,0.35)' : 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* Month labels */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.375rem' }}>
        {TRAJECTORY_BARS.map(bar => (
          <div key={bar.label} style={{ flex: 1, textAlign: 'center', fontSize: '0.625rem', color: '#064e3b', fontFamily: 'JetBrains Mono, monospace' }}>
            {bar.label}
          </div>
        ))}
      </div>

      {/* CTA */}
      <p style={{ fontSize: '0.6875rem', color: '#064e3b', marginTop: '0.625rem', textAlign: 'center' }}>
        Connect your accounts to see real data
      </p>
    </div>
  )
}

// ─── Mini Sparkline ───────────────────────────────────────────────────────────
function MiniSparkline({ history }: { history: HistoryEntry[] }) {
  if (history.length < 2) return <span className="text-xs opacity-30 font-mono">no data</span>
  const vals = history.map(h => h.value)
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const w = 80, h = 24
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`)
  const up = vals[vals.length - 1] >= vals[0]
  return (
    <svg width={w} height={h}>
      <polyline points={pts.join(' ')} fill="none" stroke={up ? '#22c55e' : '#f87171'} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Allocation Bar ───────────────────────────────────────────────────────────
function AllocationBar({ holdings, total }: { holdings: Result[]; total: number }) {
  const valid = holdings.filter(h => !h.error && h.current_value > 0)
  return (
    <div className="flex h-2 rounded-full overflow-hidden gap-px">
      {valid.map(h => (
        <div key={h.ticker} className="h-full transition-all duration-700"
          style={{ width: `${(h.current_value / total * 100).toFixed(1)}%`, background: COLORS[h.ticker] ?? COLORS.default }} />
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TrackWealthPage({ showPricing = false }: { showPricing?: boolean }) {
  const { count: gateCount, showGate, increment: gateIncrement, onRegistered, dismissGate, isRegistered } = useGate('wealthpilot', 5)
  const remaining = Math.max(0, 3 - gateCount)
  const [isPro, setIsPro] = useState(false)
  const isLimited = !isRegistered && !isPro && gateCount >= 3
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [holdings, setHoldings] = useState<Holding[]>([{ ticker: '', shares: '', buyPrice: '' }])
  const [result, setResult] = useState<PortfolioResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertTicker, setAlertTicker] = useState('')
  const [alertPrice, setAlertPrice] = useState('')
  const [alertDir, setAlertDir] = useState<'above' | 'below'>('above')
  const [tab, setTab] = useState<'holdings' | 'allocation' | 'insights' | 'alerts'>('holdings')
  const [trackMode, setTrackMode] = useState<'Investments' | 'Spending' | 'Savings' | 'Net Worth'>('Investments')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('wealthpilot-history')
      if (saved) setHistory(JSON.parse(saved))
      const savedAlerts = localStorage.getItem('wealthpilot-alerts')
      if (savedAlerts) setAlerts(JSON.parse(savedAlerts))
      if (localStorage.getItem('wealthpilot-pro') === '1') setIsPro(true)
    } catch { /* ignore */ }
    const params = new URLSearchParams(window.location.search)
    if (params.get('upgraded') === '1') {
      localStorage.setItem('wealthpilot-pro', '1')
      setIsPro(true)
      window.history.replaceState({}, '', '/')
    }
    fetch('http://31.97.56.148:3099/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site: 'trackwealth.app', path: window.location.pathname, userAgent: navigator.userAgent, timestamp: new Date().toISOString() }),
    }).catch(() => {/* ignore */})
  }, [])

  const handleUpgrade = useCallback(async () => {
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '' }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch { /* ignore */ } finally { setCheckoutLoading(false) }
  }, [])

  const addRow = () => setHoldings(h => [...h, { ticker: '', shares: '', buyPrice: '' }])
  const removeRow = (i: number) => setHoldings(h => h.filter((_, idx) => idx !== i))
  const updateRow = (i: number, field: keyof Holding, val: string) =>
    setHoldings(h => h.map((r, idx) => idx === i ? { ...r, [field]: val } : r))

  async function analyze() {
    const valid = holdings.filter(h => h.ticker && h.shares && h.buyPrice)
    if (!valid.length) return
    const allowed = await gateIncrement()
    if (!allowed) return
    setLoading(true)
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings: valid.map(h => ({ ticker: h.ticker.toUpperCase(), shares: parseFloat(h.shares), buy_price: parseFloat(h.buyPrice) })), question }),
      })
      const data = await res.json()
      setResult(data)
      fetch('/api/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'portfolio_tracked' }) }).catch(() => {})
      if (data.total_value > 0) {
        const entry: HistoryEntry = { date: new Date().toISOString().split('T')[0], value: data.total_value, cost: data.total_cost }
        const newHistory = [...history.filter(h => h.date !== entry.date), entry].slice(-30)
        setHistory(newHistory)
        localStorage.setItem('wealthpilot-history', JSON.stringify(newHistory))
        fetch('/api/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'snapshot_created' }) }).catch(() => {})
      }
      if (data.holdings) {
        const updatedAlerts = alerts.map(a => {
          const holding = data.holdings.find((h: Result) => h.ticker === a.ticker)
          if (!holding) return a
          return { ...a, triggered: a.direction === 'above' ? holding.current_price >= a.targetPrice : holding.current_price <= a.targetPrice }
        })
        setAlerts(updatedAlerts)
        localStorage.setItem('wealthpilot-alerts', JSON.stringify(updatedAlerts))
      }
      setTab('holdings')
    } finally { setLoading(false) }
  }

  function addAlert() {
    if (!alertTicker || !alertPrice) return
    const newAlerts = [...alerts, { ticker: alertTicker.toUpperCase(), targetPrice: parseFloat(alertPrice), direction: alertDir }]
    setAlerts(newAlerts)
    localStorage.setItem('wealthpilot-alerts', JSON.stringify(newAlerts))
    setAlertTicker(''); setAlertPrice('')
  }

  const triggeredAlerts = alerts.filter(a => a.triggered)
  const inp = 'tw-input-mono uppercase'
  const inpNum = 'tw-input-mono'

  const trackModes: Array<'Investments' | 'Spending' | 'Savings' | 'Net Worth'> = ['Investments', 'Spending', 'Savings', 'Net Worth']

  return (
    <>
      {/* Gold terminal ambient background */}
      <div className="tw-gold-orb tw-gold-orb-1" aria-hidden="true" />
      <div className="tw-gold-orb tw-gold-orb-2" aria-hidden="true" />
      <div className="tw-gold-orb tw-gold-orb-3" aria-hidden="true" />
      <div className="tw-grid-overlay" aria-hidden="true" />

      <main className="min-h-screen relative z-10">

        {/* ── Ticker tape ──────────────────────────────────────────── */}
        <div className="tw-ticker-wrap" aria-hidden="true">
          <div className="tw-ticker">
            {[
              ['AAPL', '+1.2%', true], ['MSFT', '+0.8%', true], ['GOOGL', '-0.3%', false],
              ['AMZN', '+2.1%', true], ['TSLA', '-1.5%', false], ['NVDA', '+3.4%', true],
              ['META', '+0.6%', true], ['JPM', '-0.2%', false], ['NFLX', '+1.8%', true],
              ['BTC', '+3.1%', true], ['ETH', '+2.2%', true], ['GOLD', '+0.4%', true],
              ['AAPL', '+1.2%', true], ['MSFT', '+0.8%', true], ['GOOGL', '-0.3%', false],
              ['AMZN', '+2.1%', true], ['TSLA', '-1.5%', false], ['NVDA', '+3.4%', true],
            ].map(([t, v, up], i) => (
              <span key={i} className="tw-tick-item">
                <span className="tw-tick-symbol">{t}</span>
                <span className={up ? 'tw-tick-up' : 'tw-tick-down'}>{v as string}</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── Bloomberg Terminal Hero ───────────────────────────────── */}
        <section className="tw-terminal-hero">
          <div className="tw-terminal-hero-inner">

            {/* ── Left: copy + portfolio input ── */}
            <div className="tw-terminal-left">

              {/* Live badge */}
              <div className="tw-live-badge fade-up">
                <span className="tw-live-dot" />
                LIVE MARKET DATA · AI-POWERED · FREE TO START
              </div>

              {/* Headline */}
              <h1 className="tw-terminal-headline fade-up delay-75">
                Your portfolio.
                <span className="tw-terminal-headline-gold">
                  Institutional-grade intelligence.
                </span>
              </h1>

              {/* Subtext */}
              <p className="tw-terminal-sub fade-up delay-150">
                Enter any stock portfolio — get live P&amp;L, AI risk analysis, rebalancing advice,
                and price alerts in seconds. What hedge funds charge $10K/yr for, now $12/mo.
              </p>

              {/* Portfolio input + CTA (inline row) */}
              <div className="tw-portfolio-input-wrap fade-up delay-200">
                <input
                  className="tw-portfolio-input"
                  placeholder="AAPL 50, MSFT 30, NVDA 20..."
                  readOnly
                  aria-label="Portfolio tickers example"
                />
                <a href="#portfolio-form" className="tw-terminal-cta">
                  Analyse My Portfolio
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
              </div>

              {/* Trust pills */}
              <div className="tw-terminal-trust fade-up delay-300">
                {[
                  'No brokerage login needed',
                  'Yahoo Finance + Claude AI',
                  '3 free analyses daily',
                ].map(pill => (
                  <span key={pill} className="tw-terminal-trust-pill">
                    <span className="tw-terminal-trust-check">✓</span>
                    {pill}
                  </span>
                ))}
              </div>

              <div className="fade-up delay-300">
                <PromoBar />
              </div>
            </div>

            {/* ── Right: Bloomberg terminal panel ── */}
            <div className="tw-hero-right scale-in delay-200">
              <div className="tw-terminal-panel">

                {/* Header bar */}
                <div className="tw-terminal-header">
                  <div className="tw-terminal-brand">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                      <polyline points="16 7 22 7 22 13" />
                    </svg>
                    TrackWealth
                    <span style={{ color: 'rgba(5,150,105,0.35)', fontWeight: 400 }}>•</span>
                    <span style={{ color: 'rgba(209,213,219,0.45)', fontWeight: 400 }}>TERMINAL</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="tw-terminal-live-pill">
                      <span className="tw-terminal-live-pill-dot" />
                      LIVE
                    </div>
                    <div className="tw-terminal-tab">AI Insights</div>
                  </div>
                </div>

                {/* 2×2 metric grid */}
                <div className="tw-metric-grid">
                  {/* Portfolio value */}
                  <div className="tw-metric-card">
                    <div className="tw-metric-label">Portfolio</div>
                    <div className="tw-metric-value">$124,840</div>
                    <div className="tw-metric-sub tw-metric-green">+$1,247 today  ↑1.2%</div>
                  </div>
                  {/* Best performer */}
                  <div className="tw-metric-card">
                    <div className="tw-metric-label">Best Performer</div>
                    <div className="tw-metric-value tw-metric-green">NVDA</div>
                    <div className="tw-metric-sub tw-metric-green">+18.4% this month</div>
                  </div>
                  {/* Risk score */}
                  <div className="tw-metric-card">
                    <div className="tw-metric-label">Risk Score</div>
                    <div className="tw-metric-value tw-metric-gold">Low</div>
                    <div className="tw-metric-sub tw-metric-gold">23 / 100</div>
                  </div>
                  {/* Rebalance */}
                  <div className="tw-metric-card">
                    <div className="tw-metric-label">Rebalance</div>
                    <div className="tw-metric-value tw-metric-amber">2</div>
                    <div className="tw-metric-sub tw-metric-amber">suggestions pending</div>
                  </div>
                </div>

                {/* Sparkline chart */}
                <div className="tw-sparkline-wrap">
                  <div className="tw-sparkline-header">
                    <span className="tw-sparkline-label">Portfolio value — 30D</span>
                    <span className="tw-sparkline-delta">▲ +12.3%</span>
                  </div>
                  <svg
                    className="tw-sparkline-svg"
                    viewBox="0 0 400 52"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="sparkGold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#059669" stopOpacity="0.01" />
                      </linearGradient>
                      <filter id="sparkGlow">
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    {/* Area fill */}
                    <path
                      className="tw-sparkline-area"
                      d="M0,45 L40,42 L80,38 L120,34 L160,30 L200,24 L240,20 L280,16 L320,11 L360,8 L400,4 L400,52 L0,52 Z"
                      fill="url(#sparkGold)"
                    />
                    {/* Line */}
                    <path
                      className="tw-sparkline-path"
                      d="M0,45 L40,42 L80,38 L120,34 L160,30 L200,24 L240,20 L280,16 L320,11 L360,8 L400,4"
                      fill="none"
                      stroke="#059669"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#sparkGlow)"
                    />
                    {/* Live dot */}
                    <circle cx="400" cy="4" r="3" fill="#059669" filter="url(#sparkGlow)" style={{ animation: 'livePulse 2s ease-in-out infinite' }} />
                  </svg>
                </div>

                {/* Footer */}
                <div className="tw-terminal-footer">
                  <span className="tw-terminal-sync">
                    <span className="tw-terminal-sync-dot" />
                    Last synced 2 min ago
                  </span>
                  <div className="tw-terminal-corner-dots">
                    <span className="tw-terminal-corner-dot" style={{ background: '#ef4444', opacity: 0.6 }} />
                    <span className="tw-terminal-corner-dot" style={{ background: '#f59e0b', opacity: 0.6 }} />
                    <span className="tw-terminal-corner-dot" style={{ background: '#10b981', opacity: 0.6 }} />
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        <LiveStatsBar />

        {/* ── Mobile demo strip (lg:hidden) ────────────────────────── */}
        <div className="tw-mobile-strip lg:hidden">
          {[
            { label: 'Net Worth', value: '$142,830', delta: '+6.3%', up: true },
            { label: 'Monthly Gain', value: '+$8,420', delta: 'this month', up: true },
            { label: 'Health Score', value: '78 / 100', delta: 'Excellent', up: true },
            { label: 'AI Alerts', value: '3 active', delta: 'new insight', up: null },
          ].map(c => (
            <div key={c.label} className="tw-mobile-card">
              <div className="tw-mobile-card-label">{c.label}</div>
              <div className="tw-mobile-card-value">{c.value}</div>
              <div className={`tw-mobile-card-delta ${c.up === null ? 'tw-delta-neutral' : c.up ? 'tw-delta-up' : 'tw-delta-down'}`}>{c.delta}</div>
            </div>
          ))}
        </div>

        {/* ── How it works (steps) ─────────────────────────────────── */}
        <section className="tw-steps-section">
          <div className="tw-steps-inner">
            <div className="tw-section-eyebrow">How it works</div>
            <div className="tw-steps-row">
              {[
                { n: '01', title: 'Add your holdings', desc: 'Enter stock tickers, crypto, or funds. No brokerage connection needed.' },
                { n: '02', title: 'AI fetches live prices', desc: 'Real-time data from Yahoo Finance. See P&L update instantly.' },
                { n: '03', title: 'Get AI insights', desc: 'Spot patterns, risk concentration, and rebalancing opportunities.' },
                { n: '04', title: 'Set smart alerts', desc: 'Price targets and AI-triggered notifications keep you ahead.' },
              ].map(s => (
                <div key={s.n} className="tw-step reveal stagger-1">
                  <div className="tw-step-num">{s.n}</div>
                  <h3 className="tw-step-title">{s.title}</h3>
                  <p className="tw-step-desc">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Main App ─────────────────────────────────────────────── */}
        <section id="portfolio-form" className="tw-app-section">
          <div className="tw-app-inner">
            <div className="tw-section-eyebrow">Portfolio tracker</div>
            <h2 className="tw-section-title">Analyze your portfolio now</h2>

            {/* Monthly AI Insight + Trajectory strip */}
            <div style={{ marginBottom: '1.5rem' }} className="tw-insight-strip">
              <MonthlyInsightCard />
              <NetWorthTrajectory />
            </div>

            {/* Dashboard stats strip */}
            <WealthStats />

            <div className="tw-app-grid">
              {/* Input panel */}
              <div className="tw-input-panel">
                <div className="tw-panel-head">
                  <span className="tw-panel-title">Holdings</span>
                  <span className="tw-panel-sub">{holdings.filter(h => h.ticker).length} position{holdings.filter(h => h.ticker).length !== 1 ? 's' : ''}</span>
                </div>

                <div className="tw-panel-body">
                  <div className="tw-col-labels">
                    {['Ticker', 'Shares', 'Buy $'].map(l => (
                      <span key={l} className="tw-col-label">{l}</span>
                    ))}
                  </div>

                  {holdings.map((h, i) => (
                    <div key={i} className="tw-holding-input-row">
                      <input value={h.ticker} onChange={e => updateRow(i, 'ticker', e.target.value.toUpperCase())}
                        placeholder="AAPL" className={inp} />
                      <input value={h.shares} onChange={e => updateRow(i, 'shares', e.target.value)}
                        placeholder="10" type="number" className={inpNum} />
                      <div className="relative">
                        <input value={h.buyPrice} onChange={e => updateRow(i, 'buyPrice', e.target.value)}
                          placeholder="150" type="number" className={inpNum + ' pr-6'} />
                        {holdings.length > 1 && (
                          <button onClick={() => removeRow(i)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-900 hover:text-red-400 transition-colors text-xs">✕</button>
                        )}
                      </div>
                    </div>
                  ))}

                  <button onClick={addRow} className="tw-add-row-btn">
                    + Add position
                  </button>
                </div>

                {/* AI Query */}
                <div className="tw-ai-query">
                  <label className="tw-query-label">Ask AI (optional)</label>
                  <input value={question} onChange={e => setQuestion(e.target.value)}
                    placeholder="Should I rebalance? Overexposed to tech?"
                    className="tw-input-text" />
                </div>

                {/* Run */}
                <button onClick={isLimited ? handleUpgrade : analyze} disabled={loading}
                  className={`tw-run-btn btn-press ${isLimited ? 'tw-run-btn-upgrade' : ''}`}>
                  {loading ? (
                    <><span className="tw-spinner" />Analyzing portfolio...</>
                  ) : isLimited ? (
                    'Daily limit reached — Upgrade to Pro'
                  ) : (
                    <>Analyze portfolio <span className="tw-run-remaining">{remaining} free left today</span></>
                  )}
                </button>

                {/* Alerts panel */}
                <div className="tw-alerts-panel">
                  <div className="tw-panel-head">
                    <span className="tw-panel-title">Price Alerts</span>
                    {triggeredAlerts.length > 0 && (
                      <span className="tw-alert-badge">⚡ {triggeredAlerts.length} triggered</span>
                    )}
                  </div>
                  <div className="tw-alert-form">
                    <input value={alertTicker} onChange={e => setAlertTicker(e.target.value.toUpperCase())}
                      placeholder="AAPL" className="tw-input-mono uppercase w-16 flex-shrink-0" />
                    <select value={alertDir} onChange={e => setAlertDir(e.target.value as 'above' | 'below')}
                      className="tw-select">
                      <option value="above">↑ Above</option>
                      <option value="below">↓ Below</option>
                    </select>
                    <input value={alertPrice} onChange={e => setAlertPrice(e.target.value)}
                      placeholder="200" type="number"
                      className="tw-input-mono flex-1" />
                    <button onClick={addAlert} className="tw-alert-set-btn btn-press">Set</button>
                  </div>
                  {alerts.length > 0 && (
                    <div className="tw-alert-list">
                      {alerts.map((a, i) => (
                        <div key={i} className={`tw-alert-item ${a.triggered ? 'tw-alert-triggered' : ''}`}>
                          <span className="font-semibold">{a.ticker}</span>
                          <span>{a.direction === 'above' ? '↑' : '↓'} ${a.targetPrice}</span>
                          {a.triggered && <span className="tw-triggered-label">⚡ Hit</span>}
                          <button onClick={() => { const n = alerts.filter((_, j) => j !== i); setAlerts(n); localStorage.setItem('wealthpilot-alerts', JSON.stringify(n)) }}
                            className="ml-auto text-xs text-emerald-900 hover:text-red-400 transition-colors">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Results panel */}
              <div className="tw-results-panel">
                {result ? (
                  <>
                    {/* Stats row */}
                    <div className="tw-stats-row">
                      {[
                        { label: 'Portfolio Value', value: `$${result.total_value.toLocaleString()}`, sub: `P&L: ${(result.total_value - result.total_cost) >= 0 ? '+' : ''}$${(result.total_value - result.total_cost).toLocaleString()}`, up: true },
                        { label: 'Total Invested', value: `$${result.total_cost.toLocaleString()}`, sub: `${result.holdings.filter(h => !h.error).length} positions`, up: null },
                        { label: 'Return', value: `${result.total_gain_loss_pct >= 0 ? '+' : ''}${result.total_gain_loss_pct.toFixed(2)}%`, sub: result.total_gain_loss_pct >= 0 ? 'Profitable ▲' : 'In Loss ▼', up: result.total_gain_loss_pct >= 0 },
                      ].map(s => (
                        <div key={s.label} className="tw-stat-card">
                          <div className="tw-stat-label">{s.label}</div>
                          <div className={`tw-stat-value ${s.up === null ? 'text-emerald-300' : s.up ? 'text-emerald-400' : 'text-red-400'}`}>{s.value}</div>
                          <div className={`tw-stat-sub ${s.up === null ? 'text-emerald-800' : s.up ? 'text-emerald-700' : 'text-red-800'}`}>{s.sub}</div>
                        </div>
                      ))}
                    </div>

                    {/* Allocation bar */}
                    <div className="tw-alloc-panel">
                      <div className="tw-alloc-label">Allocation</div>
                      <AllocationBar holdings={result.holdings} total={result.total_value} />
                      <div className="tw-alloc-legend">
                        {result.holdings.filter(h => !h.error).map(h => (
                          <div key={h.ticker} className="tw-legend-item">
                            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: COLORS[h.ticker] ?? COLORS.default }} />
                            <span>{h.ticker} {(h.current_value / result.total_value * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="tw-tabs">
                      {[
                        { id: 'holdings', label: 'Positions' },
                        { id: 'allocation', label: 'History' },
                        { id: 'insights', label: 'AI Analysis' },
                        { id: 'alerts', label: `Alerts${triggeredAlerts.length > 0 ? ` ⚡${triggeredAlerts.length}` : ''}` },
                      ].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
                          className={`tw-tab ${tab === t.id ? 'tw-tab-active' : ''}`}>
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Positions */}
                    {tab === 'holdings' && (
                      <div className="tw-positions-table">
                        <div className="tw-positions-header">
                          <span className="col-span-3">Ticker</span>
                          <span className="col-span-2 text-right">Price</span>
                          <span className="col-span-2 text-right">Value</span>
                          <span className="col-span-2 text-right">Return</span>
                          <span className="col-span-3 text-right">Alloc</span>
                        </div>
                        {result.holdings.filter(h => !h.error).map(h => {
                          const alloc = (h.current_value / result.total_value * 100).toFixed(1)
                          const color = COLORS[h.ticker] ?? COLORS.default
                          const type = assetType(h.ticker)
                          return (
                            <div key={h.ticker} className="tw-position-row">
                              <div className="col-span-3 flex items-center gap-2">
                                <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: color }} />
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-semibold text-sm" style={{ color }}>{h.ticker}</span>
                                  <span className="text-[9px] px-1.5 py-px rounded font-semibold" style={{ color: type.color, background: type.bg }}>{type.label}</span>
                                </div>
                              </div>
                              <span className="col-span-2 text-right text-xs text-emerald-400">${h.current_price.toFixed(2)}</span>
                              <span className="col-span-2 text-right text-xs text-white">${h.current_value.toLocaleString()}</span>
                              <span className={`col-span-2 text-right text-xs font-semibold ${h.gain_loss_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {h.gain_loss_pct >= 0 ? '▲' : '▼'} {Math.abs(h.gain_loss_pct).toFixed(2)}%
                              </span>
                              <div className="col-span-3 flex items-center justify-end gap-2">
                                <div className="flex-1 h-1 bg-emerald-950/60 rounded overflow-hidden max-w-12">
                                  <div className="h-full rounded transition-all" style={{ width: `${alloc}%`, background: color }} />
                                </div>
                                <span className="text-[10px] text-emerald-800">{alloc}%</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* History */}
                    {tab === 'allocation' && (
                      <div className="tw-tab-content">
                        <div className="tw-tab-content-label">Portfolio value history (30 days)</div>
                        {history.length >= 2 ? (
                          <>
                            <MiniSparkline history={history} />
                            <div className="mt-3 space-y-1">
                              {history.slice(-5).reverse().map((h, i) => (
                                <div key={i} className="flex justify-between text-xs border-b border-emerald-900/20 pb-1.5">
                                  <span className="text-emerald-800">{h.date}</span>
                                  <span className="text-emerald-400">${h.value.toLocaleString()}</span>
                                  <span className={h.value >= h.cost ? 'text-emerald-600' : 'text-red-600'}>
                                    {h.value >= h.cost ? '+' : ''}{((h.value - h.cost) / h.cost * 100).toFixed(2)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-emerald-900">Run analysis multiple times to build your history.</p>
                        )}
                      </div>
                    )}

                    {/* AI insights */}
                    {tab === 'insights' && (
                      <div className="tw-tab-content">
                        {result.insights ? (
                          <>
                            <div className="tw-tab-content-label flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              AI Portfolio Analysis
                            </div>
                            <p className="text-sm text-emerald-300 leading-relaxed whitespace-pre-wrap">{result.insights}</p>
                          </>
                        ) : (
                          <p className="text-sm text-emerald-900">No AI insights — check API key configuration.</p>
                        )}
                      </div>
                    )}

                    {/* Alerts tab */}
                    {tab === 'alerts' && (
                      <div className="tw-tab-content">
                        <div className="tw-tab-content-label">Alert status</div>
                        {alerts.length > 0 ? (
                          <div className="space-y-2">
                            {alerts.map((a, i) => {
                              const holding = result.holdings.find(h => h.ticker === a.ticker)
                              return (
                                <div key={i} className={`tw-alert-item ${a.triggered ? 'tw-alert-triggered' : ''}`}>
                                  <span className="font-semibold">{a.ticker}</span>
                                  <span>{a.direction === 'above' ? '↑ above' : '↓ below'} ${a.targetPrice}</span>
                                  {holding && <span className="text-emerald-600">now ${holding.current_price.toFixed(2)}</span>}
                                  <span className="ml-auto">{a.triggered ? '⚡ Triggered' : '○ Watching'}</span>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-emerald-900">No active alerts.</p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  /* Empty state */
                  <div className="tw-empty-state">
                    <div className="tw-empty-chart">
                      <NetWorthChart />
                    </div>
                    <div className="tw-empty-copy">
                      <div className="tw-empty-title">Your wealth snapshot appears here</div>
                      <div className="tw-empty-sub">Add your first holding on the left to see live P&L and AI insights</div>
                    </div>
                    <div className="tw-empty-steps">
                      {[
                        { step: '1', label: 'Enter ticker', hint: 'e.g. AAPL, NVDA, BTC' },
                        { step: '2', label: 'Add shares + cost', hint: 'Your cost basis' },
                        { step: '3', label: 'Analyze', hint: 'Live price + AI insight' },
                      ].map(s => (
                        <div key={s.step} className="tw-empty-step">
                          <div className="tw-empty-step-num">{s.step}</div>
                          <div className="tw-empty-step-label">{s.label}</div>
                          <div className="tw-empty-step-hint">{s.hint}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Why TrackWealth ──────────────────────────────────────── */}
        <section className="tw-features-section">
          <div className="tw-features-inner">
            <div className="tw-section-eyebrow">Features</div>
            <h2 className="tw-section-title">Wealth intelligence, not just charts</h2>

            <div className="tw-features-grid">
              {[
                { icon: '🧠', title: 'AI That Thinks Like a CFO', desc: 'Spots concentration risk, correlation issues, and rebalancing signals — not just bar charts.', badge: 'Pro' },
                { icon: '⚡', title: 'Real-time P&L', desc: 'Live prices from Yahoo Finance. Know your exact net worth at any moment.', badge: 'Free' },
                { icon: '🎯', title: 'Smart Price Alerts', desc: 'Set targets and get notified when your thesis plays out.', badge: 'Free' },
                { icon: '📊', title: 'Financial Health Score', desc: 'A single number that tells you how diversified, profitable and risk-aware you are.', badge: 'Pro' },
                { icon: '🔒', title: 'No brokerage access', desc: 'You enter tickers manually. Nothing touches your accounts. Bank-grade private.', badge: 'Always' },
                { icon: '💬', title: 'Natural language AI', desc: "Ask 'Am I overexposed to tech?' and get a straight answer, not a marketing blob.", badge: 'Pro' },
              ].map(f => (
                <div key={f.title} className="tw-feature-card glass-liquid card-hover reveal">
                  <div className="tw-feature-head">
                    <span className="tw-feature-icon">{f.icon}</span>
                    <span className={`tw-feature-badge ${f.badge === 'Free' || f.badge === 'Always' ? 'tw-badge-free' : 'tw-badge-pro'}`}>{f.badge}</span>
                  </div>
                  <h3 className="tw-feature-title">{f.title}</h3>
                  <p className="tw-feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ───────────────────────────────────────────────── */}
        {showPricing && (<section id="pricing" className="tw-pricing-section">
          <div className="tw-pricing-inner">
            <div className="tw-section-eyebrow">Pricing</div>
            <h2 className="tw-section-title">Simple, transparent pricing</h2>
            <p className="tw-pricing-sub">One better trade decision per month covers the cost 10×</p>

            {isPro && (
              <div className="tw-pro-active-banner">⚡ Pro active — unlimited analyses</div>
            )}

            <div className="tw-pricing-grid">
              {[
                {
                  name: 'Free', price: '$0', period: 'forever', highlight: false,
                  features: ['3 analyses per day', 'Live price data', 'AI portfolio insights', 'Price alerts', 'Portfolio history (30 days)', 'Allocation charts'],
                  cta: 'Get started free', onClick: undefined, disabled: false,
                },
                {
                  name: 'Pro', price: '$12', period: '/ month', highlight: true,
                  features: ['Unlimited analyses', 'Email price alerts', 'Export to CSV / PDF', 'Multi-portfolio support', 'AI rebalancing signals', 'Priority support'],
                  cta: isPro ? 'Current plan' : (checkoutLoading ? 'Redirecting...' : 'Upgrade to Pro'),
                  onClick: !isPro ? handleUpgrade : undefined,
                  disabled: isPro || checkoutLoading,
                },
              ].map(plan => (
                <div key={plan.name} className={`tw-plan-card glass-liquid ${plan.highlight ? 'tw-plan-highlight' : ''}`}>
                  {plan.highlight && <div className="tw-plan-popular">Most popular</div>}
                  <div className="tw-plan-name">{plan.name}</div>
                  <div className="tw-plan-price">
                    <span className="tw-plan-amount">{plan.price}</span>
                    <span className="tw-plan-period">{plan.period}</span>
                  </div>
                  <ul className="tw-plan-features">
                    {plan.features.map(f => (
                      <li key={f} className="tw-plan-feature">
                        <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={plan.onClick} disabled={plan.disabled}
                    className={`tw-plan-cta btn-press ${plan.highlight ? 'tw-plan-cta-primary' : 'tw-plan-cta-secondary'}`}>
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>)}

        {/* ── Comparison table ─────────────────────────────────────── */}
        <section className="tw-compare-section">
          <div className="tw-compare-inner">
            <div className="tw-section-eyebrow">Comparison</div>
            <h2 className="tw-section-title">TrackWealth vs alternatives</h2>
            <div className="tw-compare-table-wrap">
              <table className="tw-compare-table">
                <thead>
                  <tr>
                    {['Feature', 'TrackWealth', 'Copilot Money', 'Robinhood', 'Yahoo Finance'].map((h, i) => (
                      <th key={h} className={i === 1 ? 'tw-compare-th-accent' : 'tw-compare-th'}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['AI portfolio analysis', '✅ Advanced', '⚠️ Basic', '❌', '❌'],
                    ['Real-time prices', '✅ Free', '✅ Connected', '✅ Free', '✅ Free'],
                    ['No account required', '✅', '❌ Requires login', '❌ Login', '✅'],
                    ['Financial health score', '✅ Animated', '❌', '❌', '❌'],
                    ['Rebalancing signals', '✅ AI', '⚠️ Manual', '❌', '❌'],
                    ['Privacy (no brokerage link)', '✅ Manual entry', '❌ Bank sync', '❌ Full access', '✅'],
                    ['Cost', 'Free / $12 mo', '$95/yr', 'Free', 'Free'],
                  ].map(row => (
                    <tr key={row[0]} className="tw-compare-row">
                      {row.map((cell, i) => (
                        <td key={i} className={i === 1 ? 'tw-compare-td-accent' : 'tw-compare-td'}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </main>

      {showGate && (
        <RegisterGate
          freeUsed={gateCount} freeLimit={5} freeFeature="analyses"
          lockedFeature="unlimited portfolio analyses"
          accentColor="#22c55e" site="wealthpilot"
          onSuccess={onRegistered} onDismiss={dismissGate}
        />
      )}
      <GuidedTour steps={TOUR} storageKey="wealthpilot_tour_v2" accentColor="#22c55e" />
    </>
  )
}
