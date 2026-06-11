'use client'
import { useState } from 'react'

export default function FloatingChatWrapper() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: "I'm WealthBot. Ask me about tracking investments, portfolio analysis, or market trends!" },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function send() {
    if (!input.trim() || loading) return
    const userMsg = input
    setMsgs(m => [...m, { role: 'user', text: userMsg }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: userMsg }] }),
      })
      const data = await res.json()
      setMsgs(m => [...m, { role: 'bot', text: data.text || 'Happy to help!' }])
    } catch {
      setMsgs(m => [...m, { role: 'bot', text: 'Try again in a moment!' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open TrackWealth AI chat"
        style={{ position: 'fixed', bottom: 24, right: 24, width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(245,158,11,0.35)', zIndex: 1000, fontSize: 20,
          transition: 'transform 0.15s, opacity 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.93)')}
        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1.08)')}
      >
        {open ? '✕' : '📈'}
      </button>
      <div
        style={{ position: 'fixed', bottom: 88, right: 24, width: 320, height: 420,
          background: 'rgba(255,255,255,0.98)', border: '1px solid #e2e8f0',
          borderRadius: 16, display: 'flex', flexDirection: 'column', zIndex: 1000,
          overflow: 'hidden', boxShadow: '0 8px 40px rgba(245,158,11,0.15)',
          opacity: open ? 1 : 0, transform: open ? 'scale(1) translateY(0)' : 'scale(0.97) translateY(10px)',
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.18s, transform 0.18s' }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 13, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
          WealthBot
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? '#f59e0b' : '#f1f5f9',
              color: m.role === 'user' ? '#fff' : '#0f172a',
              padding: '8px 12px', borderRadius: 10, fontSize: 12.5, maxWidth: '85%', lineHeight: 1.5,
            }}>{m.text}</div>
          ))}
          {loading && <div style={{ alignSelf: 'flex-start', background: '#f1f5f9', padding: '8px 12px', borderRadius: 10, fontSize: 12, color: '#94a3b8' }}>…</div>}
        </div>
        <div style={{ padding: '10px 12px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask about investments, portfolio, market trends…"
            style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: 8, padding: '7px 10px', fontSize: 12, color: '#0f172a', outline: 'none' }} />
          <button onClick={send} disabled={loading}
            style={{ background: '#f59e0b', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 13, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>→</button>
        </div>
      </div>
    </>
  )
}
