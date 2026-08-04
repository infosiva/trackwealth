'use client'
import { useState, useRef, useCallback } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'

type State = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported'

interface Props {
  onTranscript: (text: string) => void
  lang?: string
  color?: string
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center'
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any
  }
}

export default function VoiceButton({ onTranscript, lang = 'en-GB', color = '#059669', position = 'bottom-right' }: Props) {
  const [state, setState] = useState<State>('idle')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null)

  const posClass = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
  }[position]

  const isSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const toggle = useCallback(() => {
    if (!isSupported) { setState('unsupported'); return }
    if (state === 'listening') {
      recRef.current?.stop()
      setState('idle')
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = lang
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onstart = () => setState('listening')
    rec.onresult = (e: SpeechRecognitionEvent) => {
      setState('processing')
      const text = e.results[0][0].transcript
      onTranscript(text)
      setTimeout(() => setState('idle'), 800)
    }
    rec.onerror = () => { setState('error'); setTimeout(() => setState('idle'), 1500) }
    rec.onend = () => { setState(s => s === 'listening' ? 'idle' : s) }
    rec.start()
    recRef.current = rec
  }, [state, isSupported, lang, onTranscript])

  if (!isSupported) return null

  const icons = {
    idle: <Mic size={22} />,
    listening: <MicOff size={22} />,
    processing: <Loader2 size={22} className="animate-spin" />,
    error: <Mic size={22} />,
    unsupported: null,
  }

  const tooltip = {
    idle: 'Voice search (en-GB)',
    listening: 'Listening… click to stop',
    processing: 'Processing…',
    error: 'Tap to retry',
    unsupported: '',
  }[state]

  return (
    <div className={`fixed ${posClass} z-50 group`}>
      {/* Ripple rings when listening */}
      {state === 'listening' && (
        <>
          <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: color }} />
          <span className="absolute inset-0 rounded-full animate-ping opacity-15 animation-delay-300" style={{ background: color }} />
        </>
      )}
      <button
        onClick={toggle}
        title={tooltip}
        data-state={state}
        className="relative w-14 h-14 rounded-full text-white flex items-center justify-center shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95"
        style={{
          background: state === 'error' ? '#ef4444' : color,
          boxShadow: state === 'listening' ? `0 0 0 0 ${color}40, 0 8px 30px ${color}60` : `0 8px 30px ${color}40`,
        }}>
        {icons[state]}
      </button>
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 bg-[#1a1830] text-white/80 text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/[0.08]">
        {tooltip}
      </div>
    </div>
  )
}
