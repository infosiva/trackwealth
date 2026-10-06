'use client'
import { useEffect, useState } from 'react'

// Rotating sample questions: each maps to what the real analysis returns (no invented numbers).
const SAMPLES: { q: string; a: string }[] = [
  { q: 'Am I too concentrated in tech stocks?', a: 'Sector weights vs. your holdings, flagged when one sector dominates.' },
  { q: 'Should I rebalance after this rally?', a: 'Which positions drifted furthest from an even split, and by how much.' },
  { q: 'How much would a 20% market drop hurt me?', a: 'A stress test on your own holdings, position by position.' },
  { q: 'Which holding is dragging my returns down?', a: 'Live P&L per position, ranked from best to worst.' },
  { q: 'Is my portfolio actually diversified?', a: 'A plain-English read on overlap, concentration and gaps.' },
  { q: "What's my biggest single-stock risk?", a: 'The one position that would hurt most if it fell, and why.' },
]
const TYPE_MS = 38
const HOLD_MS = 2400

export default function Hero({ onPick }: { onPick: (q: string) => void }) {
  const [i, setI] = useState(0)
  const [n, setN] = useState(SAMPLES[0].q.length)
  const [still, setStill] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setStill(mq.matches)
    if (mq.matches) return
    setN(0)
    const on = () => setStill(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  useEffect(() => {
    if (still) { setN(SAMPLES[i].q.length); return }
    const full = SAMPLES[i].q.length
    const t = n < full
      ? setTimeout(() => setN(n + 1), TYPE_MS)
      : setTimeout(() => { setI((i + 1) % SAMPLES.length); setN(0) }, HOLD_MS)
    return () => clearTimeout(t)
  }, [n, i, still])

  const s = SAMPLES[i]
  const done = n >= s.q.length

  return (
    <section className="tw-hero" aria-labelledby="tw-h1">
      <div className="tw-hero-inner">
        <div className="tw-hero-copy">
          <div className="tw-hero-badge"><span className="tw-hero-dot" /> Live prices · AI analysis · Free to start</div>
          <h1 id="tw-h1" className="tw-hero-h1">Ask your portfolio <span>anything.</span></h1>
          <p className="tw-hero-sub">Add your holdings, get live P&amp;L, risk and rebalancing advice in plain English.</p>
          <button type="button" className="tw-hero-cta" onClick={() => onPick(s.q)}>
            Analyse my portfolio
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </button>
        </div>

        <div className="tw-hero-demo" aria-live="off">
          <div className="tw-hero-demo-bar"><i /><i /><i /><b>Ask AI · example</b></div>
          <button type="button" className="tw-hero-q" onClick={() => onPick(s.q)} aria-label={`Use this question: ${s.q}`}>
            <span className="tw-hero-prompt">&gt;</span>
            <span>{s.q.slice(0, n)}</span>
            {!still && <span className="tw-hero-caret" aria-hidden="true" />}
          </button>
          <p key={i} className={`tw-hero-a${done || still ? ' on' : ''}`}>{s.a}</p>
          <svg className="tw-hero-spark" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,32 C40,30 60,20 100,22 S160,8 200,14 S270,26 310,12 S370,6 400,4" />
          </svg>
          <div className="tw-hero-chips" role="list">
            {SAMPLES.map((x, k) => (
              <button key={x.q} role="listitem" type="button" className={`tw-hero-chip${k === i ? ' active' : ''}`}
                onClick={() => onPick(x.q)}>{x.q}</button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
