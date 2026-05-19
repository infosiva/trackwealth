'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

const ACCENT = '#22c55e'
const BOT_NAME = 'WealthBot'
const WELCOME = "Hi! I can analyze your portfolio or answer investment questions. What would you like to know?"
const SYSTEM_PROMPT = `You are WealthBot, the AI assistant for TrackWealth — an AI-powered portfolio tracker.
Help users understand their portfolio performance, explain investment concepts, give market context, and help them use the tracker.
Be clear, data-driven, and concise. Always clarify you're providing information, not financial advice.`

interface Message { role: 'user' | 'assistant'; content: string }

export default function ChatBot() {
  const [shown, setShown] = useState(false)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: WELCOME }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 30s delay before showing chatbot button
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 30000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100) }, [open])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    const userMsg: Message = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, systemPrompt: SYSTEM_PROMPT }),
      })
      if (!res.ok || !res.body) throw new Error('Stream failed')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantText += decoder.decode(value, { stream: true })
        setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: assistantText }; return u })
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Something went wrong. Please try again.' }])
    } finally { setLoading(false) }
  }, [input, loading, messages])

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  if (!shown) return null

  return (
    <>
      <button onClick={() => setOpen(o => !o)} aria-label="WealthBot"
        style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, width: 52, height: 52, borderRadius: 12, background: `linear-gradient(135deg, ${ACCENT}, #059669)`, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 20px ${ACCENT}55`, transition: 'transform 0.2s' }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        )}
      </button>

      {open && (
        <div style={{ position: 'fixed', bottom: 88, right: 24, zIndex: 9998, width: 370, height: 500, borderRadius: 12, background: '#020c07', border: `1px solid ${ACCENT}44`, boxShadow: '0 8px 40px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'wb-slide 0.2s ease-out' }}>
          <style>{`@keyframes wb-slide{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} .wb-msg::-webkit-scrollbar{width:4px} .wb-msg::-webkit-scrollbar-thumb{background:${ACCENT}44;border-radius:2px} @keyframes wb-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${ACCENT}30`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: `${ACCENT}12` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: `linear-gradient(135deg, ${ACCENT}, #059669)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📈</div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{BOT_NAME}</div>
                <div style={{ color: '#6ee7b7', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}/>Portfolio AI · Not financial advice</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="wb-msg" style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 6px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '85%', padding: '9px 13px', borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px', background: m.role === 'user' ? ACCENT : 'rgba(255,255,255,0.05)', border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)', color: '#f0f0f0', fontSize: 13.5, lineHeight: 1.6, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderRadius: '12px 12px 12px 3px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0,1,2].map(d => <span key={d} style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT, display: 'inline-block', animation: `wb-bounce 1.2s ${d*0.2}s infinite ease-in-out` }}/>)}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8, alignItems: 'center', background: '#010805' }}>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey} placeholder="Ask about markets, portfolio…" disabled={loading}
              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${ACCENT}30`, borderRadius: 8, padding: '9px 13px', color: '#f0f0f0', fontSize: 13.5, outline: 'none' }}
              onFocus={e => (e.target.style.borderColor = ACCENT)} onBlur={e => (e.target.style.borderColor = `${ACCENT}30`)}/>
            <button onClick={send} disabled={loading || !input.trim()} style={{ width: 38, height: 38, borderRadius: 8, border: 'none', background: input.trim() && !loading ? ACCENT : 'rgba(255,255,255,0.06)', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
