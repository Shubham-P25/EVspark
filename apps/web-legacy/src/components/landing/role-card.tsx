import { Car, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { CheckItem } from '@/components/ui/check-item'
import { Reveal } from '@/components/ui/reveal'

export function RoleCard({
  title,
  icon: Icon,
  color,
  copy,
  bullets,
  mock,
}: {
  title: string
  icon: typeof Car
  color: string
  copy: string
  bullets: string[]
  mock: React.ReactNode
}) {
  const targetHref =
    title === 'EV Driver'
      ? '/dashboard/driver'
      : title === 'Station Operator'
      ? '/dashboard/operator'
      : '/dashboard/admin'

  return (
    <Reveal className={`role-card ${color}`}>
      <div className="role-icon">
        <Icon />
      </div>
      <span className="role-badge">{title}</span>
      <h3>
        {title === 'EV Driver'
          ? 'Find, Book, Charge'
          : title === 'Station Operator'
          ? 'Manage & Monetize'
          : 'Control the Network'}
      </h3>
      <p>{copy}</p>
      <ul>
        {bullets.map((b) => (
          <CheckItem key={b}>{b}</CheckItem>
        ))}
      </ul>
      {mock}
      <Link href={targetHref} className="role-button">
        Launch {title} <ChevronRight size={16} />
      </Link>
    </Reveal>
  )
}