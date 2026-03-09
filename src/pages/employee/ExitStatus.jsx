import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api.js'
import Card from '../../components/common/Card.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import RiskBadge from '../../components/common/RiskBadge.jsx'
import StepTimeline from '../../components/common/StepTimeline.jsx'
import Loader from '../../components/common/Loader.jsx'
import Button from '../../components/common/Button.jsx'
import {
  RefreshCw, CalendarDays, CheckCircle,
  Clock, AlertTriangle, FileText, ArrowRight
} from 'lucide-react'
import s from './ExitStatus.module.css'

/* ── Status Info Box ── */
function InfoBox({ icon, colorClass, title, msg }) {
  return (
    <div className={`${s.infoBox} ${s[colorClass]}`}>
      <div className={s.infoBoxIcon}>{icon}</div>
      <div className={s.infoBoxBody}>
        <div className={s.infoBoxTitle}>{title}</div>
        <div className={s.infoBoxMsg}>{msg}</div>
      </div>
    </div>
  )
}

const STATUS_INFO = {
  PendingL1Approval:   { icon: <Clock size={16}/>,         colorClass: 'infoIndigo',  title: 'Awaiting L1 Manager',    msg: 'Your resignation has been submitted. Your L1 manager needs to review and approve it.' },
  PendingL2Approval:   { icon: <Clock size={16}/>,         colorClass: 'infoOrange',  title: 'Awaiting L2 Manager',    msg: 'L1 approved. Your L2 manager (senior manager) is next in the approval chain.' },
  PendingHrReview:     { icon: <Clock size={16}/>,         colorClass: 'infoPurple',  title: 'Awaiting HR Review',     msg: 'Both managers approved. HR is reviewing your exit details.' },
  ClearanceInProgress: { icon: <Clock size={16}/>,         colorClass: 'infoBlue',    title: 'Clearance In Progress',  msg: 'HR approved. IT and Admin departments are completing your clearance.' },
  SettlementPending:   { icon: <Clock size={16}/>,         colorClass: 'infoAmber',   title: 'Settlement Pending',     msg: 'All clearance is complete. Awaiting full & final settlement processing.' },
  Completed:           { icon: <CheckCircle size={16}/>,   colorClass: 'infoGreen',   title: 'Exit Completed 🎉',      msg: 'Your exit is fully complete. Contact HR to collect your documents.' },
  Rejected:            { icon: <AlertTriangle size={16}/>, colorClass: 'infoRed',     title: 'Request Rejected',       msg: 'Your exit request was rejected. Please contact HR for more information.' },
}

export default function ExitStatus() {
  const [st, setSt]     = useState(null)
  const [loading, setL] = useState(true)
  const nav = useNavigate()

  const load = () => {
    setL(true)
    api.get('/Exit/my-exit-status')
      .then(r => setSt(r.data?.data || r.data))
      .catch(() => setSt(null))
      .finally(() => setL(false))
  }
  useEffect(() => { load() }, [])

  if (loading) return <Loader />

  /* ── Empty State ── */
  if (!st) return (
    <div className={s.empty}>
      <div className={s.emptyVisual}>
        <div className={s.emptyRing1} />
        <div className={s.emptyRing2} />
        <div className={s.emptyIconWrap}>
          <FileText size={26} />
        </div>
      </div>
      <div className={s.emptyText}>
        <h3>No Exit Request Found</h3>
        <p>You haven't submitted a resignation yet. Start the process below.</p>
      </div>
      <Button variant="primary" onClick={() => nav('/employee/resign')}>
        Submit Resignation <ArrowRight size={14} />
      </Button>
    </div>
  )

  const lwd      = new Date(st.proposedLastWorkingDate)
  const daysLeft = Math.max(0, Math.ceil((lwd - new Date()) / 86400000))
  const info     = STATUS_INFO[st.status]

  return (
    <div className={s.pg}>

      {/* ── Page Header ── */}
      <div className={s.hdr}>
        <div className={s.hdrGrid} />
        <div className={s.hdrOrb} />
        <div className={s.hdrContent}>
          <div className={s.hdrEyebrow}>
            <span className={s.hdrEyebrowDot} />
            <span>Exit Management</span>
          </div>
          <div className={s.hdrMain}>
            <div>
              <h2 className={s.hdrTitle}>Exit Request #{st.exitRequestId}</h2>
              <p className={s.hdrSub}>Track your complete exit process in real time</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Timeline Card ── */}
      <Card>
        <div className={s.timelineHeader}>
          <div className={s.secHeader}>
            <div className={s.secIconWrap}>
              <CheckCircle size={15} />
            </div>
            <div>
              <div className={s.secTitle}>Exit Progress</div>
              <div className={s.secSub}>Live stage-by-stage workflow status</div>
            </div>
          </div>
          <div className={s.badges}>
            <StatusBadge status={st.status} />
            {st.riskLevel && <RiskBadge risk={st.riskLevel} />}
          </div>
        </div>
        <div className={s.timelineWrap}>
          <StepTimeline status={st.status} />
        </div>
      </Card>

      {/* ── Dates + Info Grid ── */}
      <div className={s.grid}>

        {/* Key Dates */}
        <Card>
          <div className={s.secHeader}>
            <div className={s.secIconWrap}>
              <CalendarDays size={15} />
            </div>
            <div>
              <div className={s.secTitle}>Key Dates</div>
              <div className={s.secSub}>Important milestones for your exit</div>
            </div>
          </div>

          <div className={s.dates}>
            <div className={s.dateRow}>
              <div className={s.dateIconWrap}>
                <Clock size={15} />
              </div>
              <div className={s.dateBody}>
                <div className={s.dateLabel}>Proposed Last Working Date</div>
                <div className={s.dateVal}>
                  {lwd.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                {st.status !== 'Completed' && st.status !== 'Rejected' && (
                  <div className={s.daysLeft}>
                    <span className={s.daysLeftDot} />
                    {daysLeft} days remaining
                  </div>
                )}
              </div>
            </div>

            {st.completedDate && (
              <div className={s.dateRow}>
                <div className={s.dateIconWrapGreen}>
                  <CheckCircle size={15} />
                </div>
                <div className={s.dateBody}>
                  <div className={s.dateLabel}>Exit Completed On</div>
                  <div className={s.dateVal}>
                    {new Date(st.completedDate).toLocaleDateString('en-GB',
                      { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* What's Happening Now */}
        <Card>
          <div className={s.secHeader}>
            <div className={s.secIconWrap}>
              <Clock size={15} />
            </div>
            <div>
              <div className={s.secTitle}>What's Happening Now</div>
              <div className={s.secSub}>Current stage details</div>
            </div>
          </div>
          {info && <InfoBox {...info} />}
        </Card>

      </div>

      {/* ── Resignation Reason ── */}
      {st.resignationReason && (
        <Card>
          <div className={s.secHeader}>
            <div className={s.secIconWrap}>
              <FileText size={15} />
            </div>
            <div>
              <div className={s.secTitle}>Resignation Reason</div>
              <div className={s.secSub}>Your stated reason for leaving</div>
            </div>
          </div>
          <div className={s.reason}>{st.resignationReason}</div>
        </Card>
      )}

    </div>
  )
}
