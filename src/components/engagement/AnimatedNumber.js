import React, { useEffect, useState } from 'react'

const parseNumeric = (value) => {
  if (typeof value === 'number') return { num: value, prefix: '', suffix: '' }
  const str = String(value ?? '')
  const match = str.match(/^([^0-9.-]*)([0-9.,]+)(.*)$/)
  if (!match) return { num: 0, prefix: str, suffix: '' }
  const num = parseFloat(match[2].replace(/,/g, ''))
  return { num: isNaN(num) ? 0 : num, prefix: match[1], suffix: match[3] }
}

const AnimatedNumber = ({ value, duration = 700, className = '' }) => {
  const { num, prefix, suffix } = parseNumeric(value)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!num) {
      setDisplay(0)
      return
    }
    const start = performance.now()
    const from = display
    let frame

    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(from + (num - from) * eased))
      if (p < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [num, duration])

  const formatted =
    suffix.includes('M') || suffix.includes('K')
      ? display
      : display.toLocaleString()

  return (
    <span className={`sms-animated-num ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}

export default React.memo(AnimatedNumber)
