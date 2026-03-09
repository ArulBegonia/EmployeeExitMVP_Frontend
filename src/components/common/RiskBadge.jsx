import React from 'react'
import styles from './RiskBadge.module.css'

const riskMap = {
  // string keys (from API)
  Low:      { label: 'Low',      color: '#16A34A', bg: '#DCFCE7' },
  Medium:   { label: 'Medium',   color: '#D97706', bg: '#FEF3C7' },
  High:     { label: 'High',     color: '#EA580C', bg: '#FFEDD5' },
  Critical: { label: 'Critical', color: '#DC2626', bg: '#FEE2E2' },
  // numeric keys (fallback)
  0: { label: 'Low',      color: '#16A34A', bg: '#DCFCE7' },
  1: { label: 'Medium',   color: '#D97706', bg: '#FEF3C7' },
  2: { label: 'High',     color: '#EA580C', bg: '#FFEDD5' },
  3: { label: 'Critical', color: '#DC2626', bg: '#FEE2E2' },
}

// Accepts both `risk` and `level` props for compatibility
export default function RiskBadge({ risk, level }) {
  const val = risk ?? level
  if (!val && val !== 0) return null
  const cfg = riskMap[val] ?? { label: String(val), color: '#64748B', bg: '#F1F5F9' }
  return (
    <span
      className={styles.badge}
      style={{ color: cfg.color, background: cfg.bg }}>
      ● {cfg.label}
    </span>
  )
}
