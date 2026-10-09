import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import SharedNavbar from '@/components/SharedNavbar'
import Footer from '../../components/Footer'
import DesignEffects from '@/components/DesignEffects'
import AnimatedBackground from '@/components/AnimatedBackground'
import FeedbackWidget from '@/components/FeedbackWidget'
import { getSiteFlags } from '@/lib/flags'
import BackToTop from '@/components/BackToTop'
import FloatingChatWrapper from '@/components/FloatingChatWrapper'
import type { BrandConfig } from '@/components/SharedNavbar'
import CookieConsent from "../../components/CookieConsent"
import StickyFooterCTA from "../../components/StickyFooterCTA"
import { siteConfig } from '@/site.config'
import { loadSiteTheme, buildThemeStyleTag, buildGa4Snippet, resolveGa4Id, isWidgetHidden } from '@/lib/theme-loader'
import { Logo } from '@/components/Logo'

import { MotionProvider } from "@infosiva/shared-ui/modern";
const brand: BrandConfig = {
  name: siteConfig.name,
  tagline: siteConfig.description,
  icon: <Logo size={22} />,
  nameAccent: 'Wealth',
  color: siteConfig.accentColor,
  url: siteConfig.url,
  navLinks: [
    { label: 'Home', href: '/' },
    { label: 'Portfolio', href: '/#portfolio-form' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'About', href: '/about' },
  ],
  cta: { label: 'Track free →', href: '/#portfolio-form' },
}

export const metadata: Metadata = {
  title: siteConfig.seo.title,
  description: siteConfig.seo.description,
  keywords: ['investment tracker', 'portfolio tracker', 'AI finance', 'stock portfolio', 'wealth management', 'crypto tracker'],
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    title: siteConfig.seo.title,
    description: siteConfig.seo.description,
    type: 'website',
    locale: 'en_US',
    siteName: siteConfig.name,
    url: siteConfig.url,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: `${siteConfig.name} — AI Investment Tracker` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.seo.title,
    description: siteConfig.seo.description,
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: { canonical: siteConfig.url },
}

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": siteConfig.name,
  "url": siteConfig.url,
  "description": siteConfig.description,
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "What is TrackWealth?", "acceptedAnswer": { "@type": "Answer", "text": "TrackWealth is an AI-powered investment portfolio tracker. Enter your stocks, crypto, or mutual fund holdings to get live P&L, AI risk analysis, and price alerts — no brokerage login required." } },
    { "@type": "Question", "name": "Is TrackWealth free?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. TrackWealth is free with 3 portfolio analyses per day. Pro plan ($12/mo) gives unlimited analyses, email alerts, and CSV export." } },
    { "@type": "Question", "name": "Does TrackWealth require a brokerage account?", "acceptedAnswer": { "@type": "Answer", "text": "No. You manually enter your tickers and share counts. TrackWealth fetches live prices from Yahoo Finance — no brokerage connection needed." } },
  ],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [flags, theme] = await Promise.all([
    getSiteFlags('trackwealth'),
    loadSiteTheme('trackwealth'),
  ])

  const themeCSS = buildThemeStyleTag(theme, {
    background: '#07130f',
    primary: '#0b6e4f',
    secondary: '#34d399',
  })

  const ga4 = buildGa4Snippet(theme)

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {ga4 && <script async src={`https://www.googletagmanager.com/gtag/js?id=${resolveGa4Id(theme)}`} />}
        {ga4 && <script dangerouslySetInnerHTML={{ __html: ga4 }} />}
        <meta name="google-adsense-account" content="ca-pub-4237294630161176" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --theme-primary: #0b6e4f;
            --theme-secondary: #34d399;
            --theme-base: #07130f;
            --background: #07130f;
            --surface-1: #0b1c15;
            --surface-2: #11271e;
            --foreground: #f0fdf4;
            --text-2: #6ee7b7;
            --border-default: rgba(52,211,153,0.16);
            --border-strong: rgba(52,211,153,0.32);
            --radius: 0.5rem;
            --radius-lg: 0.75rem;
          }
          body { font-family: 'Inter', system-ui, sans-serif !important; letter-spacing: -0.01em; }
          code, pre, .mono, .ticker { font-family: 'JetBrains Mono', monospace !important; }
          .glass {
            background: rgba(2,15,7,0.7) !important;
            border-color: rgba(5,150,105,0.12) !important;
          }
          .number-green { color: #34d399; font-family: 'JetBrains Mono', monospace; }
          .number-red   { color: #f87171; font-family: 'JetBrains Mono', monospace; }
          @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          ${themeCSS}
        `}} />
      </head>
      <body className="flex flex-col min-h-screen">
        <AnimatedBackground />
        <div className="grain" aria-hidden />
        <DesignEffects />
        <SharedNavbar brand={brand} />
        <main className="flex-1 pt-16"><MotionProvider>{children}</MotionProvider></main>
        <Footer siteName={siteConfig.name} />
        {!isWidgetHidden(theme, 'backToTop') && <BackToTop accentColor="#0b6e4f" />}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4237294630161176"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {!isWidgetHidden(theme, 'cookieConsent') && <CookieConsent />}
        {!isWidgetHidden(theme, 'stickyFooterCTA') && <StickyFooterCTA />}
        <Script defer data-domain="trackwealth.app" src="https://plausible.io/js/script.js" strategy="afterInteractive" />
        <FeedbackWidget siteName="TrackWealth" accentColor="#0b6e4f" position="left" />
        <FloatingChatWrapper />
      </body>
    </html>
  )
}
