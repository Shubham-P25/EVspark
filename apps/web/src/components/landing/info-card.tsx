import { Flag } from 'lucide-react'
import { Reveal } from '@/components/ui/reveal'

export function InfoCard({ icon:Icon, title, copy }: { icon: typeof Flag; title:string; copy:string }) { return <Reveal className="info-card"><Icon /><h3>{title}</h3><p>{copy}</p></Reveal> }