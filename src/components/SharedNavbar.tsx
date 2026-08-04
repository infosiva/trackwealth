'use client'
import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'

export interface NavLink { label: string; href: string; external?: boolean }
export interface BrandConfig {
  name: string; tagline: string; icon: ReactNode; color: string; url: string
  navLinks?: NavLink[]; cta?: { label: string; href: string }
  /** Optional pre-split wordmark: accentWord is rendered in brand.color, rest in default. Falls back to plain brand.name. */
  nameAccent?: string
}

export default function SharedNavbar({ brand }: { brand: BrandConfig }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 32)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const links = brand.navLinks ?? []
  const cta = brand.cta ?? { label: 'Try free', href: '/' }

  return (
    <>
      <nav
        style={{ '--accent': brand.color } as React.CSSProperties}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out
          ${scrolled
            ? 'bg-[#030305]/80 backdrop-blur-2xl border-b border-white/[0.05]'
            : 'bg-transparent'
          }`}
      >
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group select-none">
            <span
              className="leading-none transition-transform duration-200 group-hover:scale-110 flex items-center justify-center"
              aria-hidden
            >
              {brand.icon}
            </span>
            <span className="font-semibold text-white/90 text-sm tracking-tight">
              {brand.nameAccent
                ? (() => {
                    const idx = brand.name.indexOf(brand.nameAccent)
                    if (idx === -1) return brand.name
                    return (
                      <>
                        {brand.name.slice(0, idx)}
                        <span style={{ color: brand.color }}>{brand.nameAccent}</span>
                        {brand.name.slice(idx + brand.nameAccent.length)}
                      </>
                    )
                  })()
                : brand.name}
            </span>
          </Link>

          {/* Desktop links */}
          {links.length > 0 && (
            <div className="hidden md:flex items-center gap-0.5">
              {links.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  target={l.external ? '_blank' : undefined}
                  rel={l.external ? 'noopener noreferrer' : undefined}
                  className="px-3 py-1.5 text-[13px] text-white/45 hover:text-white/90 rounded-md hover:bg-white/[0.04] transition-all duration-150"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )}

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center">
            <Link
              href={cta.href}
              className="px-3.5 py-1.5 text-[13px] font-medium rounded-lg border transition-all duration-150 hover:-translate-y-px active:translate-y-0"
              style={{
                color: brand.color,
                borderColor: `${brand.color}40`,
                background: `${brand.color}10`,
              }}
            >
              {cta.label}
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(v => !v)}
            className="md:hidden flex flex-col gap-1.5 p-2 rounded-md text-white/50 hover:text-white/80 transition-colors"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            <span className={`block w-5 h-px bg-current transition-all duration-200 origin-center ${open ? 'translate-y-[7px] rotate-45' : ''}`} />
            <span className={`block w-5 h-px bg-current transition-all duration-200 ${open ? 'opacity-0 scale-x-0' : ''}`} />
            <span className={`block w-5 h-px bg-current transition-all duration-200 origin-center ${open ? '-translate-y-[7px] -rotate-45' : ''}`} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${open ? 'visible' : 'invisible'}`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setOpen(false)}
        />
        {/* Drawer */}
        <div
          className={`absolute top-0 left-0 right-0 bg-[#030305]/98 backdrop-blur-2xl border-b border-white/[0.06] transition-all duration-300 ease-out ${open ? 'translate-y-0' : '-translate-y-full'}`}
        >
          <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-white/[0.05]">
            <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
              <span className="text-lg">{brand.icon}</span>
              <span className="font-semibold text-white/90 text-sm">{brand.name}</span>
            </Link>
            <button onClick={() => setOpen(false)} className="p-1.5 text-white/40 hover:text-white/80 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="px-5 py-4 flex flex-col gap-1">
            {links.map(l => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-2 py-2.5 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/[0.04] transition-all"
              >
                {l.label}
              </Link>
            ))}
            <div className="h-px bg-white/[0.05] my-2" />
            <Link
              href={cta.href}
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 text-sm font-medium rounded-lg text-center transition-all"
              style={{ color: brand.color, background: `${brand.color}15` }}
            >
              {cta.label}
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
