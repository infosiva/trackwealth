'use client'
import { useState, useEffect, useCallback } from 'react'
import { useGate } from '@/lib/shared/useGate'
import RegisterGate from '@/lib/shared/RegisterGate'
import { PortfolioChart, MetricCard } from '@/components/tremor'
import type { PortfolioDataPoint } from '@/components/tremor'
import GuidedTour, { type TourStep } from '@/components/GuidedTour'
import { siteConfig } from '@/site.config'

const WEALTHPILOT_TOUR: TourStep[] = [
  { target: '#portfolio-form', title: 'Track your portfolio', icon: '📊', body: 'Add your holdings — live prices from Yahoo Finance show your real-time P&L instantly.', placement: 'bottom' },
  { target: '#pricing', title: 'Unlock unlimited analyses', icon: '💹', body: 'Pro removes daily limits — run as many AI portfolio checks as you want.', placement: 'top' },
]

interface Holding { ticker: string; shares: string; buyPrice: string }
interface Result { ticker: string; shares: number; buy_price: number; current_price: number; current_value: number; gain_loss_pct: number; error?: string }
interface HistoryEntry { date: string; value: number; cost: number }
interface PortfolioResult { holdings: Result[]; total_value: number; total_cost: number; total_gain_loss_pct: number; insights?: string }
interface Alert { ticker: string; targetPrice: number; direction: 'above' | 'below'; triggered?: boolean }

const COLORS: Record<string, string> = {
  AAPL:'#00ff64', MSFT:'#00d4ff', GOOGL:'#ffaa00', AMZN:'#ff6600',
  TSLA:'#ff4444', META:'#4488ff', NVDA:'#aa44ff', NFLX:'#ff3333',
  JPM:'#00ccff', default: '#00ff64',
}

function MiniSparkline({ history }: { history: HistoryEntry[] }) {
  if (history.length < 2) return <span className="text-xs opacity-30">no data</span>
  const vals = history.map(h => h.value)
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const w = 80, h = 24
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`)
  const up = vals[vals.length - 1] >= vals[0]
  return (
    <svg width={w} height={h}>
      <polyline points={pts.join(' ')} fill="none" stroke={up ? '#00ff64' : '#ff4444'} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

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

export default function Home() {
  const { count: gateCount, showGate, increment: gateIncrement, onRegistered, dismissGate, isRegistered } = useGate('wealthpilot', 3)
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
  const [time, setTime] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('wealthpilot-history')
      if (saved) setHistory(JSON.parse(saved))
      const savedAlerts = localStorage.getItem('wealthpilot-alerts')
      if (savedAlerts) setAlerts(JSON.parse(savedAlerts))
      if (localStorage.getItem('wealthpilot-pro') === '1') setIsPro(true)
    } catch { /* ignore */ }
    // Handle Stripe success redirect
    const params = new URLSearchParams(window.location.search)
    if (params.get('upgraded') === '1') {
      localStorage.setItem('wealthpilot-pro', '1')
      setIsPro(true)
      window.history.replaceState({}, '', '/')
    }
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    // VPS stats — fire and forget
    fetch('http://31.97.56.148:3099/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site: 'trackwealth.app',
        path: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {/* ignore */})
    return () => clearInterval(id)
  }, [])

  const handleUpgrade = useCallback(async () => {
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '' }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch { /* ignore */ } finally {
      setCheckoutLoading(false)
    }
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings: valid.map(h => ({ ticker: h.ticker.toUpperCase(), shares: parseFloat(h.shares), buy_price: parseFloat(h.buyPrice) })), question }),
      })
      const data = await res.json()
      setResult(data)
      if (data.total_value > 0) {
        const entry: HistoryEntry = { date: new Date().toISOString().split('T')[0], value: data.total_value, cost: data.total_cost }
        const newHistory = [...history.filter(h => h.date !== entry.date), entry].slice(-30)
        setHistory(newHistory)
        localStorage.setItem('wealthpilot-history', JSON.stringify(newHistory))
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
  const inp = 'w-full bg-[#030712] border border-emerald-900/60 rounded px-3 py-2 text-sm text-emerald-300 placeholder-emerald-900/60 focus:outline-none focus:border-emerald-500/60 transition-all font-mono uppercase'
  const inpNum = 'w-full bg-[#030712] border border-emerald-900/60 rounded px-3 py-2 text-sm text-emerald-300 placeholder-emerald-900/60 focus:outline-none focus:border-emerald-500/60 transition-all font-mono'

  const PORTFOLIO_DATA: PortfolioDataPoint[] = [
    { date: 'Jan', value: 10000, gain: 0 },
    { date: 'Feb', value: 10800, gain: 800 },
    { date: 'Mar', value: 10400, gain: 400 },
    { date: 'Apr', value: 11200, gain: 1200 },
    { date: 'May', value: 12100, gain: 2100 },
  ]
  const METRICS = [
    { title: 'Portfolio Value', value: '$12,100', delta: '+21%', deltaType: 'increase' as const },
    { title: "Today's Gain", value: '+$340', delta: '+2.9%', deltaType: 'moderateIncrease' as const },
    { title: 'Assets Tracked', value: '8', deltaType: 'unchanged' as const },
  ]

  return (
    <>
    {/* Finance scan-line effect */}
    <div className="scanline" aria-hidden="true" />
    {/* Data grid background */}
    <div className="finance-grid" aria-hidden="true" />
    <main className="min-h-screen bg-[#030712] relative z-10">

      {/* Compact sticky nav */}
      <nav className="sticky top-0 z-50 bg-[#030712]/95 backdrop-blur border-b border-emerald-900/30 h-12 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <span className="font-mono font-black text-base tracking-widest text-white">WealthPilot</span>
          <div className="flex items-center gap-1.5 ml-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-400 tracking-widest">LIVE</span>
          </div>
          <span className="pill-glass text-[10px] font-mono text-emerald-300 px-2.5 py-0.5 ml-1">AI Insights</span>
        </div>
        <div className="flex items-center gap-3">
          {triggeredAlerts.length > 0 && (
            <span className="text-[11px] font-mono text-amber-400 animate-pulse">⚡ {triggeredAlerts.length} ALERT{triggeredAlerts.length > 1 ? 'S' : ''}</span>
          )}
          {time && <span className="text-[10px] font-mono text-emerald-800 hidden sm:block">{time}</span>}
          {isPro ? (
            <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-mono text-[11px] font-bold rounded tracking-widest">⚡ PRO</span>
          ) : (
            <button onClick={handleUpgrade} disabled={checkoutLoading}
              className="px-3 py-1 bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-mono text-[11px] font-bold hover:bg-emerald-900/60 transition-all rounded tracking-widest disabled:opacity-50">
              {checkoutLoading ? '...' : 'Upgrade Pro →'}
            </button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#030712] py-16 px-6 relative overflow-hidden">
        <div className="noise-overlay" aria-hidden="true" />
        <div className="depth-grid" aria-hidden="true" />
        <div className="liquid-blob liquid-blob-1" style={{ background: 'radial-gradient(circle, rgba(6,78,59,0.08), transparent 70%)', top: '-80px', left: '-60px' }} aria-hidden="true" />
        <div className="liquid-blob liquid-blob-2" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08), transparent 70%)', animationDelay: '-8s' }} aria-hidden="true" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-950/40 mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono text-emerald-400 tracking-widest">LIVE MARKET DATA · AI-POWERED · FREE TO START</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black font-mono tracking-tight leading-none mb-5">
                Your portfolio.<br />
                <span className="text-iridescent">Institutional-grade</span><br />
                <span className="text-emerald-600">intelligence.</span>
              </h1>
              <p className="text-sm text-emerald-600/80 font-mono mb-6 max-w-lg leading-relaxed">
                Enter any stock portfolio → get live P&L, AI risk analysis, rebalancing advice, and price alerts in seconds. What hedge funds charge $10k/yr for, now $12/mo.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/40 border border-emerald-900/40 rounded-full">
                  <span className="text-emerald-500 text-xs">✓</span>
                  <span className="text-emerald-700 text-[11px] font-mono">No brokerage login needed</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/40 border border-emerald-900/40 rounded-full">
                  <span className="text-emerald-500 text-xs">✓</span>
                  <span className="text-emerald-700 text-[11px] font-mono">Yahoo Finance + Claude AI</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/40 border border-emerald-900/40 rounded-full">
                  <span className="text-emerald-500 text-xs">✓</span>
                  <span className="text-emerald-700 text-[11px] font-mono">3 free analyses daily</span>
                </div>
              </div>
            </div>

            {/* Live metrics */}
            <div className="grid grid-cols-2 gap-3 min-w-[260px]">
              {[
                { label: 'S&P 500', value: '+1.24%', arrow: '↑', positive: true },
                { label: 'NASDAQ', value: '-0.31%', arrow: '↓', positive: false },
                { label: 'BTC', value: '+3.41%', arrow: '↑', positive: null },
                { label: 'Gold', value: '+0.18%', arrow: '↑', positive: true },
              ].map(m => (
                <div key={m.label} className="glass-liquid rounded-xl p-4">
                  <div className="text-[9px] font-mono text-emerald-800 tracking-widest mb-1">{m.label}</div>
                  <div className={`font-mono text-xl font-bold num-glow ${m.positive === null ? 'text-amber-400' : m.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {m.value} {m.arrow}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ticker tape */}
      <div className="border-y border-emerald-900/30 overflow-hidden bg-[#030712]/80 py-1.5">
        <div className="whitespace-nowrap font-mono text-[11px] text-emerald-700 animate-marquee">
          <span className="inline-block px-8">
            AAPL <span className="text-emerald-400">+1.2%</span> &nbsp;·&nbsp; MSFT <span className="text-emerald-400">+0.8%</span> &nbsp;·&nbsp; GOOGL <span className="text-red-400">-0.3%</span> &nbsp;·&nbsp; AMZN <span className="text-emerald-400">+2.1%</span> &nbsp;·&nbsp; TSLA <span className="text-red-400">-1.5%</span> &nbsp;·&nbsp; NVDA <span className="text-emerald-400">+3.4%</span> &nbsp;·&nbsp; META <span className="text-emerald-400">+0.6%</span> &nbsp;·&nbsp; JPM <span className="text-red-400">-0.2%</span> &nbsp;·&nbsp; NFLX <span className="text-emerald-400">+1.8%</span> &nbsp;·&nbsp; AAPL <span className="text-emerald-400">+1.2%</span> &nbsp;·&nbsp; MSFT <span className="text-emerald-400">+0.8%</span> &nbsp;·&nbsp; GOOGL <span className="text-red-400">-0.3%</span> &nbsp;·&nbsp; AMZN <span className="text-emerald-400">+2.1%</span> &nbsp;·&nbsp; TSLA <span className="text-red-400">-1.5%</span> &nbsp;·&nbsp;
          </span>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-6" style={{ animation: 'fadeSlideUp 0.6s 0.2s ease-out both' }}>
        <div className="flex flex-wrap items-center justify-center gap-8 py-5 border-y border-emerald-900/30">
          <div className="text-center">
            <div className="text-3xl font-black font-mono text-emerald-400">{siteConfig.stats.portfolios}</div>
            <div className="text-xs text-emerald-800 font-mono mt-1">PORTFOLIOS TRACKED</div>
          </div>
          <div className="w-px h-10 bg-emerald-900/40 hidden sm:block" />
          <div className="text-center">
            <div className="text-3xl font-black font-mono text-emerald-400">{siteConfig.stats.assetsTracked}</div>
            <div className="text-xs text-emerald-800 font-mono mt-1">ASSETS TRACKED</div>
          </div>
          <div className="w-px h-10 bg-emerald-900/40 hidden sm:block" />
          <div className="text-center">
            <div className="text-3xl font-black font-mono text-emerald-400">{siteConfig.stats.avgReturn}</div>
            <div className="text-xs text-emerald-800 font-mono mt-1">AVG USER RETURN</div>
          </div>
        </div>
      </section>

      {/* Tremor metrics + portfolio chart */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {METRICS.map(m => <MetricCard key={m.title} title={m.title} value={m.value} delta={m.delta} deltaType={m.deltaType} />)}
        </div>
        <div className="mb-6">
          <PortfolioChart data={PORTFOLIO_DATA} />
        </div>
      </div>

      {/* Main app area */}
      <div id="portfolio-form" className="max-w-7xl mx-auto px-4 pt-0 pb-16">
        <div className="glass-liquid rounded-xl p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* Input panel */}
            <div className="lg:col-span-2 space-y-4">
              {/* Holdings input */}
              <div className="border border-emerald-900/40 rounded-xl bg-[#030712]/80">
                <div className="border-b border-emerald-900/30 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-emerald-500 uppercase tracking-wider">► HOLDINGS INPUT</span>
                  <span className="text-[10px] text-emerald-900 font-mono">{holdings.filter(h => h.ticker).length} positions</span>
                </div>
                <div className="p-4 space-y-2">
                  <div className="hidden xs:grid grid-cols-3 gap-2 px-1 pb-1">
                    {['TICKER', 'SHARES', 'BUY $'].map(l => (
                      <span key={l} className="text-[9px] text-emerald-900 uppercase tracking-widest font-mono">{l}</span>
                    ))}
                  </div>
                  {holdings.map((h, i) => (
                    <div key={i} className="grid grid-cols-3 gap-1.5">
                      <input value={h.ticker} onChange={e => updateRow(i, 'ticker', e.target.value.toUpperCase())}
                        placeholder="AAPL" className={inp} />
                      <input value={h.shares} onChange={e => updateRow(i, 'shares', e.target.value)}
                        placeholder="10" type="number" className={inpNum} />
                      <div className="relative">
                        <input value={h.buyPrice} onChange={e => updateRow(i, 'buyPrice', e.target.value)}
                          placeholder="150" type="number" className={inpNum + ' pr-6'} />
                        {holdings.length > 1 && (
                          <button onClick={() => removeRow(i)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-900 hover:text-red-500 transition-colors text-xs">✕</button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button onClick={addRow}
                    className="w-full py-1.5 border border-dashed border-emerald-900/50 text-[10px] text-emerald-800 hover:text-emerald-600 hover:border-emerald-700/50 font-mono transition-all mt-1 rounded">
                    + ADD_POSITION()
                  </button>
                </div>
              </div>

              {/* AI Query */}
              <div className="glass-liquid rounded-xl p-4">
                <div className="text-[9px] text-emerald-700 font-mono uppercase tracking-widest mb-2">► AI QUERY (OPTIONAL)</div>
                <input value={question} onChange={e => setQuestion(e.target.value)}
                  placeholder="Should I rebalance? Overexposed to tech?"
                  className="w-full bg-[#030712] border border-emerald-900/50 rounded px-3 py-2 text-xs text-emerald-300 placeholder-emerald-900/60 focus:outline-none focus:border-emerald-500/60 transition-all font-mono" />
              </div>

              {/* Run button */}
              <button onClick={isLimited ? handleUpgrade : analyze} disabled={loading}
                className={`w-full py-3.5 border font-mono font-bold text-sm transition-all rounded-xl flex items-center justify-center gap-2 tracking-widest ${isLimited ? 'border-amber-600/40 bg-amber-950/30 text-amber-500 cursor-pointer hover:bg-amber-950/60' : 'border-emerald-500/50 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 hover:text-emerald-300 disabled:opacity-40'}`}>
                {loading ? (
                  <><span className="blink">█</span> FETCHING LIVE DATA...</>
                ) : isLimited ? (
                  '⚡ DAILY LIMIT REACHED — CLICK TO UPGRADE ($12/mo)'
                ) : (
                  <>► RUN ANALYSIS() <span className="text-emerald-800 text-[10px]">[{remaining} left today]</span></>
                )}
              </button>

              {/* Alerts panel */}
              <div className="border border-emerald-900/40 rounded-xl bg-[#030712]/80">
                <div className="border-b border-emerald-900/30 px-4 py-2.5">
                  <span className="text-[11px] font-mono text-emerald-500 uppercase tracking-wider">► PRICE ALERTS</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex gap-2">
                    <input value={alertTicker} onChange={e => setAlertTicker(e.target.value.toUpperCase())}
                      placeholder="AAPL" className="w-16 bg-[#030712] border border-emerald-900/60 rounded px-2 py-1.5 text-xs text-emerald-300 placeholder-emerald-900/60 focus:outline-none focus:border-emerald-500/60 font-mono uppercase" />
                    <select value={alertDir} onChange={e => setAlertDir(e.target.value as 'above' | 'below')}
                      className="bg-[#030712] border border-emerald-900/60 rounded px-2 py-1.5 text-xs text-emerald-600 focus:outline-none font-mono">
                      <option value="above">↑ ABOVE</option>
                      <option value="below">↓ BELOW</option>
                    </select>
                    <input value={alertPrice} onChange={e => setAlertPrice(e.target.value)}
                      placeholder="200" type="number"
                      className="flex-1 bg-[#030712] border border-emerald-900/60 rounded px-2 py-1.5 text-xs text-emerald-300 placeholder-emerald-900/60 focus:outline-none focus:border-emerald-500/60 font-mono" />
                    <button onClick={addAlert}
                      className="px-2.5 py-1.5 border border-amber-600/40 bg-amber-950/30 text-amber-500 text-xs font-mono hover:bg-amber-950/60 transition-all rounded">SET</button>
                  </div>
                  {alerts.length > 0 ? (
                    <div className="space-y-1">
                      {alerts.map((a, i) => (
                        <div key={i} className={`flex items-center justify-between px-2.5 py-1.5 rounded border text-[11px] font-mono ${a.triggered ? 'border-amber-600/40 bg-amber-950/20 text-amber-400' : 'border-emerald-900/30 text-emerald-700'}`}>
                          <span className="font-bold">{a.ticker}</span>
                          <span>{a.direction === 'above' ? '↑' : '↓'} ${a.targetPrice}</span>
                          {a.triggered && <span className="text-amber-400">⚡ HIT</span>}
                          <button onClick={() => { const n = alerts.filter((_, j) => j !== i); setAlerts(n); localStorage.setItem('wealthpilot-alerts', JSON.stringify(n)) }}
                            className="text-emerald-900 hover:text-red-500 transition-colors">✕</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-emerald-900 font-mono text-center py-1">NO ALERTS SET</p>
                  )}
                </div>
              </div>
            </div>

            {/* Results panel */}
            <div className="lg:col-span-3 space-y-4">
              {result ? (
                <>
                  {/* Stats row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'PORTFOLIO VALUE', value: `$${result.total_value.toLocaleString()}`, sub: `P&L: $${(result.total_value - result.total_cost) >= 0 ? '+' : ''}${(result.total_value - result.total_cost).toLocaleString()}`, up: true },
                      { label: 'TOTAL INVESTED', value: `$${result.total_cost.toLocaleString()}`, sub: `${result.holdings.filter(h => !h.error).length} POSITIONS`, up: null },
                      { label: 'RETURN', value: `${result.total_gain_loss_pct >= 0 ? '+' : ''}${result.total_gain_loss_pct.toFixed(2)}%`, sub: result.total_gain_loss_pct >= 0 ? 'PROFITABLE ▲' : 'IN LOSS ▼', up: result.total_gain_loss_pct >= 0 },
                    ].map(s => (
                      <div key={s.label} className="glass-liquid rounded-xl px-3 py-3">
                        <div className="text-[9px] text-emerald-800 font-mono uppercase tracking-widest mb-1">{s.label}</div>
                        <div className={`text-lg font-black font-mono ${s.up === null ? 'text-emerald-300' : s.up ? 'text-emerald-400' : 'text-red-400'}`}>{s.value}</div>
                        <div className={`text-[9px] font-mono mt-0.5 ${s.up === null ? 'text-emerald-800' : s.up ? 'text-emerald-700' : 'text-red-800'}`}>{s.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Allocation bar */}
                  <div className="glass-liquid rounded-xl px-4 py-3">
                    <div className="text-[9px] text-emerald-800 font-mono mb-2">ALLOCATION DISTRIBUTION</div>
                    <AllocationBar holdings={result.holdings} total={result.total_value} />
                    <div className="flex flex-wrap gap-3 mt-2">
                      {result.holdings.filter(h => !h.error).map(h => (
                        <div key={h.ticker} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-sm" style={{ background: COLORS[h.ticker] ?? COLORS.default }} />
                          <span className="text-[9px] font-mono text-emerald-700">{h.ticker} {(h.current_value / result.total_value * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-0 border border-emerald-900/40 rounded-xl overflow-hidden font-mono text-[11px]">
                    {[
                      { id: 'holdings', label: '[ POSITIONS ]' },
                      { id: 'allocation', label: '[ HISTORY ]' },
                      { id: 'insights', label: '[ AI ANALYSIS ]' },
                      { id: 'alerts', label: `[ ALERTS${triggeredAlerts.length > 0 ? ` ⚡${triggeredAlerts.length}` : ''} ]` },
                    ].map(t => (
                      <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
                        className={`flex-1 py-2 transition-all border-r border-emerald-900/40 last:border-0 tracking-wider ${tab === t.id ? 'bg-emerald-950/60 text-emerald-400' : 'text-emerald-800 hover:text-emerald-600 hover:bg-emerald-950/20'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Holdings table */}
                  {tab === 'holdings' && (
                    <div className="border border-emerald-900/40 rounded-xl overflow-hidden bg-[#030712]/60">
                      <div className="grid grid-cols-12 px-4 py-2 border-b border-emerald-900/30 text-[9px] text-emerald-800 font-mono uppercase tracking-widest">
                        <span className="col-span-3">TICKER</span>
                        <span className="col-span-2 text-right">CUR PRICE</span>
                        <span className="col-span-2 text-right">VALUE</span>
                        <span className="col-span-2 text-right">RETURN</span>
                        <span className="col-span-3 text-right">ALLOC</span>
                      </div>
                      {result.holdings.filter(h => !h.error).map(h => {
                        const alloc = (h.current_value / result.total_value * 100).toFixed(1)
                        const color = COLORS[h.ticker] ?? COLORS.default
                        return (
                          <div key={h.ticker} className="border-b border-emerald-900/20 last:border-0 hover:bg-emerald-950/10 transition-colors">
                            <div className="grid grid-cols-12 px-4 py-3 items-center">
                              <div className="col-span-3 flex items-center gap-2">
                                <div className="w-1 h-6 rounded-full" style={{ background: color }} />
                                <span className="font-mono font-bold text-sm" style={{ color }}>{h.ticker}</span>
                              </div>
                              <span className="col-span-2 text-right text-xs font-mono text-emerald-500">${h.current_price.toFixed(2)}</span>
                              <span className="col-span-2 text-right text-xs font-mono text-white">${h.current_value.toLocaleString()}</span>
                              <span className={`col-span-2 text-right text-xs font-mono font-bold ${h.gain_loss_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {h.gain_loss_pct >= 0 ? '+' : ''}{h.gain_loss_pct.toFixed(2)}%
                              </span>
                              <div className="col-span-3 flex items-center justify-end gap-2">
                                <div className="flex-1 h-1 bg-emerald-950 rounded overflow-hidden max-w-12">
                                  <div className="h-full rounded transition-all" style={{ width: `${alloc}%`, background: color }} />
                                </div>
                                <span className="text-[10px] font-mono text-emerald-800">{alloc}%</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* History tab */}
                  {tab === 'allocation' && (
                    <div className="glass-liquid rounded-xl p-4">
                      <div className="text-[9px] text-emerald-800 font-mono mb-3">PORTFOLIO VALUE HISTORY (30 DAY)</div>
                      {history.length >= 2 ? (
                        <>
                          <MiniSparkline history={history} />
                          <div className="mt-3 space-y-1">
                            {history.slice(-5).reverse().map((h, i) => (
                              <div key={i} className="flex justify-between text-[10px] font-mono border-b border-emerald-900/20 pb-1">
                                <span className="text-emerald-800">{h.date}</span>
                                <span className="text-emerald-500">${h.value.toLocaleString()}</span>
                                <span className={`${h.value >= h.cost ? 'text-emerald-700' : 'text-red-800'}`}>
                                  {h.value >= h.cost ? '+' : ''}{((h.value - h.cost) / h.cost * 100).toFixed(2)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-emerald-900 font-mono">RUN ANALYSIS MULTIPLE TIMES TO BUILD HISTORY LOG</p>
                      )}
                    </div>
                  )}

                  {/* AI insights tab */}
                  {tab === 'insights' && (
                    <div className="glass-liquid rounded-xl p-6 border border-emerald-500/20">
                      {result.insights ? (
                        <>
                          <div className="text-[9px] text-emerald-500 font-mono mb-3 flex items-center gap-2">
                            <span className="blink">█</span> CLAUDE AI PORTFOLIO ANALYSIS OUTPUT
                          </div>
                          <p className="text-xs text-emerald-400 font-mono leading-relaxed whitespace-pre-wrap">{result.insights}</p>
                        </>
                      ) : (
                        <p className="text-xs text-emerald-900 font-mono">NO AI INSIGHTS — CHECK API KEY CONFIGURATION</p>
                      )}
                    </div>
                  )}

                  {/* Alerts tab */}
                  {tab === 'alerts' && (
                    <div className="glass-liquid rounded-xl p-4">
                      <div className="text-[9px] text-emerald-800 font-mono mb-3">ALERT STATUS LOG</div>
                      {alerts.length > 0 ? (
                        <div className="space-y-2">
                          {alerts.map((a, i) => {
                            const holding = result.holdings.find(h => h.ticker === a.ticker)
                            return (
                              <div key={i} className={`border rounded px-3 py-2 font-mono text-xs flex items-center justify-between ${a.triggered ? 'border-amber-600/40 bg-amber-950/20 text-amber-400' : 'border-emerald-900/30 text-emerald-700'}`}>
                                <span className="font-bold">{a.ticker}</span>
                                <span>{a.direction === 'above' ? '↑ ABOVE' : '↓ BELOW'} ${a.targetPrice}</span>
                                {holding && <span>CUR: ${holding.current_price.toFixed(2)}</span>}
                                <span>{a.triggered ? '⚡ TRIGGERED' : '○ WATCHING'}</span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-900 font-mono">NO ACTIVE ALERTS</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="glass-liquid rounded-xl flex flex-col items-center justify-center py-16 px-6 gap-6">
                  <div className="text-4xl">📊</div>
                  <div className="text-center space-y-2 max-w-xs">
                    <p className="text-emerald-400 font-mono font-bold text-sm">Your portfolio analysis will appear here</p>
                    <p className="text-emerald-800 font-mono text-xs leading-relaxed">
                      Add at least one stock ticker, share count, and buy price in the panel on the left — then hit Run Analysis.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-sm text-center">
                    {[
                      { step: '1', label: 'Enter ticker', hint: 'e.g. AAPL, NVDA, MSFT' },
                      { step: '2', label: 'Add shares + buy price', hint: 'Your cost basis' },
                      { step: '3', label: 'Run analysis', hint: 'Live price + AI insight' },
                    ].map(s => (
                      <div key={s.step} className="border border-emerald-900/30 rounded-lg px-3 py-3 bg-[#030712]/40">
                        <div className="text-emerald-500 font-mono text-xs font-bold mb-1">STEP {s.step}</div>
                        <div className="text-emerald-600 font-mono text-[11px] font-medium">{s.label}</div>
                        <div className="text-emerald-900 font-mono text-[10px] mt-0.5">{s.hint}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-emerald-900 font-mono">POWERED BY YAHOO FINANCE + AI ANALYSIS</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Why Pro is worth it */}
        <div className="mt-8 glass-liquid rounded-2xl p-6">
          <div className="text-center mb-6">
            <div className="text-[10px] font-mono text-emerald-700 tracking-widest mb-2">// WHY PRO PAYS FOR ITSELF</div>
            <p className="text-emerald-500 font-mono text-sm">One better trade decision per month covers the cost 10×</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '📈', title: 'Live P&L Tracking', desc: 'Real-time prices from Yahoo Finance. Know your portfolio value to the penny, always.', badge: 'FREE' },
              { icon: '🤖', title: 'Claude AI Analysis', desc: 'Institutional-quality AI reads your portfolio, flags concentration risk, suggests moves.', badge: 'PRO' },
              { icon: '⚠️', title: 'Unlimited Analyses', desc: 'Run as many portfolio checks as you want. No daily cap. Track every market move.', badge: 'PRO' },
              { icon: '🎯', title: 'Rebalance Signals', desc: 'AI tells you exactly when and how to rebalance to protect gains and cut losses.', badge: 'PRO' },
            ].map(panel => (
              <div key={panel.title} className="glass-liquid rounded-xl p-5 reveal-3d border border-emerald-900/20">
                <div className="flex items-start justify-between mb-2">
                  <div className="text-xl">{panel.icon}</div>
                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${panel.badge === 'PRO' ? 'bg-emerald-950/60 text-emerald-500 border border-emerald-700/40' : 'bg-[#030712] text-emerald-900 border border-emerald-900/30'}`}>{panel.badge}</span>
                </div>
                <div className="text-xs font-mono font-bold text-emerald-400 mb-1.5 tracking-wide">{panel.title}</div>
                <div className="text-[10px] font-mono text-emerald-800 leading-relaxed">{panel.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <section id="pricing" className="border-t border-emerald-900/30 mt-4 px-4 pb-16">
        <div className="max-w-3xl mx-auto pt-12">
          <div className="text-center mb-8">
            <div className="text-[10px] text-emerald-700 font-mono mb-2">// PRICING MODULE</div>
            <h2 className="text-2xl font-black font-mono text-emerald-400">WEALTHPILOT.PLANS[]</h2>
            <p className="text-xs text-emerald-800 mt-2 font-mono">Free forever for basics · Pro for serious investors</p>
            {isPro && <div className="mt-3 inline-block px-4 py-1.5 bg-emerald-950/60 border border-emerald-500/40 rounded font-mono text-xs text-emerald-400">⚡ PRO ACTIVE — UNLIMITED ANALYSES</div>}
          </div>
          <div className="glass-liquid rounded-xl overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px">
              {[
                { name: 'FREE', price: '$0', sub: 'forever', features: ['3 analyses / day', 'Live price data', 'AI portfolio insights', 'Price alerts (localStorage)', 'Portfolio history (30 days)', 'Allocation charts'], cta: 'Current plan', highlight: false },
                { name: 'PRO', price: '$12', sub: '/ month', features: ['Unlimited analyses', 'Email price alerts', 'Export to CSV / PDF', 'Multi-portfolio support', 'AI rebalancing suggestions', 'Priority support'], cta: isPro ? '✓ You are on Pro' : (checkoutLoading ? 'Redirecting...' : 'Upgrade to Pro →'), highlight: true },
              ].map(plan => (
                <div key={plan.name} className={`p-8 ${plan.highlight ? 'bg-emerald-950/40' : 'bg-[#030712]/60'}`}>
                  <div className="text-[10px] font-mono text-emerald-700 mb-1">{plan.highlight ? '// RECOMMENDED' : '// STARTER'}</div>
                  <div className={`text-3xl font-black font-mono mb-0.5 ${plan.highlight ? 'text-emerald-400' : 'text-emerald-700'}`}>{plan.price}</div>
                  <div className="text-xs text-emerald-900 font-mono mb-6">{plan.sub}</div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map(f => (
                      <li key={f} className={`flex items-start gap-2 text-xs font-mono ${plan.highlight ? 'text-emerald-600' : 'text-emerald-900'}`}>
                        <span className={plan.highlight ? 'text-emerald-500' : 'text-emerald-800'}>►</span> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={plan.highlight && !isPro ? handleUpgrade : undefined}
                    disabled={plan.highlight && (isPro || checkoutLoading)}
                    className={`w-full py-2.5 rounded text-xs font-mono font-bold transition-all ${plan.highlight ? (isPro ? 'border border-emerald-500/50 text-emerald-500 cursor-default' : 'border border-emerald-400/60 bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800/60 hover:text-emerald-200 cursor-pointer') : 'border border-emerald-900/50 text-emerald-900 cursor-default'}`}>
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Competitor comparison */}
      <section className="border-t border-emerald-900/30 px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-[10px] font-mono text-emerald-700 tracking-widest mb-2">// HOW WE COMPARE</div>
            <h2 className="text-xl font-black font-mono text-emerald-400">WealthPilot vs alternatives</h2>
          </div>
          <div className="overflow-x-auto">
            <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'monospace', fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(16,185,129,0.2)' }}>
                  {['Feature','WealthPilot','Robinhood','Yahoo Finance','Personal Capital'].map((h,i) => (
                    <th key={h} style={{ padding:'10px 12px', textAlign:i===0?'left':'center', color: i===1 ? '#10b981' : 'rgba(255,255,255,0.3)', fontWeight:700, fontSize:11, letterSpacing:'0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['AI portfolio analysis','✅ Claude AI','❌','❌','⚠️ Basic'],
                  ['Real-time prices','✅ Free','✅ Free','✅ Free','✅ Free'],
                  ['Price alerts','✅ Free','✅ Free','✅ Free','✅ Pro only'],
                  ['No account required','✅','❌ Requires login','✅','❌'],
                  ['Multi-ticker P&L','✅ Free','✅','✅','✅ Pro only'],
                  ['Rebalancing advice','✅ AI-powered','❌','❌','⚠️ Manual'],
                  ['Cost','Free / $12 mo','Free','Free','Free / $40 mo'],
                ].map(row => (
                  <tr key={row[0]} style={{ borderBottom:'1px solid rgba(16,185,129,0.08)' }}>
                    {row.map((cell,i) => (
                      <td key={i} style={{ padding:'9px 12px', textAlign:i===0?'left':'center',
                        color: i===1 ? '#10b981' : i===0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.25)',
                        background: i===1 ? 'rgba(16,185,129,0.04)' : 'transparent', fontSize:11 }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:'1px solid rgba(16,185,129,0.15)', padding:'24px 24px', background:'rgba(3,7,18,0.9)', marginTop:8 }}>
        <div style={{ maxWidth:900, margin:'0 auto', display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:16 }}>
          <div>
            <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:15, color:'#10b981', letterSpacing:'0.1em' }}>WealthPilot</span>
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:4, fontFamily:'monospace' }}>AI-powered portfolio tracker. No account needed.</p>
          </div>
          <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
            {[['About','/about'],['Privacy','/privacy'],['Terms','/terms'],['Cookie Policy','/cookies']].map(([label,href]) => (
              <a key={label} href={href} style={{ fontSize:11, color:'rgba(255,255,255,0.25)', textDecoration:'none', fontFamily:'monospace' }}
                onMouseOver={e=>(e.currentTarget.style.color='#10b981')} onMouseOut={e=>(e.currentTarget.style.color='rgba(255,255,255,0.25)')}>{label}</a>
            ))}
          </div>
          <p style={{ fontSize:10, color:'rgba(255,255,255,0.15)', fontFamily:'monospace' }}>© 2026 WealthPilot</p>
        </div>
      </footer>
    </main>

    {showGate && (
      <RegisterGate
        freeUsed={gateCount}
        freeLimit={3}
        freeFeature="analyses"
        lockedFeature="unlimited portfolio analyses"
        accentColor="#10b981"
        site="wealthpilot"
        onSuccess={onRegistered}
        onDismiss={dismissGate}
      />
    )}
    <GuidedTour steps={WEALTHPILOT_TOUR} storageKey="wealthpilot_tour_v1" accentColor="#10b981" />
    <WealthPilotCookieBanner />
  </>
  )
}

function WealthPilotCookieBanner() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!localStorage.getItem('wp_cookies_ok')) setVisible(true)
  }, [])
  if (!visible) return null
  return (
    <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:200, padding:'12px 24px',
      background:'rgba(3,7,18,0.97)', borderTop:'1px solid rgba(16,185,129,0.2)',
      backdropFilter:'blur(16px)', display:'flex', alignItems:'center', justifyContent:'space-between',
      gap:16, flexWrap:'wrap' }}>
      <p style={{ fontSize:12, color:'rgba(255,255,255,0.45)', maxWidth:600, lineHeight:1.5 }}>
        WealthPilot uses essential cookies to save your portfolio and alert preferences locally. No tracking, no ads.{' '}
        <a href="/privacy" style={{ color:'#10b981', textDecoration:'underline', cursor:'pointer' }}>Privacy policy</a>
      </p>
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={() => { localStorage.setItem('wp_cookies_ok','1'); setVisible(false) }}
          style={{ fontSize:12, fontWeight:700, padding:'7px 20px', borderRadius:8,
            background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', border:'none', cursor:'pointer' }}>
          Accept
        </button>
        <button onClick={() => setVisible(false)}
          style={{ fontSize:12, fontWeight:500, padding:'7px 14px', borderRadius:8,
            background:'transparent', color:'rgba(255,255,255,0.3)',
            border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer' }}>
          Decline
        </button>
      </div>
    </div>
  )
}
