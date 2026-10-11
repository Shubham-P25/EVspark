import { Check } from 'lucide-react'

export function CheckItem({ children }: { children: React.ReactNode }) { return <li><span className="check"><Check size={14} /></span>{children}</li> }