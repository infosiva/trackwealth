import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai'
import { AI_LIMITER } from '@/lib/rateLimit'

interface HoldingInput { ticker: string; shares: number; buy_price: number }

async function fetchPrice(ticker: string): Promise<number> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`Yahoo Finance ${res.status}`)
  const data = await res.json()
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
  if (!price) throw new Error('No price data')
  return price
}

export async function POST(req: NextRequest) {
  const limited = AI_LIMITER.check(req); if (limited) return limited
  try {
    const { holdings, question }: { holdings: HoldingInput[]; question?: string } = await req.json()

    const enriched = await Promise.all(
      holdings.map(async (h) => {
        try {
          const current_price = await fetchPrice(h.ticker)
          const current_value = Math.round(current_price * h.shares * 100) / 100
          const gain_loss_pct = Math.round(((current_price - h.buy_price) / h.buy_price) * 10000) / 100
          return { ticker: h.ticker, shares: h.shares, buy_price: h.buy_price, current_price, current_value, gain_loss_pct }
        } catch {
          return { ticker: h.ticker, shares: h.shares, buy_price: h.buy_price, current_price: 0, current_value: 0, gain_loss_pct: 0, error: 'Price unavailable' }
        }
      })
    )

    const valid = enriched.filter(h => !h.error)
    const total_value = Math.round(valid.reduce((s, h) => s + h.current_value, 0) * 100) / 100
    const total_cost = Math.round(valid.reduce((s, h) => s + h.buy_price * h.shares, 0) * 100) / 100
    const total_gain_loss_pct = total_cost > 0 ? Math.round(((total_value - total_cost) / total_cost) * 10000) / 100 : 0

    let insights = ''
    if (valid.length > 0) {
      try {
        const portfolioSummary = valid.map(h =>
          `${h.ticker}: ${h.shares} shares @ $${h.buy_price} buy → $${h.current_price} now (${h.gain_loss_pct >= 0 ? '+' : ''}${h.gain_loss_pct}%, value $${h.current_value})`
        ).join('\n')
        const { text } = await callAI(
          `You are a financial analyst providing portfolio insights. Be concise and actionable.
Structure your response in 3 short sections:
1. OVERVIEW (1-2 sentences on overall portfolio health and return)
2. RISK FLAGS (bullet: top 1-2 concentration risks or sector exposures)
3. ACTION (1 specific rebalancing or trade suggestion with rationale)
End with: "Not financial advice."`,
          [{
            role: 'user',
            content: `Portfolio:\n${portfolioSummary}\n\nTotal value: $${total_value} | Total invested: $${total_cost} | Overall return: ${total_gain_loss_pct >= 0 ? '+' : ''}${total_gain_loss_pct}%\n\n${question || 'Analyze diversification, concentration risk, and give one specific rebalancing suggestion.'}`,
          }],
          900,
          'balanced',
        )
        insights = text
      } catch { /* insights optional */ }
    }

    return NextResponse.json({ holdings: enriched, total_value, total_cost, total_gain_loss_pct, insights })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Portfolio API error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
