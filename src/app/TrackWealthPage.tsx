'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import WealthStats from '@/components/WealthStats'
import { useGate } from '@/lib/shared/useGate'
import RegisterGate from '@/lib/shared/RegisterGate'
import Hero from '@/components/Hero'
import { siteConfig } from '@/site.config'


// ─── Types ───────────────────────────────────────────────────────────────────
interface Holding { ticker: string; shares: string; buyPrice: string }
interface Result { ticker: string; shares: number; buy_price: number; current_price: number; current_value: number; gain_loss_pct: number; error?: string }
interface HistoryEntry { date: string; value: number; cost: number }
interface PortfolioResult { holdings: Result[]; total_value: number; total_cost: number; total_gain_loss_pct: number; insights?: string }
interface Alert { ticker: string; targetPrice: number; direction: 'above' | 'below'; triggered?: boolean }

// ─── Colour map ──────────────────────────────────────────────────────────────
const COLORS: Record<string, string> = {
  AAPL:'#34d399', MSFT:'#4ade80', GOOGL:'#86efac', AMZN:'#16a34a',
  TSLA:'#f87171', META:'#6ee7b7', NVDA:'#34d399', NFLX:'#a7f3d0',
  JPM:'#bbf7d0', default: '#34d399',
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
  const color = score >= 75 ? '#34d399' : score >= 50 ? '#f59e0b' : '#ef4444'
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
      <polyline points={pts.join(' ')} fill="none" stroke={up ? '#34d399' : '#f87171'} strokeWidth="1.5" strokeLinejoin="round" />
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
export default function TrackWealthPage(_props: { showPricing?: boolean }) {
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

        {/* ── Bloomberg Terminal Hero ───────────────────────────────── */}
        <Hero onPick={(q) => { setQuestion(q); document.getElementById('portfolio-form')?.scrollIntoView({ behavior: 'smooth' }) }} />

        {/* ── Main App ─────────────────────────────────────────────── */}
        <section id="portfolio-form" className="tw-app-section">
          <div className="tw-app-inner">
            <h2 className="tw-section-eyebrow">Analyze your portfolio</h2>

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
                <details className="tw-alerts-panel">
                  <summary className="tw-panel-head tw-summary">
                    <span className="tw-panel-title">Price Alerts</span>
                    {triggeredAlerts.length > 0 && (
                      <span className="tw-alert-badge">⚡ {triggeredAlerts.length} triggered</span>
                    )}
                  </summary>
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
                </details>
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

        {/* ── Pricing: one slim row ─────────────────────────────────── */}
        <section id="pricing" className="tw-price-row" aria-label="Pricing">
          {isPro ? (
            <div className="tw-pro-active-banner">⚡ Pro active — unlimited analyses</div>
          ) : (
            <>
              <p className="tw-price-text"><b>Free</b> $0: 3 analyses a day, live prices, AI insights, alerts. <b>Pro</b> $12/mo: unlimited analyses.</p>
              <button onClick={handleUpgrade} disabled={checkoutLoading} className="tw-plan-cta tw-plan-cta-primary btn-press tw-price-btn">
                {checkoutLoading ? 'Redirecting...' : 'Upgrade to Pro'}
              </button>
            </>
          )}
        </section>

      </main>

      {showGate && (
        <RegisterGate
          freeUsed={gateCount} freeLimit={5} freeFeature="analyses"
          lockedFeature="unlimited portfolio analyses"
          accentColor="#34d399" site="wealthpilot"
          onSuccess={onRegistered} onDismiss={dismissGate}
        />
      )}
          </>
  )
}
