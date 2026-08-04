import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'

const CHAT_LIMITER = rateLimit({ windowMs: 60 * 60_000, max: 60, message: "You're chatting a lot! Give it a minute and try again." })

const SYSTEM_PROMPT = `You are WealthBot, the assistant for TrackWealth — a net-worth and portfolio tracking app. Help users understand tracking their investments, net worth trends, asset allocation, and how to use TrackWealth's features. Keep answers short and practical, not financial advice — remind users to consult a licensed advisor for personal investment decisions.
If asked anything outside TrackWealth or personal finance tracking, respond: "I'm trained for TrackWealth. For that, try Google or ChatGPT!"`

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

async function callGroq(model: string, messages: ChatMessage[], key: string) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 300,
    }),
  })
  if (!res.ok) throw new Error(`groq ${model} ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content as string | undefined
}

async function callGemini(messages: ChatMessage[], key: string) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gemini-2.0-flash',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 300,
    }),
  })
  if (!res.ok) throw new Error(`gemini ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content as string | undefined
}

async function callCerebras(messages: ChatMessage[], key: string) {
  const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama3.1-70b',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 300,
    }),
  })
  if (!res.ok) throw new Error(`cerebras ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content as string | undefined
}

export async function POST(req: NextRequest) {
  const limited = CHAT_LIMITER.check(req)
  if (limited) return limited

  const { messages } = await req.json()
  const trimmed: ChatMessage[] = (messages ?? []).slice(-6) // cap history at last 6, §X

  const groqKey = process.env.GROQ_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY
  const cerebrasKey = process.env.CEREBRAS_API_KEY

  const attempts: Array<() => Promise<string | undefined>> = []
  if (groqKey) {
    attempts.push(() => callGroq('llama-3.3-70b-versatile', trimmed, groqKey))
    attempts.push(() => callGroq('llama-3.1-8b-instant', trimmed, groqKey))
  }
  if (geminiKey) attempts.push(() => callGemini(trimmed, geminiKey))
  if (cerebrasKey) attempts.push(() => callCerebras(trimmed, cerebrasKey))

  for (const attempt of attempts) {
    try {
      const text = await attempt()
      if (text) return NextResponse.json({ text })
    } catch {
      continue // try next provider in cascade
    }
  }

  // All providers failed or none configured — never 500, never blank
  return NextResponse.json({ text: 'Chat is resting — try again in a moment.' })
}
