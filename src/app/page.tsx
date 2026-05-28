// app/page.tsx — SERVER COMPONENT wrapper
// Fetches feature flags from Edge Config and passes them to the client page.
import { getSiteFlags } from '@/lib/flags'
import TrackWealthPage from './TrackWealthPage'

export default async function Page() {
  const flags = await getSiteFlags('trackwealth')
  return <TrackWealthPage showPricing={flags.pricing} />
}
