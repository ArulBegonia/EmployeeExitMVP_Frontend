import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api.js'
import StatCard from '../../components/common/StatCard.jsx'
import Card from '../../components/common/Card.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import StepTimeline from '../../components/common/StepTimeline.jsx'
import { FileText, Clock, CheckCircle, ArrowRight, Sparkles } from 'lucide-react'
import styles from './EmployeeHome.module.css'

export default function EmployeeHome() {
  const [exitStatus, setExitStatus] = useState(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    api.get('/Exit/my-exit-status')
      .then(r => setExitStatus(r.data?.data || r.data))
      .catch(() => setExitStatus(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className={styles.page}>

      {/* ── Welcome Banner ── */}
      <div className={styles.welcome}>
        {/* Background layers */}
        <div className={styles.welcomeGrid} />
        <div className={styles.welcomeOrb1} />
        <div className={styles.welcomeOrb2} />

        <div className={styles.welcomeContent}>
          <div className={styles.welcomeLeft}>
            <div className={styles.welcomeEyebrow}>
              <span className={styles.eyebrowDot} />
              <span>Employee Portal</span>
            </div>
            <h2 className={styles.welcomeTitle}>Welcome back</h2>
            <p className={styles.welcomeSub}>
              Track and manage your exit process from here. Everything you need, all in one place.
            </p>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className={styles.stats}>
        <StatCard
          label="Notice Period"
          value="30 Days"
          icon={<Clock size={20} />}
          color="#27235C"
        />
        <StatCard
          label="Exit Status"
          value={exitStatus
            ? exitStatus.status.replace(/([A-Z])/g, ' $1').trim()
            : 'No Active Exit'}
          icon={<CheckCircle size={20} />}
          color="#9D247D"
        />
        <StatCard
          label="Proposed LWD"
          value={exitStatus
            ? new Date(exitStatus.proposedLastWorkingDate)
                .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—'}
          icon={<FileText size={20} />}
          color="#1E3A8A"
        />
      </div>

      {/* ── Active Exit Progress ── */}
      {exitStatus && (
        <Card>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <div className={styles.cardIconWrap}>
                <CheckCircle size={16} />
              </div>
              <div>
                <div className={styles.cardTitle}>Exit Progress</div>
                <div className={styles.cardSub}>Live status of your resignation workflow</div>
              </div>
            </div>
            <Link to="/employee/status" className={styles.detailLink}>
              View Details <ArrowRight size={14} />
            </Link>
          </div>

          <div className={styles.timelineWrap}>
            <StepTimeline status={exitStatus.status} />
          </div>

          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Current Status</span>
            <StatusBadge status={exitStatus.status} />
          </div>
        </Card>
      )}

      {/* ── Empty State ── */}
      {!exitStatus && !loading && (
        <Card>
          <div className={styles.emptyState}>
            <div className={styles.emptyVisual}>
              <div className={styles.emptyRing1} />
              <div className={styles.emptyRing2} />
              <div className={styles.emptyIconWrap}>
                <FileText size={28} />
              </div>
            </div>

            <div className={styles.emptyText}>
              <h3>No Active Exit Request</h3>
              <p>When you are ready to resign, click below to start the process. Your request will be reviewed by your manager and HR.</p>
            </div>

            <div className={styles.emptySteps}>
              {[
                { step: '1', label: 'Submit Resignation' },
                { step: '2', label: 'Manager Approval' },
                { step: '3', label: 'HR Clearance' },
              ].map((s, i) => (
                <React.Fragment key={s.step}>
                  <div className={styles.emptyStep}>
                    <div className={styles.emptyStepNum}>{s.step}</div>
                    <div className={styles.emptyStepLabel}>{s.label}</div>
                  </div>
                  {i < 2 && <div className={styles.emptyStepLine} />}
                </React.Fragment>
              ))}
            </div>

            <Link to="/employee/resign" className={styles.emptyCtaBtn}>
              <FileText size={16} />
              Submit Resignation
              <ArrowRight size={15} />
            </Link>
          </div>
        </Card>
      )}

    </div>
  )
}
