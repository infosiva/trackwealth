import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import SharedNavbar from '@/components/SharedNavbar'
import Footer from '../../components/Footer'
import DesignEffects from '@/components/DesignEffects'
import AnimatedBackground from '@/components/AnimatedBackground'
import ChatBot from '@/components/ChatBot'
import type { BrandConfig } from '@/components/SharedNavbar'
import CookieConsent from "../../components/CookieConsent";

const brand: BrandConfig = {
  name: 'TrackWealth',
  tagline: 'AI-powered investment portfolio tracker with real-time insights and alerts.',
  icon: '📈',
  color: '#22c55e',
  url: 'https://trackwealth.app',
  navLinks: [{ label: 'Track portfolio', href: '/' }, { label: 'Alerts', href: '/?tab=alerts' }],
  cta: { label: 'Track free →', href: '/' },
}

export const metadata: Metadata = {
  title: 'TrackWealth — AI Investment Portfolio Tracker',
  description: 'Track and optimise your investment portfolio with AI-powered insights, real-time quotes and smart alerts.',
  keywords: ['investment tracker', 'portfolio tracker', 'AI finance', 'stock portfolio', 'wealth management'],
  openGraph: { title: 'TrackWealth — AI Portfolio Tracker', description: 'AI investment portfolio tracker with smart alerts.', type: 'website', locale: 'en_GB', siteName: 'TrackWealth' },
  twitter: { card: 'summary_large_image', title: 'TrackWealth', description: 'AI investment portfolio tracker.' },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org", "@type": "SoftwareApplication",
          "name": "TrackWealth", "url": brand.url, "description": brand.tagline,
          "applicationCategory": "FinanceApplication", "operatingSystem": "Web",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "GBP" }
        })}} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --theme-primary: #059669;
            --theme-secondary: #34d399;
            --theme-base: #020f07;
            --background: #020f07;
            --surface-1: #071a0e;
            --surface-2: #0d2918;
            --foreground: #f0fdf4;
            --text-2: #6ee7b7;
            --border-default: rgba(5,150,105,0.15);
            --border-strong: rgba(5,150,105,0.3);
            --radius: 0.5rem;
            --radius-lg: 0.75rem;
          }
          body { font-family: 'Inter', system-ui, sans-serif !important; letter-spacing: -0.01em; }
          code, pre, .mono, .ticker { font-family: 'JetBrains Mono', monospace !important; }
          .glass {
            background: rgba(2,15,7,0.7) !important;
            border-color: rgba(5,150,105,0.12) !important;
          }
          /* Terminal-style number formatting */
          .number-green { color: #34d399; font-family: 'JetBrains Mono', monospace; }
          .number-red   { color: #f87171; font-family: 'JetBrains Mono', monospace; }
        `}} />
      </head>
      <body className="flex flex-col min-h-screen">
        <AnimatedBackground />
        <DesignEffects />
        <SharedNavbar brand={brand} />
        <main className="flex-1 pt-16">{children}</main>
        <Footer siteName="TrackWealth" />
        <ChatBot />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4237294630161176"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      <CookieConsent />
        {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
        <script src="http://31.97.56.148:3098/t.js" data-site="trackwealth.app" defer></script>
      </body>
    </html>
  )
}
