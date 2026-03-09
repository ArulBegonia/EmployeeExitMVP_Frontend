import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api.js'
import StatCard from '../../components/common/StatCard.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import RiskBadge from '../../components/common/RiskBadge.jsx'
import Loader from '../../components/common/Loader.jsx'
import {
  List, FileText, DollarSign, BarChart2, UserCheck,
  ArrowRight, AlertTriangle, TrendingUp, RefreshCw
} from 'lucide-react'
import s from './HRHome.module.css'

export default function HRHome() {
  const [requests, setRequests] = useState([])
  const [loading,  setL]        = useState(true)

  const load = () => {
    setL(true)
    api.get('/Exit/all-requests')
      .then(r => setRequests(r.data?.data || r.data || []))
      .catch(() => setRequests([]))
      .finally(() => setL(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return <Loader />

  const pending    = requests.filter(r => r.status === 'PendingHrReview')
  const clearance  = requests.filter(r => r.status === 'ClearanceInProgress')
  const settlement = requests.filter(r => r.status === 'SettlementPending')
  const completed  = requests.filter(r => r.status === 'Completed')
  const highRisk   = requests.filter(r => r.riskLevel === 'High' || r.riskLevel === 'Critical')

  const quickLinks = [
    { to: '/hr/exit-requests', ic: <List size={19} />,       bg: 'rgba(157,36,125,0.10)', c: '#9D247D', t: 'All Exit Requests',  d: 'View, filter & approve' },
    { to: '/hr/documents',     ic: <FileText size={19} />,   bg: 'rgba(39,35,92,0.10)',   c: '#27235C', t: 'Documents',          d: 'Generate letters & certs' },
    { to: '/hr/settlement',    ic: <DollarSign size={19} />, bg: 'rgba(146,64,14,0.10)',  c: '#92400E', t: 'Settlement',         d: 'Full & final processing' },
    { to: '/hr/rehire',        ic: <UserCheck size={19} />,  bg: 'rgba(21,128,61,0.10)',  c: '#15803D', t: 'Rehire Eligibility', d: 'Check & update status' },
    { to: '/hr/analytics',     ic: <BarChart2 size={19} />,  bg: 'rgba(3,105,161,0.10)',  c: '#0369A1', t: 'Analytics',          d: 'Trends & risk reports' },
  ]

  return (
    <div className={s.pg}>

      {/* ── Page Header ── */}
      <div className={s.hdr}>
        <div className={s.hdrGrid} />
        <div className={s.hdrOrb} />
        <div className={s.hdrContent}>
          <div className={s.hdrEyebrow}>
            <span className={s.hdrEyebrowDot} />
            <span>HR Portal</span>
          </div>
          <div className={s.hdrMain}>
            <div>
              <h2 className={s.hdrTitle}>HR Dashboard</h2>
              <p className={s.hdrSub}>Complete overview of all employee exits</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className={s.statsGrid}>
        <StatCard label="Pending HR Review"  value={pending.length}    icon={<List size={20} />}           color="#9D247D" sub="Awaiting your action" />
        <StatCard label="Clearance Running"  value={clearance.length}  icon={<AlertTriangle size={20} />}  color="#0369A1" sub="IT & Admin in progress" />
        <StatCard label="Settlement Pending" value={settlement.length} icon={<DollarSign size={20} />}    color="#D97706" sub="Ready for settlement" />
        <StatCard label="Completed"          value={completed.length}  icon={<UserCheck size={20} />}     color="#16A34A" sub="Fully processed" />
        <StatCard label="Total Exits"        value={requests.length}   icon={<BarChart2 size={20} />}     color="#27235C" />
        <StatCard label="High Risk Exits"    value={highRisk.length}   icon={<AlertTriangle size={20} />}  color="#DC2626" sub="Needs attention" />
      </div>

      {/* ── Pending alert table ── */}
      {pending.length > 0 && (
        <div className={s.alertCard}>
          <div className={s.alertHdr}>
            <div className={s.alertLeft}>
              <span className={s.alertDot} />
              <span className={s.alertTitle}>Pending Your Review</span>
              <span className={s.alertBadge}>{pending.length}</span>
            </div>
            <Link to="/hr/exit-requests" className={s.viewAll}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className={s.alertTable}>
            <div className={s.tHead}>
              <span>Employee</span>
              <span>Status</span>
              <span>Risk</span>
              <span>Last Day</span>
              <span></span>
            </div>
            {pending.slice(0, 5).map(r => (
              <div key={r.id} className={s.tRow}>
                <span>
                  <strong>{r.employeeName}</strong>
                  <small>{r.employeeCode}</small>
                </span>
                <span><StatusBadge status={r.status} /></span>
                <span><RiskBadge risk={r.riskLevel} /></span>
                <span className={s.date}>
                  {new Date(r.proposedLastWorkingDate).toLocaleDateString('en-GB')}
                </span>
                <span>
                  <Link to="/hr/exit-requests" className={s.reviewBtn}>Review</Link>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick navigation ── */}
      <div className={s.section}>
        <div className={s.sectionHdr}>Quick Actions</div>
        <div className={s.quickGrid}>
          {quickLinks.map(q => (
            <Link key={q.to} to={q.to} className={s.qCard}>
              <div className={s.qIcon} style={{ background: q.bg, color: q.c }}>
                {q.ic}
              </div>
              <div className={s.qText}>
                <span className={s.qTitle}>{q.t}</span>
                <span className={s.qDesc}>{q.d}</span>
              </div>
              <ArrowRight size={14} className={s.qArr} />
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
