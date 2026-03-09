import React, { useEffect, useState } from 'react'
import api from '../../services/api.js'
import Button from '../../components/common/Button.jsx'
import Loader from '../../components/common/Loader.jsx'
import Modal from '../../components/common/Modal.jsx'
import toast from 'react-hot-toast'
import { UserCheck, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'
import s from './HRRehire.module.css'

const DECISIONS = [
  { value: 1, key: 'Eligible',    label: 'Eligible',     color: '#16A34A', icon: <CheckCircle size={13} /> },
  { value: 2, key: 'NotEligible', label: 'Not Eligible', color: '#DC2626', icon: <XCircle size={13} /> },
  { value: 3, key: 'Conditional', label: 'Conditional',  color: '#D97706', icon: <AlertTriangle size={13} /> },
]

function DecisionBadge({ decision }) {
  if (!decision) return (
    <span className={s.notSetBadge}><Clock size={11} /> Not set</span>
  )
  const d = DECISIONS.find(x => x.key === decision)
  if (!d) return (
    <span className={s.notSetBadge}><Clock size={11} /> {decision}</span>
  )
  return (
    <span className={s.decBadge}
      style={{ color: d.color, background: d.color + '15', border: `1px solid ${d.color}30` }}>
      {d.icon} {d.label}
    </span>
  )
}

export default function HRRehire() {
  const [list,     setList]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [form,     setForm]     = useState({ decision: 1, remarks: '', blockMonths: '' })
  const [saving,   setSaving]   = useState(false)
  const [errors,   setErrors]   = useState({})

  const load = () => {
    setLoading(true)
    api.get('/Exit/completed-exits')
      .then(r => setList(r.data?.data || r.data || []))
      .catch(() => toast.error('Failed to load completed exits'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openModal = (row) => {
    setSelected(row)
    const existing = DECISIONS.find(d => d.key === row.rehireDecision)
    setForm({ decision: existing?.value ?? 1, remarks: row.rehireRemarks || '', blockMonths: '' })
    setErrors({})
  }

  const validate = () => {
    const errs = {}
    if (!form.decision)
      errs.decision = 'Please select a decision'

    if (form.decision == 2 && !form.blockMonths)
      errs.blockMonths = 'Block duration is required when marking Not Eligible'
    if (form.decision == 2 && form.blockMonths && (
      isNaN(form.blockMonths) || form.blockMonths < 1 || form.blockMonths > 120
    )) errs.blockMonths = 'Enter a valid number of months (1–120)'

    if (form.remarks && form.remarks.length > 1000)
      errs.remarks = 'Remarks must not exceed 1000 characters.'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      await api.post('/Exit/rehire-eligibility', {
        employeeId:  selected.employeeId || selected.id,
        decision:    Number(form.decision),
        remarks:     form.remarks || null,
        blockMonths: form.decision == 2 && form.blockMonths ? Number(form.blockMonths) : null,
      })
      toast.success('Rehire eligibility updated!')
      setSelected(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update')
    } finally { setSaving(false) }
  }

  if (loading) return <Loader />

  const eligibleCount = list.filter(r => r.rehireDecision === 'Eligible').length
  const pendingCount  = list.filter(r => !r.rehireDecision).length

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
              <h2 className={s.hdrTitle}>Rehire Eligibility</h2>
              <p className={s.hdrSub}>
                Set rehire decisions for employees who have completed their exit process
              </p>
            </div>
            <div className={s.hdrRight}>
              <div className={s.hdrStats}>
                <div className={s.hdrStat}>
                  <span className={s.hdrStatVal}>{list.length}</span>
                  <span className={s.hdrStatLabel}>Total Exits</span>
                </div>
                <div className={s.hdrStatDivider} />
                <div className={s.hdrStat}>
                  <span className={`${s.hdrStatVal} ${s.hdrStatGreen}`}>{eligibleCount}</span>
                  <span className={s.hdrStatLabel}>Eligible</span>
                </div>
                <div className={s.hdrStatDivider} />
                <div className={s.hdrStat}>
                  <span className={`${s.hdrStatVal} ${s.hdrStatAmber}`}>{pendingCount}</span>
                  <span className={s.hdrStatLabel}>Pending Decision</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Empty state ── */}
      {list.length === 0 ? (
        <div className={s.emptyWrap}>
          <div className={s.emptyVisual}>
            <div className={s.emptyRing1} />
            <div className={s.emptyRing2} />
            <div className={s.emptyIconWrap}><UserCheck size={26} /></div>
          </div>
          <div className={s.emptyText}>
            <h3>No completed exits yet</h3>
            <p>Rehire eligibility can only be set after an exit is fully completed.</p>
          </div>
        </div>
      ) : (
        <div className={s.tableCard}>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Last Working Day</th>
                  <th>Completed On</th>
                  <th>Rehire Decision</th>
                  <th>Blocked Until</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row, i) => (
                  <tr key={row.id} className={i % 2 === 0 ? s.trEven : ''}>
                    <td>
                      <div className={s.empName}>{row.employeeName}</div>
                      <div className={s.empCode}>{row.employeeCode}</div>
                    </td>
                    <td className={s.dateCell}>
                      {new Date(row.proposedLastWorkingDate).toLocaleDateString('en-GB',
                        { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className={s.dateCell}>
                      {row.completedDate
                        ? new Date(row.completedDate).toLocaleDateString('en-GB',
                            { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td><DecisionBadge decision={row.rehireDecision} /></td>
                    <td className={s.blockedCell}>
                      {row.rehireBlockedUntil
                        ? <span className={s.blockedPill}>
                            {new Date(row.rehireBlockedUntil).toLocaleDateString('en-GB',
                              { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        : <span className={s.dash}>—</span>}
                    </td>
                    <td>
                      <button className={s.actionBtn} onClick={() => openModal(row)}>
                        <UserCheck size={13} />
                        {row.rehireDecision ? 'Update' : 'Set Decision'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {selected && (
        <Modal
          title={`Rehire Eligibility — ${selected.employeeName}`}
          onClose={() => setSelected(null)}
          size="sm"
        >
          <div className={s.modalBody}>

            <div className={s.empInfo}>
              <div className={s.empInfoCell}>
                <span>Employee</span>
                <strong>{selected.employeeName}</strong>
              </div>
              <div className={s.empInfoCell}>
                <span>Code</span>
                <strong>{selected.employeeCode}</strong>
              </div>
              <div className={s.empInfoCell}>
                <span>Last Day</span>
                <strong>
                  {new Date(selected.proposedLastWorkingDate).toLocaleDateString('en-GB',
                    { day: '2-digit', month: 'long', year: 'numeric' })}
                </strong>
              </div>
              {selected.rehireDecision && (
                <div className={s.empInfoCell}>
                  <span>Current</span>
                  <DecisionBadge decision={selected.rehireDecision} />
                </div>
              )}
            </div>

            {/* Decision selector */}
            <div className={s.field}>
              <label>Rehire Decision <span className={s.req}>*</span></label>
              <div className={s.decisionBtns}>
                {DECISIONS.map(d => (
                  <button key={d.value} type="button"
                    className={`${s.decisionBtn} ${Number(form.decision) === d.value ? s.decisionActive : ''}`}
                    style={Number(form.decision) === d.value ? {
                      borderColor: d.color,
                      background:  d.color + '12',
                      color:       d.color,
                    } : {}}
                    onClick={() => {
                      setForm(p => ({ ...p, decision: d.value }))
                      setErrors(p => ({ ...p, decision: undefined }))
                    }}
                  >
                    {d.icon} {d.label}
                  </button>
                ))}
              </div>
              {errors.decision && <span className={s.err}>{errors.decision}</span>}
            </div>

            {/* Block months — only for NotEligible */}
            {form.decision == 2 && (
              <div className={s.field}>
                <label>Block Duration (Months) <span className={s.req}>*</span></label>
                <input
                  type="number" min="1" max="120"
                  value={form.blockMonths}
                  onChange={e => {
                    setForm(p => ({ ...p, blockMonths: e.target.value }))
                    setErrors(p => ({ ...p, blockMonths: undefined }))
                  }}
                  placeholder="e.g. 12"
                  style={{ borderColor: errors.blockMonths ? '#DC2626' : undefined }}
                />
                {errors.blockMonths && <span className={s.err}>{errors.blockMonths}</span>}
              </div>
            )}

            {/* ── Remarks with char counter ── */}
            <div className={s.field}>
              <label>Remarks <em className={s.opt}>(Optional)</em></label>
              <textarea
                rows={3}
                value={form.remarks}
                style={{ borderColor: errors.remarks ? '#DC2626' : undefined }}
                onChange={e => {
                  setForm(p => ({ ...p, remarks: e.target.value }))
                  if (errors.remarks) setErrors(p => ({ ...p, remarks: undefined }))
                }}
                placeholder="Reason for this decision..."
              />
              {/* ── NEW: char counter ── */}
              <span className={s.charCount}
                style={{ color: form.remarks.length > 1000 ? '#DC2626' : undefined }}>
                {form.remarks.length}/1000
              </span>
              {errors.remarks && <span className={s.err}>{errors.remarks}</span>}
            </div>

            <div className={s.actions}>
              <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={handleSave}>
                <UserCheck size={14} /> Save Decision
              </Button>
            </div>

          </div>
        </Modal>
      )}
    </div>
  )
}
