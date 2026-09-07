import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import './auth/auth.css'
import './dashboard/operator/operator.css'

export const metadata: Metadata = {
  title: 'EVspark — Smart Charging for India',
  description: "EVspark uses real-time AI to predict charging demand, reduce wait times, and keep India's EV network running at full capacity.",
  generator: 'v0.app',
}

export const viewport: Viewport = { colorScheme: 'light', themeColor: '#ffffff' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="bg-white"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
