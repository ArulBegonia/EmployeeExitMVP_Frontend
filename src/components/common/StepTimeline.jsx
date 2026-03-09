import React from 'react'
import { Check, X, Clock } from 'lucide-react'
import styles from './StepTimeline.module.css'

const STEPS = [
  { key: 'submitted',  label: 'Submitted' },
  { key: 'l1',         label: 'L1 Approval' },
  { key: 'l2',         label: 'L2 Approval' },
  { key: 'hr',         label: 'HR Review' },
  { key: 'clearance',  label: 'Clearance' },
  { key: 'settlement', label: 'Settlement' },
  { key: 'completed',  label: 'Completed' },
]

function getStepState(stepKey, status) {
  const order = ['submitted','l1','l2','hr','clearance','settlement','completed']
  const statusMap = {
    PendingL1Approval:   'l1',
    PendingL2Approval:   'l2',
    PendingHrReview:     'hr',
    ClearanceInProgress: 'clearance',
    SettlementPending:   'settlement',
    Completed:           'completed',
    Rejected:            'rejected',
  }
  if (status === 'Rejected') {
    return stepKey === 'submitted' ? 'done' : 'pending'
  }
  const currentIdx = order.indexOf(statusMap[status] || 'submitted')
  const stepIdx = order.indexOf(stepKey)
  if (stepIdx < currentIdx) return 'done'
  if (stepIdx === currentIdx) return 'active'
  return 'pending'
}

export default function StepTimeline({ status }) {
  return (
    <div className={styles.timeline}>
      {STEPS.map((step, i) => {
        const state = getStepState(step.key, status)
        return (
          <div key={step.key} className={styles.step}>
            <div className={styles.iconWrap}>
              <div className={`${styles.circle} ${styles[state]}`}>
                {state === 'done' && <Check size={14} />}
                {state === 'active' && <Clock size={14} />}
                {state === 'pending' && <span>{i + 1}</span>}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`${styles.line} ${state === 'done' ? styles.lineDone : ''}`} />
              )}
            </div>
            <div className={`${styles.label} ${styles['label_' + state]}`}>{step.label}</div>
          </div>
        )
      })}
    </div>
  )
}
