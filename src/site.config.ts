// site.config.ts — Single source of truth for TrackWealth brand content
export const siteConfig = {
  name: "TrackWealth",
  tagline: "AI Investment Portfolio Tracker",
  description: "Track your stocks, crypto, and mutual funds in one place. AI-powered insights and alerts.",
  url: "https://trackwealth.app",
  primaryColor: "#059669",
  accentColor: "#22c55e",
  secondaryColor: "#34d399",
  icon: "📈",
  stats: { portfolios: "5,400+", assetsTracked: "250,000+", avgReturn: "+14.2%" },
  chatbot: {
    openingMessage: "Hi! I can analyze your portfolio or answer investment questions. What would you like to know?",
    apiEndpoint: "/api/chat",
  },
  seo: {
    title: "TrackWealth — AI Investment Portfolio Tracker & Analyzer",
    description: "Track stocks, crypto & mutual funds with AI insights. Real-time alerts, portfolio analytics.",
  },
  nav: {
    links: [
      { label: "Home", href: "/" },
      { label: "Portfolio", href: "/#portfolio-form" },
      { label: "Alerts", href: "/#portfolio-form" },
      { label: "Pricing", href: "/#pricing" },
      { label: "About", href: "/about" },
    ],
    cta: { label: "Track free →", href: "/#portfolio-form" },
  },
}

export type SiteConfig = typeof siteConfig
