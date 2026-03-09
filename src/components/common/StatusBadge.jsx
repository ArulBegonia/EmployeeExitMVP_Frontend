import React from 'react'
import styles from './StatusBadge.module.css'

const statusMap = {
  PendingL1Approval: { label: 'Pending L1', color: '#D97706', bg: '#FEF3C7' },
  PendingL2Approval: { label: 'Pending L2', color: '#7C3AED', bg: '#EDE9FE' },
  PendingHrReview:   { label: 'Pending HR', color: '#2563EB', bg: '#DBEAFE' },
  ClearanceInProgress: { label: 'Clearance', color: '#0369A1', bg: '#E0F2FE' },
  SettlementPending: { label: 'Settlement', color: '#9D247D', bg: '#FCE7F3' },
  Completed:         { label: 'Completed', color: '#16A34A', bg: '#DCFCE7' },
  Rejected:          { label: 'Rejected',  color: '#DC2626', bg: '#FEE2E2' },
}

export default function StatusBadge({ status }) {
  const cfg = statusMap[status] || { label: status, color: '#64748B', bg: '#F1F5F9' }
  return (
    <span className={styles.badge} style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  )
}
