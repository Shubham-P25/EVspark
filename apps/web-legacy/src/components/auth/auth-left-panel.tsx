'use client'

import { motion } from 'framer-motion'
import { Activity, BatteryCharging, Check, Zap } from 'lucide-react'

const chips = ['Saved 40 min wait — Riya, Pune', 'Revenue up 3x — Aakash, Operator', 'AI routing works great — Meera, Mumbai']

export function AuthLeftPanel() {
  return <aside className="auth-left-panel">
    <div><div className="auth-logo"><span><Zap size={20} fill="currentColor" /></span><b>EVspark</b></div><p className="auth-kicker">Smart EV Charging Platform</p></div>
    <div className="auth-visual-wrap">
      <div className="auth-network-card"><div className="auth-card-head"><span><i className="pulse-dot" />Live Network</span><Activity size={16} /></div>
        {[['Active Stations','2,418',Zap],['Sessions Today','9,342',BatteryCharging],['Network Uptime','99.7%',Check]].map(([label,value,Icon]) => <div className="auth-stat" key={label as string}><Icon size={17} /><span>{label as string}</span><strong>{value as string}</strong></div>)}
        <div className="auth-bars">{[42,68,54,82,61,91,76].map((height,index) => <div key={index} style={{height: `${height}%`}}><i /></div>)}</div><div className="auth-days"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
        <p className="auth-serving">Serving Mumbai · Pune · Bangalore · Delhi</p>
      </div>
      <div className="auth-chips">{chips.map((chip,index) => <motion.span key={chip} animate={{y:[0,-8,0]}} transition={{duration:[4,5,4.5][index],repeat:Infinity,ease:'easeInOut'}}>{chip}</motion.span>)}</div>
    </div>
    <p className="auth-copyright">© 2025 EVspark Technologies Pvt. Ltd.</p>
  </aside>
}

export const fadeInUp = { initial: {opacity:0,y:20}, animate: {opacity:1,y:0}, transition: {duration:.45} }