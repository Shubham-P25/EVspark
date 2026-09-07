import { MapPin } from 'lucide-react'
import { stations } from './landing-data'

export function MiniMap({ className = '' }: { className?: string }) { return <div className={`mini-map ${className}`}><div className="map-road road-1" /><div className="map-road road-2" /><div className="map-road road-3" />{stations.map(s => <span key={s.name} className={`map-marker ${s.color}`} style={{ left: s.x, top: s.y }}><MapPin size={17} fill="currentColor" /></span>)}</div> }