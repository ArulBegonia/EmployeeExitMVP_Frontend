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
  RefreshCw, FileText, AlertTriangle,
  Calendar, Clock, MessageSquare, ArrowRight
} from 'lucide-react'
import s from './ManagerMyStatus.module.css'

export default function ManagerMyStatus() {
  const [st,        setSt]        = useState(null)
  const [loading,   setL]         = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const nav = useNavigate()

  const load = () => {
    setL(true)
    setForbidden(false)
    api.get('/Exit/my-exit-status')
      .then(r => setSt(r.data?.data || r.data))
      .catch((err) => {
        if (err.response?.status === 403) { setForbidden(true); setSt(null) }
        else { setSt(null) }
      })
      .finally(() => setL(false))
  }
  useEffect(() => { load() }, [])

  if (loading) return <Loader />

  /* ── Forbidden ── */
  if (forbidden) return (
    <div className={s.pg}>
      <div className={s.hdr}>
        <div className={s.hdrGrid} />
        <div className={s.hdrOrb} />
        <div className={s.hdrContent}>
          <div className={s.hdrEyebrow}>
            <span className={s.hdrEyebrowDot} />
            <span>Manager Portal</span>
          </div>
          <div className={s.hdrMain}>
            <div>
              <h2 className={s.hdrTitle}>My Exit Status</h2>
              <p className={s.hdrSub}>Track your own exit progress</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <div className={s.forbiddenWrap}>
          <div className={s.forbiddenIconWrap}>
            <AlertTriangle size={26} />
          </div>
          <h3 className={s.forbiddenTitle}>Backend Update Needed</h3>
          <p className={s.forbiddenSub}>
            The{' '}
            <code className={s.inlineCode}>GET /api/Exit/my-exit-status</code>
            {' '}endpoint currently only allows <strong>EMPLOYEE</strong> role.
            To let Managers track their own exit, update the controller.
          </p>
          <div className={s.codeBlock}>
            <div className={s.codeRed}>{'// Current:'}</div>
            <div>[Authorize(Roles = "EMPLOYEE")]</div>
            <br />
            <div className={s.codeGreen}>{'// Change to:'}</div>
            <div>[Authorize(Roles = "EMPLOYEE,MANAGER")]</div>
            <br />
            <div className={s.codeMuted}>{'// Apply to both:'}</div>
            <div>{'// → GetMyExitStatus()'}</div>
            <div>{'// → Resign()'}</div>
          </div>
          <div className={s.forbiddenActions}>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw size={13} /> Retry
            </Button>
            <Button variant="primary" onClick={() => nav('/manager/resign')}>
              Go to My Resignation
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )

  /* ── No exit request ── */
  if (!st) return (
    <div className={s.pg}>
      <div className={s.hdr}>
        <div className={s.hdrGrid} />
        <div className={s.hdrOrb} />
        <div className={s.hdrContent}>
          <div className={s.hdrEyebrow}>
            <span className={s.hdrEyebrowDot} />
            <span>Manager Portal</span>
          </div>
          <div className={s.hdrMain}>
            <div>
              <h2 className={s.hdrTitle}>My Exit Status</h2>
              <p className={s.hdrSub}>Track your own exit progress</p>
            </div>
          </div>
        </div>
      </div>

      <div className={s.emptyWrap}>
        <div className={s.emptyVisual}>
          <div className={s.emptyRing1} />
          <div className={s.emptyRing2} />
          <div className={s.emptyIconWrap}>
            <FileText size={26} />
          </div>
        </div>
        <div className={s.emptyText}>
          <h3>No Exit Request</h3>
          <p>You haven't submitted a resignation yet.</p>
        </div>
        <Button variant="primary" onClick={() => nav('/manager/resign')}>
          Submit Resignation <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  )

  /* ── Active exit request ── */
  const daysLeft = Math.max(0, Math.ceil(
    (new Date(st.proposedLastWorkingDate) - new Date()) / 86400000
  ))

  return (
    <div className={s.pg}>

      {/* Page Header */}
      <div className={s.hdr}>
        <div className={s.hdrGrid} />
        <div className={s.hdrOrb} />
        <div className={s.hdrContent}>
          <div className={s.hdrEyebrow}>
            <span className={s.hdrEyebrowDot} />
            <span>Manager Portal</span>
          </div>
          <div className={s.hdrMain}>
            <div>
              <h2 className={s.hdrTitle}>My Exit Request <span className={s.hdrId}>#{st.exitRequestId}</span></h2>
              <p className={s.hdrSub}>Track your own exit progress</p>
            </div>
            <button className={s.refreshBtn} onClick={load}>
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status + Timeline */}
      <Card className={s.timelineCard}>
        <div className={s.cardHdr}>
          <div className={s.cardHdrIcon}><Clock size={14} /></div>
          <span>Approval Flow</span>
        </div>
        <div className={s.badgeRow}>
          <StatusBadge status={st.status} />
          {st.riskLevel && <RiskBadge risk={st.riskLevel} />}
        </div>
        <div className={s.timelineWrap}>
          <StepTimeline status={st.status} />
        </div>
      </Card>

      {/* Key facts grid */}
      <div className={s.factsGrid}>
        <Card className={s.factCard}>
          <div className={s.factIcon}><Calendar size={16} /></div>
          <div className={s.factLabel}>Last Working Date</div>
          <div className={s.factVal}>
            {new Date(st.proposedLastWorkingDate).toLocaleDateString('en-GB', {
              day: '2-digit', month: 'long', year: 'numeric'
            })}
          </div>
        </Card>

        {st.status !== 'Completed' && st.status !== 'Rejected' && (
          <Card className={s.factCard}>
            <div className={s.factIcon}><Clock size={16} /></div>
            <div className={s.factLabel}>Days Remaining</div>
            <div className={`${s.factVal} ${daysLeft <= 7 ? s.factValUrgent : ''}`}>
              {daysLeft} days
            </div>
          </Card>
        )}
      </div>

      {/* Reason */}
      {st.resignationReason && (
        <Card className={s.reasonCard}>
          <div className={s.cardHdr}>
            <div className={s.cardHdrIcon}><MessageSquare size={14} /></div>
            <span>Resignation Reason</span>
          </div>
          <div className={s.reasonText}>{st.resignationReason}</div>
        </Card>
      )}
    </div>
  )
}
