'use client'
import { useEffect, useState } from 'react'

interface Stats { portfoliosTracked: number; snapshotsCreated: number; insightsGenerated: number }

export default function LiveStatsBar() {
  const [stats, setStats] = useState<Stats>({ portfoliosTracked: 0, snapshotsCreated: 0, insightsGenerated: 0 })

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  if (!stats.portfoliosTracked && !stats.snapshotsCreated && !stats.insightsGenerated) return null

  return (
    <div className="border-y py-3 px-5" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default, rgba(5,150,105,0.14))' }}>
      <div className="mx-auto flex max-w-5xl justify-center gap-8 flex-wrap">
        {stats.portfoliosTracked > 0 && (
          <div className="text-center">
            <span className="block text-[20px] font-black" style={{ color: 'var(--accent,#059669)' }}>{stats.portfoliosTracked}</span>
            <span className="text-[11px] opacity-60">portfolios tracked this session</span>
          </div>
        )}
        {stats.snapshotsCreated > 0 && (
          <div className="text-center">
            <span className="block text-[20px] font-black" style={{ color: 'var(--accent,#059669)' }}>{stats.snapshotsCreated}</span>
            <span className="text-[11px] opacity-60">snapshots created</span>
          </div>
        )}
      </div>
    </div>
  )
}
