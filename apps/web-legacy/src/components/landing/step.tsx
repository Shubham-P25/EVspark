import { Building2 } from 'lucide-react'
import { Reveal } from '@/components/ui/reveal'

export function Step({ num, icon: Icon, title, copy }: { num:string; icon: typeof Building2; title:string; copy:string }) { return <Reveal className="step"><span className="step-num">{num}</span><div className="step-icon"><Icon /></div><h3>{title}</h3><p>{copy}</p></Reveal> }