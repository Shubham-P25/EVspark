import { ChevronDown } from 'lucide-react'

export function RoleGuard({ active, onChange }: { active: string; onChange: (role: string) => void }) { return <div className="role-tabs">{['Drivers', 'Operators', 'Admins'].map(role => <button key={role} className={active === role ? 'active' : ''} onClick={() => onChange(role)}>{role}<ChevronDown size={14} /></button>)}</div> }