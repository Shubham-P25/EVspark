'use client'

import Link from 'next/link'
import CountUp from 'react-countup'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Settings,
  TrendingUp,
  Wifi,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useEffect, useState } from 'react'
import { liveSessions as initialSessions, operatorProfile, operatorStations as mockOperatorStations, recentAlerts as initialAlerts, revenueByDay } from '@/lib/mock/operator-data'
import { useSocket } from '@/hooks/useSocket'
import './operator.css'

const nav = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Live Sessions', icon: Zap, badge: '4' },
  { label: 'My Stations', icon: Building2 },
  { label: 'Analytics', icon: BarChart3 },
  { label: 'Alerts', icon: Bell, badge: '2' },
  { label: 'Settings', icon: Settings },
]

function StatCard({
  icon: Icon,
  label,
  value,
  suffix = '',
  prefix = '',
  trend,
  tone,
  live = false,
}: {
  icon: typeof Zap
  label: string
  value: number
  suffix?: string
  prefix?: string
  trend: string
  tone: string
  live?: boolean
}) {
  return (
    <motion.div
      className="op-stat-card"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -3 }}
    >
      <div className={`op-stat-icon ${tone}`}>
        <Icon size={19} />
      </div>
      <span className="op-stat-label">{label}</span>
      <strong className={live ? 'live-number' : ''}>
        <CountUp end={value} prefix={prefix} suffix={suffix} duration={2} enableScrollSpy />
      </strong>
      <small className={trend.includes('+') || live ? 'positive' : ''}>
        {live && <i className="op-pulse" />}
        {trend}
      </small>
    </motion.div>
  )
}

export default function OperatorDashboard() {
  const [active, setActive] = useState('Overview')
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [stationName, setStationName] = useState('')
  const [city, setCity] = useState('Pune')
  const [points, setPoints] = useState('4')

  const [stations, setStations] = useState<any[]>([])
  const [selectedStationIndex, setSelectedStationIndex] = useState(0)
  const [sessions, setSessions] = useState(initialSessions)
  const [alerts, setAlerts] = useState(initialAlerts)
  const [priceInput, setPriceInput] = useState('18.0')
  const [priceSaved, setPriceSaved] = useState(false)

  // Fetch live stations from API
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    fetch(`${apiUrl}/api/stations`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setStations(data)
          if (data[0]?.pricePerKwh) {
            setPriceInput(String(data[0].pricePerKwh))
          }
        }
      })
      .catch(() => {})
  }, [])

  // Listen to live Socket.io events
  useSocket('charger:update', (updated: any) => {
    setStations((prev) =>
      prev.map((st) => ({
        ...st,
        chargers: st.chargers?.map((c: any) => (c.id === updated.id ? { ...c, status: updated.status } : c)),
      }))
    )
  })

  useSocket('alert:overload', (alertData: any) => {
    const newAlert = {
      id: Date.now(),
      station: alertData.stationId || 'Hero Hub',
      message: alertData.message || 'Overload alert: Demand surging',
      time: 'Just now',
      type: 'warning',
    }
    setAlerts((prev) => [newAlert, ...prev])
  })

  // Toggle charger status
  const handleToggleCharger = async (chargerId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'FREE' ? 'BUSY' : currentStatus === 'BUSY' ? 'MAINTENANCE' : 'FREE'
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

    // Optimistic UI update
    setStations((prev) =>
      prev.map((st) => ({
        ...st,
        chargers: st.chargers?.map((c: any) => (c.id === chargerId ? { ...c, status: nextStatus } : c)),
      }))
    )

    try {
      await fetch(`${apiUrl}/api/operator/chargers/${chargerId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
    } catch {}
  }

  // Update station pricing
  const handleSavePrice = async (stationId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    try {
      await fetch(`${apiUrl}/api/operator/stations/${stationId}/pricing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricePerKwh: Number(priceInput) }),
      })
      setPriceSaved(true)
      setTimeout(() => setPriceSaved(false), 3000)
    } catch {}
  }

  const currentStation = stations[selectedStationIndex] || stations[0]

  const iconFor = (type: string) =>
    type === 'warning' ? AlertTriangle : type === 'info' ? Bell : type === 'success' ? CheckCircle2 : XCircle
  const alertClass = (type: string) => `op-alert ${type}`

  return (
    <div className="operator-shell">
      {/* Sidebar */}
      <aside className="operator-sidebar">
        <div className="operator-logo">
          <Zap size={20} fill="currentColor" /> EVspark
        </div>
        <p className="operator-kicker">Operator CSMS Platform</p>
        <div className="operator-profile">
          <div className="operator-avatar">A</div>
          <div>
            <b>Aakash Mehta</b>
            <span>GreenCharge Hub</span>
            <small>
              <i /> Verified CSMS Operator
            </small>
          </div>
        </div>

        <nav className="operator-nav">
          <p>MAIN</p>
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                className={active === item.label ? 'active' : ''}
                onClick={() => setActive(item.label)}
              >
                <Icon size={17} /> {item.label}
                {item.badge && <em>{item.badge}</em>}
              </button>
            )
          })}
          <p>QUICK LINKS</p>
          <Link href="/dashboard/driver">
            <Map size={17} /> View Driver Map
          </Link>
          <Link href="/dashboard/admin">
            <Settings size={17} /> Admin Overview
          </Link>
          <Link className="signout" href="/auth/login">
            <LogOut size={17} /> Sign Out
          </Link>
        </nav>
        <div className="operator-help">
          Need help?
          <b>support@evspark.in</b>
        </div>
      </aside>

      {/* Main Area */}
      <main className="operator-main">
        {/* Top bar */}
        <header className="operator-topbar">
          <button
            className="operator-mobile-menu"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div>
            <h1>Good morning, Aakash</h1>
            <p>GreenCharge Hub · Live Charging Management</p>
          </div>
          <div className="operator-top-actions">
            <span>Live Digital Twin Online</span>
            <button className="op-bell" onClick={() => setAlertsOpen(true)} aria-label="Open alerts">
              <Bell size={19} />
              <i>{alerts.length}</i>
            </button>
            <button className="add-station" onClick={() => setAddOpen(true)}>
              Add Station +
            </button>
          </div>
        </header>

        {/* Mobile Nav */}
        <div className="operator-mobile-nav">
          {mobileOpen && (
            <>
              {nav.slice(0, 5).map((item) => (
                <button
                  key={item.label}
                  className={active === item.label ? 'active' : ''}
                  onClick={() => {
                    setActive(item.label)
                    setMobileOpen(false)
                  }}
                >
                  <item.icon size={16} />
                  <span>{item.label.split(' ')[0]}</span>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Top Stats Cards */}
        <section className="op-stats">
          <StatCard
            icon={IndianRupee}
            label="Monthly Revenue"
            value={38400}
            prefix="₹"
            trend="+18% vs last month"
            tone="blue"
          />
          <StatCard
            icon={Activity}
            label="Sessions This Month"
            value={264}
            trend="+24 vs last month"
            tone="green"
          />
          <StatCard
            icon={Wifi}
            label="Avg Uptime"
            value={99.2}
            suffix="%"
            trend="All stations reporting"
            tone="purple"
          />
          <StatCard
            icon={Zap}
            label="Live Sessions"
            value={sessions.length}
            trend="Live"
            tone="amber"
            live
          />
        </section>

        {/* TAB 1: OVERVIEW & TAB 4: ANALYTICS */}
        {(active === 'Overview' || active === 'Analytics') && (
          <section className="op-chart-grid">
            <div className="op-panel op-revenue">
              <div className="op-panel-head">
                <div>
                  <h2>Sessions &amp; Revenue</h2>
                  <span>Last 7 days (Indian Network Patterns)</span>
                </div>
                <TrendingUp size={17} color="#10B981" />
              </div>
              <ResponsiveContainer width="100%" height={235}>
                <ComposedChart data={revenueByDay} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ border: '0', borderRadius: 12, boxShadow: '0 10px 30px #0f172a18' }}
                    formatter={(value, name) => [name === 'revenue' ? `₹${value}` : value, name === 'revenue' ? 'Revenue' : 'Sessions']}
                  />
                  <Bar yAxisId="left" dataKey="sessions" fill="#2563EB" opacity={0.85} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="op-chart-legend">
                <span>
                  <i className="legend-blue" /> Sessions
                </span>
                <span>
                  <i className="legend-green" /> Revenue (₹)
                </span>
              </div>
            </div>

            <div className="op-panel utilization">
              <div className="op-panel-head">
                <div>
                  <h2>Charger Utilization</h2>
                  <span>Right now</span>
                </div>
                <Activity size={17} color="#64748b" />
              </div>
              {mockOperatorStations.map((station) => {
                const percentage = Math.round((station.active / station.points) * 100)
                return (
                  <div className="util-row" key={station.id}>
                    <div>
                      <b>{station.name}</b>
                      <span>
                        {station.active}/{station.points} points active
                      </span>
                    </div>
                    <strong>{percentage}%</strong>
                    <div className="util-track">
                      <motion.i
                        initial={{ width: 0 }}
                        whileInView={{ width: `${percentage}%` }}
                        viewport={{ once: true }}
                        className={percentage > 70 ? 'emerald' : percentage >= 40 ? 'blue' : 'amber'}
                      />
                    </div>
                  </div>
                )
              })}
              <small className="updated">
                <i className="op-pulse" /> Updated 4 sec ago via Digital Twin
              </small>
            </div>
          </section>
        )}

        {/* TAB 2: MY STATIONS / CHARGER GRID & PRICING MANAGEMENT */}
        {(active === 'Overview' || active === 'My Stations') && currentStation && (
          <section
            className="op-panel"
            style={{
              marginBottom: '16px',
              border: currentStation.isOverloaded ? '2px solid #ef4444' : undefined,
              boxShadow: currentStation.isOverloaded ? '0 0 20px rgba(239, 68, 68, 0.25)' : undefined,
            }}
          >
            <div className="op-panel-head">
              <div>
                <h2>
                  Live Charger Grid &amp; Remote Control — {currentStation.name}
                  {currentStation.isOverloaded && (
                    <span style={{ color: '#ef4444', fontWeight: 700, marginLeft: '10px' }}>
                      ⚠️ SURGE / OVERLOAD ACTIVE
                    </span>
                  )}
                </h2>
                <span>Click any charger to toggle state (FREE ↔ BUSY ↔ MAINTENANCE)</span>
              </div>

              {/* Station Switcher */}
              {stations.length > 1 && (
                <select
                  value={selectedStationIndex}
                  onChange={(e) => {
                    const idx = Number(e.target.value)
                    setSelectedStationIndex(idx)
                    if (stations[idx]?.pricePerKwh) {
                      setPriceInput(String(stations[idx].pricePerKwh))
                    }
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    background: '#fff',
                  }}
                >
                  {stations.map((s, idx) => (
                    <option key={s.id} value={idx}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Charger Grid with manual toggles */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '12px',
                marginTop: '10px',
              }}
            >
              {(currentStation.chargers || []).map((c: any) => {
                const statusColor =
                  c.status === 'FREE' ? '#10b981' : c.status === 'BUSY' ? '#f59e0b' : '#ef4444'
                return (
                  <div
                    key={c.id}
                    onClick={() => handleToggleCharger(c.id, c.status)}
                    style={{
                      border: `1.5px solid ${statusColor}`,
                      borderRadius: '12px',
                      padding: '14px',
                      background: c.status === 'BUSY' ? '#fffbeb' : c.status === 'FREE' ? '#f0fdf4' : '#fef2f2',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '13px' }}>{c.label || 'Bay'}</strong>
                      <span
                        style={{
                          background: statusColor,
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '4px',
                        }}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#475569', margin: '8px 0 10px' }}>
                      {c.powerKw} kW · {c.connectorType}
                    </p>
                    <small style={{ color: '#64748b', fontSize: '10px' }}>
                      Click to toggle status →
                    </small>
                  </div>
                )
              })}
            </div>

            {/* Pricing Management */}
            <div
              style={{
                marginTop: '18px',
                paddingTop: '16px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Station Tariff Management:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>₹</span>
                <input
                  type="number"
                  step="0.5"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  style={{
                    width: '90px',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                />
                <span style={{ fontSize: '12px', color: '#64748b' }}>/ kWh</span>
              </div>
              <button
                onClick={() => handleSavePrice(currentStation.id)}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Update Tariff
              </button>
              {priceSaved && (
                <span style={{ color: '#059669', fontSize: '12px', fontWeight: 600 }}>
                  ✓ Tariff updated &amp; broadcasted to drivers!
                </span>
              )}
            </div>
          </section>
        )}

        {/* TAB 3: LIVE SESSIONS TABLE */}
        {(active === 'Overview' || active === 'Live Sessions') && (
          <section className="op-panel sessions-panel">
            <div className="op-panel-head">
              <h2>Live Active Sessions</h2>
              <span className="live-badge">
                <i className="op-pulse" /> {sessions.length} Active Cars
              </span>
            </div>
            <div className="session-table-wrap">
              <table className="session-table">
                <thead>
                  <tr>
                    {['User', 'Vehicle', 'Station', 'Charger', 'Started', 'Duration', 'Power', 'SoC', 'Est. Cost', 'Action'].map(
                      (h) => (
                        <th key={h} className={h === 'Station' || h === 'Vehicle' ? 'mobile-hide' : ''}>
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session, index) => (
                    <motion.tr
                      key={session.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <td>
                        <span className="user-cell">
                          <i>{session.user[0]}</i>
                          {session.user}
                        </span>
                      </td>
                      <td className="mobile-hide">{session.vehicle}</td>
                      <td className="mobile-hide">{session.station}</td>
                      <td>
                        <b className="charger-chip">{session.point}</b>
                      </td>
                      <td>{session.startTime}</td>
                      <td>{session.duration} min</td>
                      <td className="power-cell">{session.power} kW</td>
                      <td>
                        <div className="soc">
                          <i style={{ width: `${session.soc}%` }} />
                        </div>
                        <small>{session.soc}%</small>
                      </td>
                      <td className="cost-cell">₹{session.estimatedCost}</td>
                      <td>
                        <button
                          className="end-session"
                          onClick={() => setSessions((prev) => prev.filter((s) => s.id !== session.id))}
                        >
                          End Session
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 5: ALERTS */}
        {(active === 'Overview' || active === 'Alerts') && (
          <section className="op-panel alerts-panel">
            <div className="op-panel-head">
              <h2>Recent System &amp; Network Alerts</h2>
              <button onClick={() => setAlerts([])}>Mark all read</button>
            </div>
            {alerts.map((alert) => {
              const Icon = iconFor(alert.type)
              return (
                <motion.div
                  className={alertClass(alert.type)}
                  key={alert.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Icon size={17} />
                  <div>
                    <b>{alert.message}</b>
                    <span>
                      {alert.station} · {alert.time}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </section>
        )}
      </main>

      {/* Drawer */}
      <AnimatePresence>
        {alertsOpen && (
          <motion.aside className="operator-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}>
            <div className="drawer-head">
              <h2>Recent Alerts</h2>
              <button onClick={() => setAlertsOpen(false)} aria-label="Close alerts">
                <X size={18} />
              </button>
            </div>
            {alerts.map((alert) => {
              const Icon = iconFor(alert.type)
              return (
                <div className={alertClass(alert.type)} key={alert.id}>
                  <Icon size={17} />
                  <div>
                    <b>{alert.message}</b>
                    <span>
                      {alert.station} · {alert.time}
                    </span>
                  </div>
                </div>
              )
            })}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Add Station Modal */}
      <AnimatePresence>
        {addOpen && (
          <motion.aside
            className="operator-drawer add-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
          >
            <div className="drawer-head">
              <h2>Register New Station</h2>
              <button onClick={() => setAddOpen(false)} aria-label="Close panel">
                <X size={18} />
              </button>
            </div>
            <label>
              Station Name
              <input
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                placeholder="e.g. Wakad EV Hub"
              />
            </label>
            <label>
              City
              <select value={city} onChange={(e) => setCity(e.target.value)}>
                <option>Pune</option>
                <option>Mumbai</option>
                <option>Thane</option>
                <option>Navi Mumbai</option>
              </select>
            </label>
            <label>
              Number of Points
              <select value={points} onChange={(e) => setPoints(e.target.value)}>
                <option>2</option>
                <option>4</option>
                <option>6</option>
                <option>8</option>
              </select>
            </label>
            <div className="drawer-actions">
              <button onClick={() => setAddOpen(false)}>Cancel</button>
              <button
                onClick={() => {
                  setAddOpen(false)
                  setAlerts((prev) => [
                    {
                      id: Date.now(),
                      station: stationName || 'New Station',
                      message: 'Station submitted to Admin approval queue',
                      time: 'Just now',
                      type: 'info',
                    },
                    ...prev,
                  ])
                }}
              >
                Submit for Approval
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}
