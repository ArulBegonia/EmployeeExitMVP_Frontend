import React from 'react'
import s from './StatCard.module.css'

export default function StatCard({ label, value, icon, color = '#27235C', sub }) {
  const strVal   = String(value ?? '')
  const isLong   = strVal.length > 12
  const isShort  = strVal.length <= 6

  return (
    <div className={s.card} style={{ '--c': color }}>
      {/* Top accent bar */}
      <div className={s.accent} style={{ background: color }} />

      {/* Icon + Label row */}
      <div className={s.topRow}>
        <div className={s.icon} style={{ background: color + '15', color }}>
          {icon}
        </div>
        <div className={s.labelWrap}>
          <div className={s.label}>{label}</div>
          {sub && <div className={s.sub}>{sub}</div>}
        </div>
      </div>

      {/* Value */}
      <div
        className={s.val}
        style={{ color }}
        data-long={isLong}
        data-short={isShort}
      >
        {value ?? '—'}
      </div>
    </div>
  )
}
