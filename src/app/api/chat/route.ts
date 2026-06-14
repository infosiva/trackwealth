import { reportToTaskFlow } from '@/lib/reportToTaskFlow'
import { NextRequest, NextResponse } from 'next/server'
import { AI_LIMITER } from '@/lib/rateLimit'

export const runtime = 'nodejs'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const DEFAULT_SYSTEM = `You are WealthBot, the AI assistant for TrackWealth — an AI-powered portfolio tracker.
Help users understand their portfolio performance, explain investment concepts, give market context, and help them use the tracker.
Be clear, data-driven, and concise. Always clarify you're providing information, not financial advice.
If asked anything outside investing, portfolios, or TrackWealth, respond: "I'm trained for TrackWealth. For that, try Google or ChatGPT!"`

export async function POST(req: NextRequest) {
  const limited = AI_LIMITER.check(req); if (limited) return limited
  try {
    const body = await req.json()
    const messages: Message[] = body.messages
    const systemPrompt: string = body.systemPrompt ?? DEFAULT_SYSTEM

    if (!messages?.length) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 })

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 300,
        temperature: 0.5,
        stream: true,
      }),
    })

    if (!res.ok || !res.body) return NextResponse.json({ error: 'AI request failed' }, { status: 502 })

    void reportToTaskFlow({ project: 'trackwealth', agentName: 'ChatBot', status: 'completed', message: 'Chat message processed' })
    const readable = new ReadableStream({
      async start(controller) {
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        const encoder = new TextEncoder()
        let buffer = ''
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6).trim()
              if (data === '[DONE]') return
              try {
                const text = JSON.parse(data).choices?.[0]?.delta?.content ?? ''
                if (text) controller.enqueue(encoder.encode(text))
              } catch { /* skip */ }
            }
          }
        } finally { controller.close() }
      },
    })

    return new NextResponse(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  } catch (err) {
    console.error('[/api/chat]', err)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}
