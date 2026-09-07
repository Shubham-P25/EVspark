'use client'

import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export function EVNavbar() {
  const [open, setOpen] = useState(false)
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const smooth = useSpring(scrollY, { stiffness: 100, damping: 30 })
  useEffect(() => smooth.on('change', value => setScrolled(value > 20)), [smooth])
  const links = [['Features', '#features'], ['How It Works', '#how'], ['For Operators', '#roles'], ['For Drivers', '#roles'], ['About', '#ecosystem']]
  return <header className={`ev-nav ${scrolled ? 'ev-nav-scrolled' : ''}`}><a href="#top" className="brand"><span><b>EV</b><em>spark</em></span></a><nav className="desktop-nav">{links.map(([label, href]) => <a key={label} href={href}>{label}</a>)}</nav><div className="nav-actions"><Link className="sign-in" href="/auth/login">Sign In</Link><Link className="ev-button" href="/auth/register">Get Started <ArrowRight size={17} /></Link></div><button className="mobile-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button><AnimatePresence>{open && <motion.nav initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mobile-nav">{links.map(([label, href]) => <a key={label} href={href} onClick={() => setOpen(false)}>{label}</a>)}<Link className="ev-button" href="/auth/register" onClick={() => setOpen(false)}>Get Started <ArrowRight size={17} /></Link></motion.nav>}</AnimatePresence></header>
}