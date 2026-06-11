import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { messages } = await req.json()
  const userMsg = messages?.[messages.length - 1]?.content || ''

  const groqKey = process.env.GROQ_API_KEY || ''
  if (!groqKey) return NextResponse.json({ text: 'AI service unavailable.' }, { status: 503 })

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant for this application. Keep responses concise and helpful.' },
          { role: 'user', content: userMsg },
        ],
        max_tokens: 300,
      }),
    })
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content || 'Happy to help!'
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ text: 'Try again in a moment!' })
  }
}
