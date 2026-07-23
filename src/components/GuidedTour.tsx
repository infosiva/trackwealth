'use client'
/**
 * GuidedTour — first-visit product walkthrough
 *
 * Usage:
 *   import GuidedTour, { TourStep } from '@/components/GuidedTour'
 *
 *   const STEPS: TourStep[] = [
 *     { target: '#nl-input',   title: 'Quick Log',    body: 'Type your day in plain English.',  placement: 'bottom' },
 *     { target: '#save-btn',   title: 'Save & Recap', body: 'AI writes your daily summary.',    placement: 'top'    },
 *   ]
 *
 *   <GuidedTour steps={STEPS} storageKey="myvitals_tour_v1" accentColor="#34d399" />
 *
 * storageKey — change the suffix (v1→v2) to re-show after a major update.
 * accentColor — brand colour for the highlight ring + buttons.
 * delay       — ms before tour starts (default 1200, lets page settle).
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface TourStep {
  target: string          // CSS selector for the element to spotlight
  title: string
  body: string
  icon?: string           // emoji or short text shown as visual (e.g. '✨', '📊')
  placement?: 'top' | 'bottom' | 'left' | 'right'  // tooltip side (default: auto)
}

interface Props {
  steps: TourStep[]
  storageKey: string
  accentColor?: string
  delay?: number
}

const TOOLTIP_W = 300
const TOOLTIP_H = 160  // approximate — used for placement calc
const PAD       = 12   // gap between target and tooltip
const RING      = 8    // spotlight ring padding

export default function GuidedTour({
  steps,
  storageKey,
  accentColor = '#34d399',
  delay = 1200,
}: Props) {
  const [active, setActive]   = useState(false)
  const [idx, setIdx]         = useState(0)
  const [rect, setRect]       = useState<DOMRect | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const [placement, setPlacement]   = useState<'top'|'bottom'|'left'|'right'>('bottom')
  const rafRef = useRef<number | null>(null)

  // Start tour if not already done
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(storageKey)) return
    const t = setTimeout(() => setActive(true), delay)
    return () => clearTimeout(t)
  }, [storageKey, delay])

  // Keyboard nav
  useEffect(() => {
    if (!active) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss()
      if (e.key === 'ArrowRight' || e.key === 'Enter') advance()
      if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Measure target element — runs every time idx changes, and on resize
  useLayoutEffect(() => {
    if (!active) return
    function measure() {
      const step = steps[idx]
      if (!step) return
      const el = document.querySelector(step.target) as HTMLElement | null
      if (!el) { setRect(null); return }

      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const r = el.getBoundingClientRect()
      setRect(r)
      computeTooltip(r, step.placement)
    }

    // slight delay so scrollIntoView settles
    const t = setTimeout(measure, 120)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [active, idx, steps])

  function computeTooltip(r: DOMRect, preferred?: string) {
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Auto-pick placement if not specified
    let p = preferred as 'top'|'bottom'|'left'|'right'
    if (!p) {
      const spaceBelow = vh - r.bottom
      const spaceAbove = r.top
      p = spaceBelow >= TOOLTIP_H + PAD + 20 ? 'bottom'
        : spaceAbove >= TOOLTIP_H + PAD + 20 ? 'top'
        : r.left > vw / 2 ? 'left' : 'right'
    }
    setPlacement(p)

    let top = 0, left = 0
    if (p === 'bottom') {
      top  = r.bottom + PAD
      left = Math.min(Math.max(r.left + r.width / 2 - TOOLTIP_W / 2, 8), vw - TOOLTIP_W - 8)
    } else if (p === 'top') {
      top  = r.top - TOOLTIP_H - PAD
      left = Math.min(Math.max(r.left + r.width / 2 - TOOLTIP_W / 2, 8), vw - TOOLTIP_W - 8)
    } else if (p === 'right') {
      top  = r.top + r.height / 2 - TOOLTIP_H / 2
      left = Math.min(r.right + PAD, vw - TOOLTIP_W - 8)
    } else {
      top  = r.top + r.height / 2 - TOOLTIP_H / 2
      left = r.left - TOOLTIP_W - PAD
    }
    setTooltipPos({ top: Math.max(8, top), left: Math.min(Math.max(8, left), vw - TOOLTIP_W - 8) })
  }

  function advance() {
    if (idx < steps.length - 1) setIdx(i => i + 1)
    else finish()
  }
  function back() { if (idx > 0) setIdx(i => i - 1) }
  function finish() { localStorage.setItem(storageKey, '1'); setActive(false) }
  function dismiss() { finish() }

  if (!active) return null

  const step = steps[idx]
  const progress = `${idx + 1} / ${steps.length}`

  // Spotlight box: padded rect around target
  const spot = rect ? {
    top:    rect.top    - RING,
    left:   rect.left   - RING,
    width:  rect.width  + RING * 2,
    height: rect.height + RING * 2,
    radius: 12,
  } : null

  // Arrow position for the tooltip bubble
  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    width: 0, height: 0,
    borderStyle: 'solid',
    ...(placement === 'bottom' ? {
      top: -8, left: TOOLTIP_W / 2 - 8,
      borderWidth: '0 8px 8px 8px',
      borderColor: `transparent transparent ${accentColor}22 transparent`,
    } : placement === 'top' ? {
      bottom: -8, left: TOOLTIP_W / 2 - 8,
      borderWidth: '8px 8px 0 8px',
      borderColor: `${accentColor}22 transparent transparent transparent`,
    } : placement === 'right' ? {
      left: -8, top: 24,
      borderWidth: '8px 8px 8px 0',
      borderColor: `transparent ${accentColor}22 transparent transparent`,
    } : {
      right: -8, top: 24,
      borderWidth: '8px 0 8px 8px',
      borderColor: `transparent transparent transparent ${accentColor}22`,
    }),
  }

  return (
    <>
      <style>{`
        @keyframes tour-in  { from { opacity:0; transform:scale(0.93) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes tour-spot { from { opacity:0; } to { opacity:1; } }
        @keyframes tour-float { 0%,100%{transform:translateY(0) scale(1);} 50%{transform:translateY(-6px) scale(1.05);} }
        @keyframes tour-orb1 { 0%,100%{transform:translate(0,0);} 50%{transform:translate(18px,-12px);} }
        @keyframes tour-orb2 { 0%,100%{transform:translate(0,0);} 50%{transform:translate(-14px,10px);} }
        @keyframes tour-ping { 0%{transform:scale(1);opacity:1} 70%,100%{transform:scale(2.2);opacity:0} }
        .tour-tooltip { animation: tour-in 0.28s cubic-bezier(0.4,0,0.2,1) both; }
        .tour-spot    { animation: tour-spot 0.3s ease both; }
        .tour-icon    { animation: tour-float 3s ease-in-out infinite; }
        .tour-orb1    { animation: tour-orb1 6s ease-in-out infinite; }
        .tour-orb2    { animation: tour-orb2 8s ease-in-out infinite; }
      `}</style>

      {/* Dark overlay with spotlight hole */}
      <div
        onClick={dismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      />

      {/* Spotlight ring */}
      {spot && (
        <div
          className="tour-spot"
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', zIndex: 9999, pointerEvents: 'none',
            top:  spot.top,
            left: spot.left,
            width:  spot.width,
            height: spot.height,
            borderRadius: spot.radius,
            boxShadow: `0 0 0 9999px rgba(0,0,0,0.72), 0 0 0 3px ${accentColor}`,
            background: 'transparent',
          }}
        />
      )}

      {/* Tooltip bubble */}
      <div
        className="tour-tooltip"
        style={{
          position: 'fixed',
          top:  tooltipPos.top,
          left: tooltipPos.left,
          width: TOOLTIP_W,
          zIndex: 10000,
          background: 'rgba(8,10,18,0.97)',
          border: `1px solid ${accentColor}28`,
          borderRadius: 20,
          padding: '0 0 16px',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px ${accentColor}12`,
          overflow: 'hidden',
        }}
      >
        <div style={arrowStyle} />

        {/* Animated hero area */}
        {step.icon && (
          <div style={{ position: 'relative', height: 90, overflow: 'hidden', background: `radial-gradient(ellipse at 50% 110%, ${accentColor}18 0%, transparent 70%)`, borderBottom: `1px solid ${accentColor}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* bg orbs */}
            <div className="tour-orb1" style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)`, top: -10, left: 20, filter: 'blur(20px)' }} />
            <div className="tour-orb2" style={{ position: 'absolute', width: 60, height: 60, borderRadius: '50%', background: `radial-gradient(circle, ${accentColor}15 0%, transparent 70%)`, bottom: -10, right: 30, filter: 'blur(18px)' }} />
            {/* ping ring */}
            <div style={{ position: 'absolute', width: 64, height: 64, borderRadius: '50%', border: `2px solid ${accentColor}25`, animation: 'tour-ping 2s ease-out infinite' }} />
            {/* icon */}
            <div className="tour-icon" style={{ fontSize: 38, zIndex: 1, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}>{step.icon}</div>
          </div>
        )}

        <div style={{ padding: '14px 18px 0' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {progress}
            </span>
            <button
              onClick={dismiss}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
              aria-label="Close tour"
            >
              ×
            </button>
          </div>

          <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 5, letterSpacing: '-0.2px' }}>{step.title}</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, marginBottom: 14 }}>{step.body}</p>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 14, justifyContent: 'center' }}>
            {steps.map((_, i) => (
              <div key={i} style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 3, background: i === idx ? accentColor : 'rgba(255,255,255,0.12)', transition: 'all 0.25s' }} />
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 8 }}>
            {idx > 0 && (
              <button onClick={back} style={{ flex: '0 0 auto', padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                ←
              </button>
            )}
            <button onClick={advance} style={{ flex: 1, padding: '9px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#000' }}>
              {idx < steps.length - 1 ? 'Next →' : 'Got it 🎉'}
            </button>
          </div>

          {idx === 0 && (
            <button onClick={dismiss} style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', fontSize: 12, cursor: 'pointer' }}>
              Skip tour
            </button>
          )}
        </div>{/* end padding div */}
      </div>
    </>
  )
}
