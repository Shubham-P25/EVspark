import { Activity } from 'lucide-react'

export function Stat({ icon: Icon, value, label }: { icon: typeof Activity; value: React.ReactNode; label: string }) { return <div className="live-stat"><Icon size={31} /><strong>{value}</strong><span>{label}</span></div> }