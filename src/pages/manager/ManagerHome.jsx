import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api.js'
import Card from '../../components/common/Card.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import RiskBadge from '../../components/common/RiskBadge.jsx'
import Loader from '../../components/common/Loader.jsx'
import {
  ClipboardCheck, GitBranch, Users, FileText,
  ArrowRight, CheckCircle, AlertTriangle
} from 'lucide-react'
import s from './ManagerHome.module.css'

const QUICK_ACTIONS = [
  {
    to: '/manager/approvals',
    icon: <ClipboardCheck size={20} />,
    colorClass: 'qaIndigo',
    title: 'Team Approvals',
    desc:  'Review pending exit requests',
  },
  {
    to: '/manager/kt',
    icon: <GitBranch size={20} />,
    colorClass: 'qaPurple',
    title: 'Knowledge Transfer',
    desc:  'Update KT status for exits',
  },
  {
    to: '/manager/resign',
    icon: <FileText size={20} />,
    colorClass: 'qaBlue',
    title: 'My Resignation',
    desc:  'Submit your own resignation',
  },
]

export default function ManagerHome() {
  const [pending, setPending] = useState([])
  const [myExit,  setMyExit]  = useState(null)
  const [loading, setL]       = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/Exit/pending-for-manager')
        .then(r => r.data?.data || r.data || [])
        .catch(() => []),
      api.get('/Exit/my-exit-status')
        .then(r => r.data?.data || r.data)
        .catch(err => {
          if (err.response?.status === 403 || err.response?.status === 401) return null
          return null
        }),
    ]).then(([p, m]) => {
      setPending(Array.isArray(p) ? p : [])
      setMyExit(m)
    }).finally(() => setL(false))
  }, [])

  if (loading) return <Loader />

  const highRisk  = pending.filter(p => p.riskLevel === 'High' || p.riskLevel === 'Critical').length
  const ktPending = pending.filter(p => !p.isKtCompleted).length

  return (
    <div className={s.pg}>

      {/* ── Page Header ── */}
      <div className={s.hdr}>
        <div className={s.hdrGrid} />
        <div className={s.hdrOrb} />
        <div className={s.hdrContent}>
          <div className={s.hdrEyebrow}>
            <span className={s.hdrEyebrowDot} />
            <span>Manager Portal</span>
          </div>
          <h2 className={s.hdrTitle}>Manager Dashboard</h2>
          <p className={s.hdrSub}>Review team exits and manage your own process</p>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className={s.stats}>
        <StatCard
          label="Pending Approvals"
          value={pending.length}
          icon={<ClipboardCheck size={20} />}
          color="#27235C"
        />
        <StatCard
          label="KT Pending"
          value={ktPending}
          icon={<GitBranch size={20} />}
          color="#9D247D"
        />
        <StatCard
          label="High Risk Exits"
          value={highRisk}
          icon={<Users size={20} />}
          color="#DC2626"
        />
      </div>

      {/* ── Pending Approvals Table ── */}
      {pending.length > 0 && (
        <Card>
          <div className={s.secHeader}>
            <div className={s.secIconWrap}>
              <ClipboardCheck size={15} />
            </div>
            <div className={s.secMeta}>
              <div className={s.secTitle}>Awaiting Your Approval</div>
              <div className={s.secSub}>Resignation requests that need your review</div>
            </div>
            <div className={s.secBadge}>{pending.length}</div>
          </div>

          <div className={s.tbl}>
            <div className={s.thead}>
              <span>Employee</span>
              <span>Status</span>
              <span>Risk</span>
              <span>Last Day</span>
              <span></span>
            </div>

            {pending.slice(0, 5).map(r => (
              <div key={r.id} className={s.tr}>
                <div className={s.trEmployee}>
                  <div className={s.trAvatar}>
                    {r.employeeName?.charAt(0) || 'E'}
                  </div>
                  <div>
                    <div className={s.trName}>{r.employeeName}</div>
                    <div className={s.trCode}>{r.employeeCode}</div>
                  </div>
                </div>
                <span><StatusBadge status={r.status} /></span>
                <span><RiskBadge risk={r.riskLevel} /></span>
                <span className={s.trDate}>
                  {new Date(r.proposedLastWorkingDate).toLocaleDateString('en-GB')}
                </span>
                <span>
                  <Link to="/manager/approvals" className={s.reviewBtn}>
                    Review <ArrowRight size={11} />
                  </Link>
                </span>
              </div>
            ))}
          </div>

          {pending.length > 5 && (
            <Link to="/manager/approvals" className={s.viewAll}>
              View all {pending.length} requests
              <ArrowRight size={13} />
            </Link>
          )}
        </Card>
      )}

      {/* ── My Exit Request ── */}
      {myExit && (
        <Card>
          <div className={s.secHeader}>
            <div className={s.secIconWrapGreen}>
              <CheckCircle size={15} />
            </div>
            <div className={s.secMeta}>
              <div className={s.secTitle}>My Exit Request</div>
              <div className={s.secSub}>Your personal resignation status</div>
            </div>
          </div>

          <div className={s.myExitBody}>
            <div className={s.myExitLeft}>
              <div className={s.myExitReqId}>Request #{myExit.exitRequestId}</div>
              <div className={s.myExitLwd}>
                Last Day:{' '}
                <strong>
                  {new Date(myExit.proposedLastWorkingDate).toLocaleDateString('en-GB')}
                </strong>
              </div>
            </div>
            <div className={s.myExitRight}>
              <StatusBadge status={myExit.status} />
              <Link to="/manager/my-status" className={s.reviewBtn}>
                Track <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* ── Quick Actions ── */}
      <div className={s.qaSection}>
        <div className={s.qaSectionHeader}>
          <div className={s.qaSectionTitle}>Quick Actions</div>
          <div className={s.qaSectionSub}>Jump to key areas of your dashboard</div>
        </div>
        <div className={s.qaGrid}>
          {QUICK_ACTIONS.map(q => (
            <Link key={q.to} to={q.to} className={`${s.qaCard} ${s[q.colorClass]}`}>
              <div className={s.qaCardIcon}>{q.icon}</div>
              <div className={s.qaCardBody}>
                <div className={s.qaCardTitle}>{q.title}</div>
                <div className={s.qaCardDesc}>{q.desc}</div>
              </div>
              <ArrowRight size={15} className={s.qaArrow} />
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
