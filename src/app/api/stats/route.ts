import { NextRequest, NextResponse } from 'next/server'

let counts = { portfoliosTracked: 0, snapshotsCreated: 0, insightsGenerated: 0 }

export async function GET() {
  return NextResponse.json(counts)
}

export async function POST(req: NextRequest) {
  const { event } = await req.json()
  if (event === 'portfolio_tracked') counts.portfoliosTracked++
  if (event === 'snapshot_created') counts.snapshotsCreated++
  if (event === 'insight_generated') counts.insightsGenerated++
  return NextResponse.json({ ok: true })
}
