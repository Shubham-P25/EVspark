import CountUpLib from 'react-countup'

export function CountUp({ end, suffix = '', prefix = '' }: { end: number; suffix?: string; prefix?: string }) { return <CountUpLib end={end} prefix={prefix} suffix={suffix} enableScrollSpy scrollSpyOnce duration={1.8} separator="," /> }