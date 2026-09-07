import { Reveal } from '@/components/ui/reveal'

export function Metric({ value, title, copy, color, progress }: { value:React.ReactNode; title:string; copy:string; color:string; progress:string }) { return <Reveal className={`metric-row ${color}`}><strong>{value}</strong><div><h3>{title}</h3><p>{copy}</p><div className="progress"><span style={{width:progress}} /></div></div></Reveal> }