/**
 * Feature flags — reads toggle_trackwealth_* from Vercel Edge Config
 * Server-side only (Next.js Server Components / API routes)
 */

export interface SiteFlags {
  pricing: boolean
  chatbot: boolean
  freemium: boolean
  waitlist: boolean
  banner: boolean
}

const DEFAULTS: SiteFlags = {
  pricing: false,
  chatbot: true,
  freemium: true,
  waitlist: false,
  banner: false,
}

const FLAG_KEYS = Object.keys(DEFAULTS) as (keyof SiteFlags)[]
const EC_TTL = 60_000
const _cache: Record<string, { flags: SiteFlags; at: number }> = {}

export async function getSiteFlags(siteId: string): Promise<SiteFlags> {
  const now = Date.now()
  if (_cache[siteId] && now - _cache[siteId].at < EC_TTL) {
    return _cache[siteId].flags
  }

  const connStr = process.env.EDGE_CONFIG
  if (!connStr) return { ...DEFAULTS }

  try {
    const keys = FLAG_KEYS.map((k) => `toggle_${siteId}_${k}`)
    const params = keys.map((k) => `key=${encodeURIComponent(k)}`).join('&')
    const url = connStr.replace(/\/+$/, '')
    const res = await fetch(`${url}/items?${params}`, {
      headers: { accept: 'application/json' },
      next: { revalidate: 0 },
    })

    if (!res.ok) return { ...DEFAULTS }

    const data = await res.json()
    const flags: SiteFlags = { ...DEFAULTS }

    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        const m = (item.key as string).match(/^toggle_[a-z0-9-]+_([a-z]+)$/)
        if (m && FLAG_KEYS.includes(m[1] as keyof SiteFlags)) {
          ;(flags as unknown as Record<string, boolean>)[m[1]] = Boolean(item.value)
        }
      }
    } else if (typeof data === 'object') {
      for (const k of FLAG_KEYS) {
        const edgeKey = `toggle_${siteId}_${k}`
        if (edgeKey in data) {
          ;(flags as unknown as Record<string, boolean>)[k] = Boolean(data[edgeKey])
        }
      }
    }

    _cache[siteId] = { flags, at: now }
    return flags
  } catch {
    return { ...DEFAULTS }
  }
}
