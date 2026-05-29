// site.config.ts — Single source of truth for TrackWealth brand content
export const siteConfig = {
  name: "TrackWealth",
  tagline: "See your real net worth, right now",
  description: "Unlike Monarch or Copilot, TrackWealth connects stocks, crypto, and funds in one AI view — no spreadsheet needed.",
  url: "https://trackwealth.app",
  primaryColor: "#059669",
  accentColor: "#22c55e",
  secondaryColor: "#34d399",
  icon: "📈",
  stats: { portfolios: "Join early users", assetsTracked: "Real-time tracking", avgReturn: "AI-powered insights" },
  chatbot: {
    openingMessage: "What's your biggest portfolio question right now — performance, allocation, or a specific asset?",
    apiEndpoint: "/api/chat",
  },
  seo: {
    title: "TrackWealth — See Your Real Net Worth With AI",
    description: "Track stocks, crypto & mutual funds with AI insights. See your real net worth across every asset class.",
  },
  nav: {
    links: [
      { label: "Home", href: "/" },
      { label: "Portfolio", href: "/#portfolio-form" },
      { label: "Alerts", href: "/#portfolio-form" },
      { label: "Pricing", href: "/#pricing" },
      { label: "About", href: "/about" },
    ],
    cta: { label: "Track my wealth free →", href: "/#portfolio-form" },
  },
}

export type SiteConfig = typeof siteConfig
