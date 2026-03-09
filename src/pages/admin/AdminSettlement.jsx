import React, { useEffect, useState } from 'react'
import api from '../../services/api.js'
import Card from '../../components/common/Card.jsx'
import Button from '../../components/common/Button.jsx'
import Modal from '../../components/common/Modal.jsx'
import Loader from '../../components/common/Loader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import toast from 'react-hot-toast'
import { Banknote, CheckCircle, RefreshCw, XCircle } from 'lucide-react'
import s from './AdminSettlement.module.css'

const RELEVANT_STATUSES = ['SettlementPending']

export default function AdminSettlement() {
  const [list,        setList]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(false)
  const [remarks,     setRemarks]     = useState('')
  const [remarksErr,  setRemarksErr]  = useState('')   // ← NEW
  const [isApproved,  setIsApproved]  = useState(true)
  const [submitting,  setSubmitting]  = useState(false)
  const [selected,    setSelected]    = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/Exit/all-requests')
      .then(r => {
        const data = r.data?.data || r.data || []
        setList(data.filter(x => RELEVANT_STATUSES.includes(x.status)))
      })
      .catch(() => toast.error('Failed to load settlement list'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openModal = (row) => {
    setSelected(row)
    setRemarks('')
    setRemarksErr('')
    setIsApproved(true)
    setModal(true)
  }

  const closeModal = () => {
    setModal(false)
    setSelected(null)
    setRemarks('')
    setRemarksErr('')
    setIsApproved(true)
  }

  // ── NEW: validate remarks ──
  const validateRemarks = () => {
    if (!isApproved && !remarks.trim()) {
      setRemarksErr('Rejection reason is required.')
      return false
    }
    if (remarks.length > 1000) {
      setRemarksErr('Remarks must not exceed 1000 characters.')
      return false
    }
    setRemarksErr('')
    return true
  }

  const handleSettle = async () => {
    if (!selected) return
    if (!validateRemarks()) return
    setSubmitting(true)
    try {
      await api.post('/Exit/approve-settlement', {
        exitRequestId: Number(selected.id),
        isApproved,
        remarks: remarks.trim() || null,
      })
      toast.success(isApproved ? 'Settlement approved!' : 'Settlement rejected.')
      closeModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process settlement')
    } finally { setSubmitting(false) }
  }

  if (loading) return <Loader />

  return (
    <div className={s.pg}>

      {/* ── Page Header ── */}
      <div className={s.hdr}>
        <div className={s.hdrGrid} />
        <div className={s.hdrOrb} />
        <div className={s.hdrContent}>
          <div className={s.hdrEyebrow}>
            <span className={s.hdrEyebrowDot} />
            <span>Admin Portal</span>
          </div>
          <div className={s.hdrMain}>
            <div>
              <h2 className={s.hdrTitle}>Settlement Approval</h2>
              <p className={s.hdrSub}>
                Approve final settlement for completed clearance exits
                {list.length > 0 && ` · ${list.length} pending`}
              </p>
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
            <div className={s.emptyIconWrap}><CheckCircle size={26} /></div>
          </div>
          <div className={s.emptyText}>
            <h3>No pending settlements</h3>
            <p>All settlements have been processed.</p>
          </div>
        </div>
      ) : (
        <Card>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Employee</th>
                  <th>Status</th>
                  <th>Last Working Day</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {list.map(row => (
                  <tr key={row.id}>
                    <td className={s.idCell}>#{row.id}</td>
                    <td>
                      <div className={s.empName}>
                        {row.employeeName || row.employeeFullName || `Employee #${row.employeeId}`}
                      </div>
                      {row.employeeCode && (
                        <div className={s.empCode}>{row.employeeCode}</div>
                      )}
                    </td>
                    <td><StatusBadge status={row.status} /></td>
                    <td className={s.dateCell}>
                      {row.proposedLastWorkingDate
                        ? new Date(row.proposedLastWorkingDate).toLocaleDateString('en-GB',
                            { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td>
                      <button className={s.actionBtn} onClick={() => openModal(row)}>
                        <Banknote size={13} />
                        Process Settlement
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Modal ── */}
      {modal && selected && (
        <Modal
          title={`Process Settlement — Exit #${selected.id}`}
          onClose={closeModal}
          size="sm"
        >
          <div className={s.modalBody}>

            <div className={s.modalAlert}>
              <Banknote size={16} />
              <div>
                Processing settlement for{' '}
                <strong>{selected.employeeName || `Exit #${selected.id}`}</strong>.
                This will <strong>complete the exit process</strong> and cannot be undone.
              </div>
            </div>

            <div className={s.summary}>
              <div className={s.summaryRow}>
                <span>Employee</span>
                <strong>{selected.employeeName || `Exit #${selected.id}`}</strong>
              </div>
              {selected.employeeCode && (
                <div className={s.summaryRow}>
                  <span>Employee Code</span>
                  <strong>{selected.employeeCode}</strong>
                </div>
              )}
              <div className={s.summaryRow}>
                <span>Last Working Day</span>
                <strong>
                  {selected.proposedLastWorkingDate
                    ? new Date(selected.proposedLastWorkingDate).toLocaleDateString('en-GB',
                        { day: '2-digit', month: 'long', year: 'numeric' })
                    : '—'}
                </strong>
              </div>
            </div>

            <div className={s.decToggle}>
              <button type="button"
                className={`${s.decBtn} ${isApproved ? s.decOk : ''}`}
                onClick={() => { setIsApproved(true); setRemarksErr('') }}>
                <CheckCircle size={14} /> Approve
              </button>
              <button type="button"
                className={`${s.decBtn} ${!isApproved ? s.decErr : ''}`}
                onClick={() => { setIsApproved(false); setRemarksErr('') }}>
                <XCircle size={14} /> Reject
              </button>
            </div>

            {/* ── Remarks with inline error + char counter ── */}
            <div className={s.field}>
              <label>
                Remarks{' '}
                {!isApproved
                  ? <span className={s.req}>*</span>
                  : <em className={s.opt}>(Optional)</em>}
              </label>
              <textarea
                rows={3}
                value={remarks}
                style={{ borderColor: remarksErr ? '#DC2626' : undefined }}
                onChange={e => {
                  setRemarks(e.target.value)
                  if (remarksErr) setRemarksErr('')
                }}
                placeholder={isApproved
                  ? 'Add settlement notes, final dues, etc...'
                  : 'Reason for rejection (required)'}
              />
              {/* ── NEW: char counter ── */}
              <span className={s.charCount}
                style={{ color: remarks.length > 1000 ? '#DC2626' : undefined }}>
                {remarks.length}/1000
              </span>
              {/* ── NEW: inline error ── */}
              {remarksErr && <span className={s.fieldErr}>{remarksErr}</span>}
            </div>

            <div className={s.modalActions}>
              <Button variant="ghost" onClick={closeModal}>Cancel</Button>
              <Button
                variant={isApproved ? 'success' : 'danger'}
                loading={submitting}
                disabled={!isApproved && !remarks.trim()}
                onClick={handleSettle}
              >
                {isApproved
                  ? <><CheckCircle size={14} /> Confirm Settlement</>
                  : <><XCircle size={14} /> Reject Settlement</>}
              </Button>
            </div>

          </div>
        </Modal>
      )}
    </div>
  )
}
