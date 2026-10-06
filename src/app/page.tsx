// app/page.tsx — SERVER COMPONENT wrapper
// Fetches feature flags from Edge Config and passes them to the client page.
import TrackWealthPage from './TrackWealthPage'

export default async function Page() {
  return <TrackWealthPage />
}
