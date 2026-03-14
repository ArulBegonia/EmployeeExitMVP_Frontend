import React, { useEffect, useState } from 'react'
import api from '../../services/api.js'
import Card from '../../components/common/Card.jsx'
import Button from '../../components/common/Button.jsx'
import Modal from '../../components/common/Modal.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import RiskBadge from '../../components/common/RiskBadge.jsx'
import StepTimeline from '../../components/common/StepTimeline.jsx'
import Loader from '../../components/common/Loader.jsx'
import toast from 'react-hot-toast'
import {
  RefreshCw, CheckCircle, XCircle, Eye,
  Plus, Trash2, GitBranch, AlertTriangle,
  Calendar, User, Clock, ArrowRight
} from 'lucide-react'
import { format } from 'date-fns'
import s from './ManagerApprovals.module.css'

export default function ManagerApprovals() {
  const [list, setList]         = useState([])
  const [loading, setL]         = useState(true)
  const [selected, setSel]      = useState(null)
  const [viewOnly, setVO]       = useState(false)
  const [dec, setDec]           = useState({ isApproved: true, remarks: '' })
  const [decErrors, setDecErrors] = useState({})    
  const [ktTasks, setKtTasks]   = useState([])
  const [taskInput, setTaskInput] = useState({ title: '', description: '', deadline: '' })
  const [taskErrors, setTaskErrors] = useState({})
  const [saving, setSave]       = useState(false)
  const [history, setHist]      = useState([])
  const [histLoad, setHL]       = useState(false)
  

  const load = () => {
    setL(true)
    api.get('/Exit/pending-for-manager')
      .then(r => setList(r.data?.data || r.data || []))
      .catch(() => setList([]))
      .finally(() => setL(false))
  }
  useEffect(() => { load() }, [])

  const loadHistory = async (id) => {
    setHL(true)
    try {
      const r = await api.get(`/Exit/history/${id}`)
      setHist(r.data?.data || r.data || [])
    } catch { setHist([]) }
    finally { setHL(false) }
  }

  const openDetail = (r) => {
    setSel(r); setVO(true)
    setDec({ isApproved: true, remarks: '' })
    setDecErrors({})
    setKtTasks([])
    setTaskErrors({})
    loadHistory(r.id)
  }

  const openApprove = (r, approved) => {
    setSel(r); setVO(false)
    setDec({ isApproved: approved, remarks: '' })
    setDecErrors({})
    setKtTasks([])
    setTaskInput({ title: '', description: '', deadline: '' })
    setTaskErrors({})
  }

  // ── NEW: validate KT task input ──
  const validateTaskInput = () => {
    const errs = {}
    if (!taskInput.title.trim())
      errs.title = 'Task title is required.'
    else if (taskInput.title.trim().length > 200)
      errs.title = 'Title must not exceed 200 characters.'

    // Duplicate title check
    if (taskInput.title.trim() &&
      ktTasks.some(t => t.title.trim().toLowerCase() ===
        taskInput.title.trim().toLowerCase()))
      errs.title = `A task named "${taskInput.title.trim()}" already exists.`

    if (!taskInput.deadline)
      errs.deadline = 'Deadline is required.'
    else if (new Date(taskInput.deadline) < new Date(format(new Date(), 'yyyy-MM-dd')))
      errs.deadline = 'Deadline cannot be in the past.'
    else {
      const lwd = selected?.proposedLastWorkingDate
      if (lwd && new Date(taskInput.deadline) > new Date(lwd))
        errs.deadline = `Must be on or before last working day (${
          new Date(lwd).toLocaleDateString('en-GB')}).`
    }

    if (taskInput.description && taskInput.description.length > 500)
      errs.description = 'Description must not exceed 500 characters.'

    setTaskErrors(errs)
    return Object.keys(errs).length === 0
  }

  const addTask = () => {
    if (!validateTaskInput()) return
    setKtTasks(p => [...p, { ...taskInput }])
    setTaskInput({ title: '', description: '', deadline: '' })
    setTaskErrors({})
  }

  const removeTask = (idx) => setKtTasks(p => p.filter((_, i) => i !== idx))

  // ── NEW: validate decision before submit ──
  const validateDecision = () => {
    const errs = {}
    if (!dec.isApproved && !dec.remarks.trim())
      errs.remarks = 'Rejection reason is required.'
    if (dec.remarks && dec.remarks.length > 1000)
      errs.remarks = 'Remarks must not exceed 1000 characters.'
    setDecErrors(errs)
    return Object.keys(errs).length === 0
  }

  const submit = async () => {
    if (!validateDecision()) return
    setSave(true)
    try {
      await api.post('/Exit/manager-approval', {
        exitRequestId: selected.id,
        isApproved:    dec.isApproved,
        remarks:       dec.remarks || null,
        ktTasks: dec.isApproved && ktTasks.length > 0
          ? ktTasks.map(t => ({
              title:       t.title,
              description: t.description || null,
              deadline:    new Date(t.deadline).toISOString()
            }))
          : null,
      })
      toast.success(dec.isApproved ? 'Request approved!' : 'Request rejected.')
      setSel(null); load()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Action failed')
    } finally { setSave(false) }
  }

  if (loading) return <Loader />

  if (list.length === 0) return (
    <div className={s.emptyWrap}>
      <div className={s.emptyVisual}>
        <div className={s.emptyRing1} />
        <div className={s.emptyRing2} />
        <div className={s.emptyIconWrap}><CheckCircle size={28} /></div>
      </div>
      <div className={s.emptyText}>
        <h3>All caught up!</h3>
        <p>No pending approvals from your team right now.</p>
      </div>
      <Button variant="ghost" size="sm" onClick={load}>
        <RefreshCw size={13} /> Check again
      </Button>
    </div>
  )

  const lwdForInput = selected?.proposedLastWorkingDate
    ? format(new Date(selected.proposedLastWorkingDate), 'yyyy-MM-dd')
    : undefined

  const getStageLabel = (status) => {
    if (status === 'PendingL1Approval') return { label: 'L1 Review', cls: s.stageL1 }
    if (status === 'PendingL2Approval') return { label: 'L2 Review', cls: s.stageL2 }
    return { label: status, cls: s.stageDefault }
  }

  return (
    <div className={s.pg}>

      {/* ── Page Header ── */}
      <div className={s.hdr}>
        <div className={s.hdrGrid} />
        <div className={s.hdrOrb} />
        <div className={s.hdrContent}>
          <div className={s.hdrMain}>
            <div>
              <h2 className={s.hdrTitle}>Pending Approvals</h2>
              <p className={s.hdrSub}>
                {list.length} request{list.length !== 1 ? 's' : ''} awaiting your decision
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Card List ── */}
      <div className={s.cards}>
        {list.map(r => {
          const stage    = getStageLabel(r.status)
          const daysLeft = Math.max(0, Math.ceil(
            (new Date(r.proposedLastWorkingDate) - new Date()) / 86400000
          ))
          const isHighRisk = r.riskLevel === 'High' || r.riskLevel === 'Critical'

          return (
            <Card key={r.id} className={`${s.rc} ${isHighRisk ? s.rcHighRisk : ''}`}>
              {isHighRisk && <div className={s.riskStripe} />}
              <div className={s.rtop}>
                <div className={s.rAvatar}>{r.employeeName?.charAt(0) || 'E'}</div>
                <div className={s.rtopMeta}>
                  <div className={s.rname}>{r.employeeName}</div>
                  <div className={s.rcodeRow}>
                    <span className={s.rcode}>{r.employeeCode}</span>
                    {r.department && <span className={s.rdept}>{r.department}</span>}
                  </div>
                </div>
              </div>
              <div className={s.rbadges}>
                <span className={`${s.rStage} ${stage.cls}`}>{stage.label}</span>
                <RiskBadge risk={r.riskLevel} />
              </div>
              <div className={s.rfacts}>
                <div className={s.rfact}>
                  <span className={s.rfactLabel}>Last Day</span>
                  <strong className={s.rfactVal}>
                    {new Date(r.proposedLastWorkingDate).toLocaleDateString('en-GB')}
                  </strong>
                </div>
                <div className={s.rfact}>
                  <span className={s.rfactLabel}>Days Left</span>
                  <strong className={`${s.rfactVal} ${daysLeft <= 7 ? s.rfactUrgent : ''}`}>
                    {daysLeft}d
                  </strong>
                </div>
                <div className={s.rfact}>
                  <span className={s.rfactLabel}>KT</span>
                  <strong className={r.isKtCompleted ? s.rfactOk : s.rfactErr}>
                    {r.isKtCompleted ? '✓' : '✗'}
                  </strong>
                </div>
              </div>
              <div className={s.rreason}>{r.resignationReason || '—'}</div>
              <div className={s.racts}>
                <button className={`${s.ractIcon} ${s.ractView}`}
                  title="View Details" onClick={() => openDetail(r)}>
                  <Eye size={14} /><span className={s.ractLabel}>View</span>
                </button>
                <button className={`${s.ractIcon} ${s.ractApprove}`}
                  title="Approve Request" onClick={() => openApprove(r, true)}>
                  <CheckCircle size={14} /><span className={s.ractLabel}>Approve</span>
                </button>
                <button className={`${s.ractIcon} ${s.ractReject}`}
                  title="Reject Request" onClick={() => openApprove(r, false)}>
                  <XCircle size={14} /><span className={s.ractLabel}>Reject</span>
                </button>
              </div>
            </Card>
          )
        })}
      </div>

      {/* ── View Details Modal ── */}
      {selected && viewOnly && (
        <Modal title={`Exit Details — ${selected.employeeName}`}
          onClose={() => setSel(null)} size="lg">
          <div className={s.detail}>
            <div className={s.dGrid}>
              <div className={s.dCell}><span>Employee</span><strong>{selected.employeeName}</strong></div>
              <div className={s.dCell}><span>Code</span><strong>{selected.employeeCode}</strong></div>
              <div className={s.dCell}><span>Status</span><StatusBadge status={selected.status} /></div>
              <div className={s.dCell}><span>Risk</span><RiskBadge risk={selected.riskLevel} /></div>
              <div className={s.dCell}><span>Reason</span><strong>{selected.resignationReason || '—'}</strong></div>
              <div className={s.dCell}>
                <span>Last Day</span>
                <strong>
                  {new Date(selected.proposedLastWorkingDate)
                    .toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </strong>
              </div>
            </div>
            <div>
              <div className={s.subHdr}>
                <div className={s.subHdrIcon}><Clock size={13} /></div>Approval Flow
              </div>
              <div className={s.timelineWrap}><StepTimeline status={selected.status} /></div>
            </div>
            <div>
              <div className={s.subHdr}>
                <div className={s.subHdrIcon}><User size={13} /></div>Approval History
              </div>
              {histLoad ? (
                <div className={s.histLoading}>Loading history...</div>
              ) : history.length === 0 ? (
                <div className={s.histEmpty}>No history recorded yet.</div>
              ) : (
                <div className={s.hist}>
                  {history.map((h, i) => (
                    <div key={i} className={s.hItem}>
                      <div className={`${s.hDot} ${
                        h.action?.toLowerCase().includes('reject') ? s.hDotRed : s.hDotGreen}`} />
                      <div className={s.hBody}>
                        <div className={s.hTop}>
                          <strong className={s.hActor}>{h.performedBy || h.role}</strong>
                          <span className={s.hAction}>{h.action}</span>
                          <span className={s.hTime}>
                            {h.performedAt
                              ? new Date(h.performedAt).toLocaleDateString('en-GB',
                                  { day: '2-digit', month: 'short', year: 'numeric' })
                              : ''}
                          </span>
                        </div>
                        {h.remarks && <div className={s.hRemarks}>"{h.remarks}"</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={s.dacts}>
              <Button variant="ghost" onClick={() => setSel(null)}>Close</Button>
              <Button variant="success"
                onClick={() => { setVO(false); setDec({ isApproved: true, remarks: '' }); setDecErrors({}) }}>
                Approve This Request <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Approve / Reject Modal ── */}
      {selected && !viewOnly && (
        <Modal
          title={`${dec.isApproved ? 'Approve' : 'Reject'} — ${selected.employeeName}`}
          onClose={() => setSel(null)} size="lg">
          <div className={s.conf}>

            <div className={dec.isApproved ? s.intentApprove : s.intentReject}>
              <div className={s.intentIcon}>
                {dec.isApproved ? <CheckCircle size={18} /> : <XCircle size={18} />}
              </div>
              <div className={s.intentBody}>
                <strong>
                  {dec.isApproved ? 'Approving this request' : 'Rejecting this request'}
                </strong>
                <p>
                  {dec.isApproved
                    ? 'This will move the request to the next approval stage.'
                    : 'This will reject the request and notify the employee.'}
                </p>
              </div>
            </div>

            <div className={s.cInfo}>
              <div className={s.dCell}>
                <span>Employee</span>
                <strong>{selected.employeeName} ({selected.employeeCode})</strong>
              </div>
              <div className={s.dCell}>
                <span>Last Day</span>
                <strong>{new Date(selected.proposedLastWorkingDate).toLocaleDateString('en-GB')}</strong>
              </div>
              <div className={s.dCell}><span>Stage</span><StatusBadge status={selected.status} /></div>
              <div className={s.dCell}><span>Risk</span><RiskBadge risk={selected.riskLevel} /></div>
            </div>

            {/* ── Remarks with inline error ── */}
            <div className={s.fld}>
              <label className={s.flabel}>
                Remarks
                {!dec.isApproved
                  ? <span className={s.req}>*</span>
                  : <span className={s.opt}>(Optional)</span>}
              </label>
              <textarea
                className={`${s.ftextarea} ${decErrors.remarks ? s.inputErr : ''}`}
                rows={3}
                placeholder={dec.isApproved
                  ? 'Add any optional remarks...'
                  : 'Reason for rejection (required)'}
                value={dec.remarks}
                onChange={e => {
                  setDec(p => ({ ...p, remarks: e.target.value }))
                  if (decErrors.remarks)
                    setDecErrors(p => ({ ...p, remarks: undefined }))
                }}
              />
              {/* ── char counter ── */}
              <span className={s.charCount}
                style={{ color: dec.remarks.length > 1000 ? '#DC2626' : undefined }}>
                {dec.remarks.length}/1000
              </span>
              {decErrors.remarks && (
                <span className={s.fieldErr}>{decErrors.remarks}</span>
              )}
            </div>

            {/* ── KT Tasks with inline errors ── */}
            {dec.isApproved && (
              <div className={s.ktSection}>
                <div className={s.ktHdr}>
                  <div className={s.ktHdrIcon}><GitBranch size={14} /></div>
                  <div>
                    <div className={s.ktHdrTitle}>
                      Assign KT Tasks <span className={s.opt}>(Optional)</span>
                    </div>
                    <div className={s.ktHdrSub}>
                      Deadlines must be on or before{' '}
                      {new Date(selected.proposedLastWorkingDate).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                </div>

                <div className={s.taskInputRow}>
                  <div className={s.taskInputField}>
                    <input
                      className={`${s.tinput} ${taskErrors.title ? s.inputErr : ''}`}
                      placeholder="Task title *"
                      value={taskInput.title}
                      onChange={e => {
                        setTaskInput(p => ({ ...p, title: e.target.value }))
                        if (taskErrors.title)
                          setTaskErrors(p => ({ ...p, title: undefined }))
                      }}
                    />
                    {taskErrors.title && (
                      <span className={s.fieldErr}>{taskErrors.title}</span>
                    )}
                  </div>
                  <div className={s.taskInputField}>
                    <input
                      className={`${s.tinput} ${taskErrors.description ? s.inputErr : ''}`}
                      placeholder="Description (optional)"
                      value={taskInput.description}
                      onChange={e => {
                        setTaskInput(p => ({ ...p, description: e.target.value }))
                        if (taskErrors.description)
                          setTaskErrors(p => ({ ...p, description: undefined }))
                      }}
                    />
                    {taskErrors.description && (
                      <span className={s.fieldErr}>{taskErrors.description}</span>
                    )}
                  </div>
                  <div className={s.taskInputField}>
                    <input
                      className={`${s.tinput} ${taskErrors.deadline ? s.inputErr : ''}`}
                      type="date"
                      min={format(new Date(), 'yyyy-MM-dd')}
                      max={lwdForInput}
                      value={taskInput.deadline}
                      onChange={e => {
                        setTaskInput(p => ({ ...p, deadline: e.target.value }))
                        if (taskErrors.deadline)
                          setTaskErrors(p => ({ ...p, deadline: undefined }))
                      }}
                    />
                    {taskErrors.deadline && (
                      <span className={s.fieldErr}>{taskErrors.deadline}</span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={addTask}>
                    <Plus size={13} /> Add
                  </Button>
                </div>

                {ktTasks.length > 0 ? (
                  <div className={s.taskList}>
                    {ktTasks.map((t, i) => (
                      <div key={i} className={s.taskItem}>
                        <div className={s.taskItemIcon}><GitBranch size={12} /></div>
                        <div className={s.taskInfo}>
                          <span className={s.taskTitle}>{t.title}</span>
                          {t.description && <span className={s.taskDesc}>{t.description}</span>}
                          <span className={s.taskDeadline}>
                            <Calendar size={10} />
                            Due: {new Date(t.deadline).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                        <button type="button" className={s.removeBtn} onClick={() => removeTask(i)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={s.taskEmpty}>
                    <GitBranch size={16} />
                    <span>No KT tasks added. You can assign them later from the KT dashboard.</span>
                  </div>
                )}
              </div>
            )}

            <div className={s.ca}>
              <Button variant="ghost" onClick={() => setSel(null)}>Cancel</Button>
              <Button
                variant={dec.isApproved ? 'success' : 'danger'}
                loading={saving}
                disabled={!dec.isApproved && !dec.remarks.trim()}
                onClick={submit}
              >
                {dec.isApproved ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {dec.isApproved ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
