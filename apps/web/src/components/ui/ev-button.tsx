import { ArrowRight } from 'lucide-react'

export function EVButton({ children, variant = 'primary', href = '#connect' }: { children: React.ReactNode; variant?: 'primary' | 'ghost'; href?: string }) {
  return <a href={href} className={`ev-button ${variant === 'ghost' ? 'ev-button-ghost' : ''}`}>{children}<ArrowRight size={17} /></a>
}