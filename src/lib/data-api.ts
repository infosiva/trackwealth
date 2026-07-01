// Centralised data-api client — all projects call this, never external APIs directly.
// Wraps 10+ free public APIs (no auth required) behind a single interface.
// Each project gets this via rollout-data-api.sh → app/api/data/route.ts (HTTP endpoint)
// or imports lib/data-api.ts directly for server-side use.
//
// Usage (HTTP from any project):
//   fetch('/api/data?source=trivia&amount=10&category=general')
//   fetch('/api/data?source=weather&lat=51.5&lon=-0.1')
//   fetch('/api/data?source=currency&base=GBP&to=USD,EUR,INR')
//   fetch('/api/data?source=crypto&ids=bitcoin,ethereum')
//   fetch('/api/data?source=flights&bbox=49,-12,61,2')
//   fetch('/api/data?source=news&q=AI+startup&lang=en')
//   fetch('/api/data?source=nutrition&query=apple')
//   fetch('/api/data?source=jobs&q=developer&location=London')
//   fetch('/api/data?source=geocode&q=Paris,France')
//   fetch('/api/data?source=holidays&country=GB&year=2026')
//   fetch('/api/data?source=books&q=machine+learning')
//   fetch('/api/data?source=facts&type=random')

const SOURCES = ['trivia', 'weather', 'currency', 'crypto', 'flights', 'news', 'nutrition', 'jobs', 'geocode', 'holidays', 'books', 'facts'] as const
export type DataSource = typeof SOURCES[number]

// ── Public API endpoints (all free, no auth required) ────────────────────────
const ENDPOINTS = {
  trivia:    'https://opentdb.com/api.php',
  weather:   'https://api.open-meteo.com/v1/forecast',
  currency:  'https://api.frankfurter.app/latest',
  crypto:    'https://api.coingecko.com/api/v3/coins/markets',
  flights:   'https://opensky-network.org/api/states/all',
  news:      'https://gnews.io/api/v4/search',       // free tier: 100 req/day — set GNEWS_API_KEY in env
  nutrition: 'https://fruityvice.com/api/fruit',
  jobs:      'https://remotive.com/api/remote-jobs',  // no auth, remote jobs
  geocode:   'https://nominatim.openstreetmap.org/search',
  holidays:  'https://date.nager.at/api/v3/PublicHolidays',
  books:     'https://openlibrary.org/search.json',
  facts:     'https://uselessfacts.jsph.pl/api/v2/facts/random',
}

export type DataQuery = {
  source: DataSource
  amount?: number
  triviaCategory?: number     // trivia category ID (opentdb)
  jobCategory?: string        // jobs category string (remotive)
  difficulty?: 'easy' | 'medium' | 'hard'
  lat?: number; lon?: number
  base?: string; to?: string
  ids?: string; vs_currency?: string; per_page?: number
  bbox?: string               // 'lat_min,lon_min,lat_max,lon_max'
  q?: string; lang?: string; max?: number
  query?: string; type?: string
  search?: string; limit?: number
  country?: string; year?: number
}

export type DataResult = {
  source: DataSource
  data: unknown
  cached?: boolean
  error?: string
}

export async function queryData(params: DataQuery): Promise<DataResult> {
  const { source, ...rest } = params
  try {
    switch (source) {
      case 'trivia':    return { source, data: await fetchTrivia(rest) }
      case 'weather':   return { source, data: await fetchWeather(rest) }
      case 'currency':  return { source, data: await fetchCurrency(rest) }
      case 'crypto':    return { source, data: await fetchCrypto(rest) }
      case 'flights':   return { source, data: await fetchFlights(rest) }
      case 'news':      return { source, data: await fetchNews(rest) }
      case 'nutrition': return { source, data: await fetchNutrition(rest) }
      case 'jobs':      return { source, data: await fetchJobs(rest) }
      case 'geocode':   return { source, data: await fetchGeocode(rest) }
      case 'holidays':  return { source, data: await fetchHolidays(rest) }
      case 'books':     return { source, data: await fetchBooks(rest) }
      case 'facts':     return { source, data: await fetchFacts() }
      default:          return { source, data: null, error: `Unknown source: ${source}` }
    }
  } catch (e) {
    return { source, data: null, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── Trivia (Open Trivia DB) ───────────────────────────────────────────────────
async function fetchTrivia({ amount = 10, triviaCategory, difficulty }: Partial<DataQuery>) {
  const p = new URLSearchParams({ amount: String(Math.min(amount ?? 10, 50)), type: 'multiple', encode: 'url3986' })
  if (triviaCategory) p.set('category', String(triviaCategory))
  if (difficulty) p.set('difficulty', difficulty)
  const res = await fetch(`${ENDPOINTS.trivia}?${p}`, { next: { revalidate: 3600 } })
  const json = await res.json()
  if (json.response_code !== 0) throw new Error(`OpenTDB code ${json.response_code}`)
  return json.results.map((q: Record<string, string>) => ({
    category: decodeURIComponent(q.category),
    difficulty: q.difficulty,
    question: decodeURIComponent(q.question),
    correct: decodeURIComponent(q.correct_answer),
    options: shuffle([q.correct_answer, ...q.incorrect_answers].map(decodeURIComponent)),
  }))
}

// ── Weather (Open-Meteo) ──────────────────────────────────────────────────────
async function fetchWeather({ lat = 51.5, lon = -0.1 }: Partial<DataQuery>) {
  const p = new URLSearchParams({
    latitude: String(lat), longitude: String(lon),
    current: 'temperature_2m,wind_speed_10m,weather_code,relative_humidity_2m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code',
    forecast_days: '7', timezone: 'auto',
  })
  const res = await fetch(`${ENDPOINTS.weather}?${p}`, { next: { revalidate: 1800 } })
  return res.json()
}

// ── Currency (Frankfurter / ECB) ──────────────────────────────────────────────
async function fetchCurrency({ base = 'USD', to }: Partial<DataQuery>) {
  const p = new URLSearchParams({ base })
  if (to) p.set('to', to)
  const res = await fetch(`${ENDPOINTS.currency}?${p}`, { next: { revalidate: 3600 } })
  return res.json()
}

// ── Crypto (CoinGecko) ────────────────────────────────────────────────────────
async function fetchCrypto({ ids = 'bitcoin,ethereum,solana', vs_currency = 'usd', per_page = 10 }: Partial<DataQuery>) {
  const p = new URLSearchParams({
    vs_currency, ids, order: 'market_cap_desc',
    per_page: String(per_page), page: '1', sparkline: 'false',
    price_change_percentage: '24h,7d',
  })
  const res = await fetch(`${ENDPOINTS.crypto}?${p}`, { next: { revalidate: 300 } })
  return res.json()
}

// ── Flights (OpenSky Network) ─────────────────────────────────────────────────
async function fetchFlights({ bbox }: Partial<DataQuery>) {
  // bbox = 'lat_min,lon_min,lat_max,lon_max' e.g. '49,-12,61,2' for UK
  let url = ENDPOINTS.flights
  if (bbox) {
    const [la1, lo1, la2, lo2] = bbox.split(',')
    url += `?lamin=${la1}&lomin=${lo1}&lamax=${la2}&lomax=${lo2}`
  }
  const res = await fetch(url, { next: { revalidate: 30 } })
  const json = await res.json()
  return (json.states || []).slice(0, 50).map((s: unknown[]) => ({
    icao24: s[0], callsign: (s[1] as string)?.trim(), country: s[2],
    lon: s[5], lat: s[6], altitude: s[7], velocity: s[9], heading: s[10],
  }))
}

// ── News (GNews — needs GNEWS_API_KEY, 100 free/day) ─────────────────────────
async function fetchNews({ q = 'technology', lang = 'en', max = 10 }: Partial<DataQuery>) {
  const key = process.env.GNEWS_API_KEY
  if (!key) {
    // Fallback: HackerNews top stories (no auth)
    const top = await (await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', { next: { revalidate: 900 } })).json()
    const ids = top.slice(0, max) as number[]
    const stories = await Promise.all(ids.map((id: number) =>
      fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { next: { revalidate: 900 } }).then(r => r.json())
    ))
    return { articles: stories.map((s: Record<string, unknown>) => ({ title: s.title, url: s.url, score: s.score, by: s.by, source: 'hackernews' })) }
  }
  const p = new URLSearchParams({ q, lang, country: 'any', max: String(max), apikey: key, sortby: 'publishedAt' })
  const res = await fetch(`${ENDPOINTS.news}?${p}`, { next: { revalidate: 900 } })
  return res.json()
}

// ── Nutrition (Fruityvice + Open Food Facts fallback) ─────────────────────────
async function fetchNutrition({ query = 'apple' }: Partial<DataQuery>) {
  // Try Fruityvice first (fruit only, free)
  const fruit = query.toLowerCase().replace(/\s+/g, ' ').trim()
  const res = await fetch(`${ENDPOINTS.nutrition}/${encodeURIComponent(fruit)}`, { next: { revalidate: 86400 } })
  if (res.ok) return res.json()
  // Fallback: Open Food Facts search
  const p = new URLSearchParams({ search_terms: fruit, json: '1', page_size: '5', fields: 'product_name,nutriments,brands' })
  const res2 = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${p}`, { next: { revalidate: 86400 } })
  const data = await res2.json()
  return data.products?.slice(0, 5) ?? []
}

// ── Jobs (Remotive — remote tech jobs, no auth) ───────────────────────────────
async function fetchJobs({ query = '', search, jobCategory = '', limit = 20 }: Partial<DataQuery> & { query?: string }) {
  const p = new URLSearchParams()
  const term = search || query
  if (term) p.set('search', term)
  if (jobCategory) p.set('category', jobCategory)
  const res = await fetch(`${ENDPOINTS.jobs}?${p}`, { next: { revalidate: 3600 } })
  const data = await res.json()
  return (data.jobs || []).slice(0, limit).map((j: Record<string, unknown>) => ({
    id: j.id, title: j.title, company: j.company_name, category: j.category,
    tags: j.tags, url: j.url, salary: j.salary, date: j.publication_date,
  }))
}

// ── Geocoding (Nominatim / OpenStreetMap) ─────────────────────────────────────
async function fetchGeocode({ q = 'London', query }: Partial<DataQuery>) {
  const search = query || q
  const p = new URLSearchParams({ q: search as string, format: 'json', limit: '5', addressdetails: '1' })
  const res = await fetch(`${ENDPOINTS.geocode}?${p}`, {
    headers: { 'User-Agent': 'agents-portfolio/1.0 (info.siva@gmail.com)' },
    next: { revalidate: 86400 },
  })
  return res.json()
}

// ── Public Holidays (Nager.Date) ──────────────────────────────────────────────
async function fetchHolidays({ country = 'GB', year }: Partial<DataQuery>) {
  const y = year || new Date().getFullYear()
  const res = await fetch(`${ENDPOINTS.holidays}/${y}/${country}`, { next: { revalidate: 86400 } })
  return res.json()
}

// ── Books (Open Library) ──────────────────────────────────────────────────────
async function fetchBooks({ q = 'artificial intelligence', query }: Partial<DataQuery>) {
  const search = query || q
  const p = new URLSearchParams({ q: search as string, limit: '10', fields: 'title,author_name,first_publish_year,subject,isbn' })
  const res = await fetch(`${ENDPOINTS.books}?${p}`, { next: { revalidate: 86400 } })
  const data = await res.json()
  return data.docs || []
}

// ── Random Facts (Useless Facts) ──────────────────────────────────────────────
async function fetchFacts() {
  const res = await fetch(`${ENDPOINTS.facts}?language=en`, { next: { revalidate: 60 } })
  return res.json()
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5) }

