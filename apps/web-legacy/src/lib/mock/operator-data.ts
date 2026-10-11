export const operatorProfile = { name: 'Aakash Mehta', businessName: 'GreenCharge Hub', city: 'Pune', totalStations: 3, totalPoints: 17, joinedDate: 'March 2024' }

export const operatorStations = [
  { id: 's1', name: 'Hinjewadi IT Park Charger', points: 6, active: 4, status: 'Online' },
  { id: 's2', name: 'Baner Road EV Hub', points: 4, active: 1, status: 'Online' },
  { id: 's3', name: 'Koregaon Park Station', points: 8, active: 6, status: 'Online' },
]

export const revenueByDay = [
  { day: 'Mon', sessions: 24, revenue: 3840 }, { day: 'Tue', sessions: 31, revenue: 4960 },
  { day: 'Wed', sessions: 28, revenue: 4480 }, { day: 'Thu', sessions: 35, revenue: 5600 },
  { day: 'Fri', sessions: 42, revenue: 6720 }, { day: 'Sat', sessions: 56, revenue: 8960 },
  { day: 'Sun', sessions: 48, revenue: 7680 },
]

export const revenueByWeek = [
  { week: 'Week 1', revenue: 24300 }, { week: 'Week 2', revenue: 28900 },
  { week: 'Week 3', revenue: 31200 }, { week: 'Week 4', revenue: 38400 },
]

export const liveSessions = [
  { id: 'SES001', user: 'Rahul S.', vehicle: 'Tata Nexon EV', station: 'Hinjewadi IT Park Charger', point: 'DC-01', startTime: '10:30 AM', duration: 24, power: 58.4, soc: 67, energyDelivered: 23.4, estimatedCost: 281 },
  { id: 'SES002', user: 'Priya M.', vehicle: 'Ola S1 Pro', station: 'Koregaon Park Station', point: 'DC-03', startTime: '10:48 AM', duration: 8, power: 118.2, soc: 42, energyDelivered: 15.7, estimatedCost: 236 },
  { id: 'SES003', user: 'Vikram K.', vehicle: 'MG ZS EV', station: 'Hinjewadi IT Park Charger', point: 'AC-02', startTime: '10:15 AM', duration: 41, power: 7.2, soc: 88, energyDelivered: 4.9, estimatedCost: 59 },
  { id: 'SES004', user: 'Sneha R.', vehicle: 'Tata Tigor EV', station: 'Baner Road EV Hub', point: 'AC-01', startTime: '10:55 AM', duration: 3, power: 7.2, soc: 28, energyDelivered: 0.4, estimatedCost: 4 },
]

export const recentAlerts = [
  { id: 1, type: 'warning', message: 'DC-02 at Hinjewadi reporting high temperature', time: '11 min ago', station: 'Hinjewadi IT Park Charger' },
  { id: 2, type: 'info', message: 'New booking for DC-01 at 1:00 PM', time: '18 min ago', station: 'Hinjewadi IT Park Charger' },
  { id: 3, type: 'success', message: 'Session SES-0289 completed — ₹340 collected', time: '32 min ago', station: 'Koregaon Park Station' },
  { id: 4, type: 'error', message: 'AC-01 at Baner Road went offline briefly', time: '1 hr ago', station: 'Baner Road EV Hub' },
]
