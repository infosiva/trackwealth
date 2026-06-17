'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export interface NavLink { label: string; href: string; external?: boolean }
export interface BrandConfig {
  name: string; tagline: string; icon: string; color: string; url: string
  navLinks?: NavLink[]; cta?: { label: string; href: string }
}

export default function SharedNavbar({ brand }: { brand: BrandConfig }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const links = brand.navLinks ?? []
  const cta = brand.cta ?? { label: 'Try Free', href: '/' }

  return (
    <nav style={{ '--accent': brand.color } as React.CSSProperties}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${scrolled ? 'bg-[#07060f]/90 backdrop-blur-xl border-b border-white/[0.06] shadow-lg' : 'bg-transparent'}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <polyline points="2,11 6,7 9,9 14,4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="11,4 14,4 14,7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-white text-[15px] tracking-tight">
            Track<span style={{ color: '#f59e0b' }}>Wealth</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              target={l.external ? '_blank' : undefined}
              className="px-3 py-1.5 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all">
              {l.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href={cta.href}
            className="px-4 py-2 text-sm font-semibold rounded-full text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
            style={{ background: brand.color }}>
            {cta.label}
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(v => !v)}
          className="md:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.06] transition-all">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-[#07060f]/95 backdrop-blur-xl border-b border-white/[0.06] animate-[slideDown_0.2s_ease]">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
            {links.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="px-3 py-2.5 text-sm text-white/70 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all">
                {l.label}
              </Link>
            ))}
            <Link href={cta.href} onClick={() => setOpen(false)}
              className="mt-2 px-4 py-2.5 text-sm font-semibold rounded-full text-white text-center transition-all"
              style={{ background: brand.color }}>
              {cta.label}
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
