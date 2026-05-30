// site.config.ts — Single source of truth for TrackWealth brand content
export const siteConfig = {
  name: "TrackWealth",
  tagline: "Stop tracking. Start deciding.",
  description: "AI that connects your accounts, spots the patterns, and tells you your next wealth move — not just what happened.",
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
    title: "TrackWealth — AI Wealth Tracker | Know Your Next Money Move",
    description: "AI wealth tracker that goes beyond charts — tells you what to do next with your money. Net worth, investments, savings all in one place.",
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
