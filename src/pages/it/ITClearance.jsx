import React, { useEffect, useState } from 'react'
import api from '../../services/api.js'
import Card from '../../components/common/Card.jsx'
import Button from '../../components/common/Button.jsx'
import Loader from '../../components/common/Loader.jsx'
import toast from 'react-hot-toast'
import { Shield, CheckCircle, XCircle, RefreshCw, Info, Package } from 'lucide-react'
import s from './ITClearance.module.css'

const RELEVANT_STATUSES = ['ClearanceInProgress']

export default function ITClearance() {
  const [list,         setList]         = useState([])
  const [loading,      setLoading]      = useState(true)
  const [forbidden,    setForbidden]    = useState(false)
  const [itemsMap,     setItemsMap]     = useState({})
  const [itemsLoading, setItemsLoading] = useState({})
  const [itemState,    setItemState]    = useState({})
  const [itemErrors,   setItemErrors]   = useState({})
  const [submittingId, setSubmittingId] = useState(null)

  const load = () => {
    setLoading(true)
    setForbidden(false)
    api.get('/Exit/all-requests')
      .then(r => {
        const data     = r.data?.data || r.data || []
        const filtered = data.filter(x => RELEVANT_STATUSES.includes(x.status))
        setList(filtered)
        filtered.forEach(row => loadItems(row.id))
      })
      .catch(err => {
        if (err.response?.status === 403) setForbidden(true)
        else toast.error('Failed to load IT clearance list')
        setList([])
      })
      .finally(() => setLoading(false))
  }

  const loadItems = async (exitId) => {
    setItemsLoading(p => ({ ...p, [exitId]: true }))
    try {
      const r     = await api.get(`/Exit/clearance-items/${exitId}/IT`)
      const items = r.data?.data || r.data || []
      setItemsMap(p => ({ ...p, [exitId]: items }))
      const initState = {}
      items.forEach(item => {
        initState[item.id] = {
          isCleared:        item.status === 'Cleared',
          remarks:          item.remarks || '',
          returnedDate:     item.returnedDate ? item.returnedDate.split('T')[0] : '',
          pendingDueAmount: item.pendingDueAmount || '',
        }
      })
      setItemState(p => ({ ...p, ...initState }))
    } catch {
      setItemsMap(p => ({ ...p, [exitId]: [] }))
    } finally {
      setItemsLoading(p => ({ ...p, [exitId]: false }))
    }
  }

  useEffect(() => { load() }, [])

  const getItemState = (itemId) =>
    itemState[itemId] || { isCleared: true, remarks: '', returnedDate: '', pendingDueAmount: '' }

  const setField = (itemId, field, value) => {
    setItemState(p => ({ ...p, [itemId]: { ...getItemState(itemId), [field]: value } }))
    setItemErrors(p => ({ ...p, [itemId]: { ...(p[itemId] || {}), [field]: undefined } }))
  }

  const validateItem = (itemId) => {
    const st   = getItemState(itemId)
    const errs = {}

    // ── Return date: required when cleared, cannot be future ──
    if (st.isCleared) {
      if (!st.returnedDate)
        errs.returnedDate = 'Return date is required when marking as cleared.'
      else {
        const rd    = new Date(st.returnedDate); rd.setHours(0, 0, 0, 0)
        const today = new Date();                today.setHours(0, 0, 0, 0)
        if (rd > today) errs.returnedDate = 'Return date cannot be in the future.'
      }
    }

    // ── Return date must NOT be set when not cleared ──
    if (!st.isCleared && st.returnedDate)
      errs.returnedDate = 'Return date should only be set when item is cleared.'

    // ── Pending due amount: must be positive number ──
    if (!st.isCleared && st.pendingDueAmount !== '') {
      const amt = parseFloat(st.pendingDueAmount)
      if (isNaN(amt) || amt < 0)
        errs.pendingDueAmount = 'Amount must be a positive number.'
      else if (amt > 9999999)
        errs.pendingDueAmount = 'Amount seems too large. Please verify.'
    }

    // ── Remarks length ──
    if (st.remarks && st.remarks.length > 500)
      errs.remarks = 'Remarks must not exceed 500 characters.'

    setItemErrors(p => ({ ...p, [itemId]: errs }))
    return Object.keys(errs).length === 0
  }

  const submitItem = async (item, exitId) => {
    if (!validateItem(item.id)) return
    const st = getItemState(item.id)
    setSubmittingId(item.id)
    try {
      await api.post('/Exit/update-clearance-item', {
        itemId:           item.id,
        isCleared:        st.isCleared,
        remarks:          st.remarks || null,
        returnedDate:     st.isCleared && st.returnedDate
                            ? new Date(st.returnedDate).toISOString() : null,
        pendingDueAmount: !st.isCleared && st.pendingDueAmount
                            ? parseFloat(st.pendingDueAmount) : null,
      })
      toast.success(`${item.itemName} — ${st.isCleared ? 'cleared' : 'flagged'}`)
      await loadItems(exitId)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally { setSubmittingId(null) }
  }

  /* ── Forbidden state ── */
  if (forbidden) return (
    <div className={s.pg}>
      <div className={s.hdr}>
        <div className={s.hdrGrid} />
        <div className={s.hdrOrb} />
        <div className={s.hdrContent}>
          <div className={s.hdrEyebrow}>
            <span className={s.hdrEyebrowDot} />
            <span>IT Portal</span>
          </div>
          <div className={s.hdrMain}>
            <div>
              <h2 className={s.hdrTitle}>IT Clearance</h2>
              <p className={s.hdrSub}>Track and clear IT assets for each exiting employee</p>
            </div>
          </div>
        </div>
      </div>
      <div className={s.emptyWrap}>
        <div className={s.emptyVisual}>
          <div className={s.emptyRing1} />
          <div className={s.emptyRing2} />
          <div className={`${s.emptyIconWrap} ${s.emptyIconRed}`}><Shield size={26} /></div>
        </div>
        <div className={s.emptyText}>
          <h3>Permission Update Needed</h3>
          <p>
            The IT role needs access to the{' '}
            <code className={s.inlineCode}>GET /api/Exit/all-requests</code> endpoint.
          </p>
        </div>
      </div>
    </div>
  )

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
            <span>IT Portal</span>
          </div>
          <div className={s.hdrMain}>
            <div>
              <h2 className={s.hdrTitle}>IT Clearance</h2>
              <p className={s.hdrSub}>
                Track and clear IT assets for each exiting employee
                {list.length > 0 && ` · ${list.length} active`}
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
            <div className={`${s.emptyIconWrap} ${s.emptyIconGreen}`}><CheckCircle size={26} /></div>
          </div>
          <div className={s.emptyText}>
            <h3>All Cleared!</h3>
            <p>No exits are currently in the clearance stage.</p>
          </div>
        </div>
      ) : (
        <div className={s.cards}>
          {list.map(row => {
            const items        = itemsMap[row.id] || []
            const isLoading    = itemsLoading[row.id]
            const clearedCount = items.filter(i => i.status === 'Cleared').length
            const allDone      = items.length > 0 && clearedCount === items.length

            return (
              <Card key={row.id}>

                {/* Employee header */}
                <div className={s.empHdr}>
                  <div>
                    <div className={s.empName}>
                      {row.employeeName || `Employee #${row.employeeId}`}
                    </div>
                    <div className={s.empMeta}>
                      {row.employeeCode && <span>{row.employeeCode}</span>}
                      <span className={s.dot}>·</span>
                      <span>Request #{row.id}</span>
                      <span className={s.dot}>·</span>
                      <span>Last Day: <strong>
                        {new Date(row.proposedLastWorkingDate).toLocaleDateString('en-GB',
                          { day: '2-digit', month: 'short', year: 'numeric' })}
                      </strong></span>
                    </div>
                  </div>
                  <div className={s.progressWrap}>
                    <div className={s.progressBar}>
                      <div
                        className={s.progressFill}
                        style={{
                          width: items.length > 0
                            ? `${(clearedCount / items.length) * 100}%` : '0%',
                          background: allDone ? '#16A34A' : '#27235C',
                        }}
                      />
                    </div>
                    <span className={s.progressLabel}
                      style={{ color: allDone ? '#16A34A' : '#64748B' }}>
                      {clearedCount}/{items.length} cleared
                    </span>
                  </div>
                </div>

                {/* Items */}
                {isLoading ? (
                  <div className={s.loadingItems}>Loading IT clearance items...</div>
                ) : items.length === 0 ? (
                  <div className={s.noItems}>
                    <Info size={14} /> No IT clearance items found for this request.
                  </div>
                ) : (
                  <div className={s.itemsGrid}>
                    {items.map(item => {
                      const st             = getItemState(item.id)
                      const errs           = itemErrors[item.id] || {}
                      const alreadyCleared = item.status === 'Cleared'
                      const alreadyFlagged = item.status === 'NotCleared'

                      return (
                        <div key={item.id}
                          className={`${s.itemCard} ${
                            alreadyCleared ? s.itemCleared :
                            alreadyFlagged ? s.itemFlagged : ''}`}>

                          {/* Item header */}
                          <div className={s.itemTop}>
                            <div className={`${s.itemIcon} ${
                              alreadyCleared ? s.itemIconCleared :
                              alreadyFlagged ? s.itemIconFlagged : ''}`}>
                              <Package size={14} />
                            </div>
                            <div className={s.itemName}>{item.itemName}</div>
                            {alreadyCleared && <span className={s.clearedTag}>✓ Cleared</span>}
                            {alreadyFlagged && <span className={s.flaggedTag}>⚠ Flagged</span>}
                          </div>

                          {/* Decision toggle */}
                          <div className={s.decRow}>
                            <button type="button"
                              className={`${s.decBtn} ${st.isCleared ? s.decCleared : ''}`}
                              onClick={() => {
                                setField(item.id, 'isCleared', true)
                                // ── clear returnedDate error when switching back to cleared ──
                                setItemErrors(p => ({
                                  ...p, [item.id]: { ...(p[item.id] || {}), returnedDate: undefined }
                                }))
                              }}>
                              <CheckCircle size={12} /> Cleared
                            </button>
                            <button type="button"
                              className={`${s.decBtn} ${!st.isCleared ? s.decFlagged : ''}`}
                              onClick={() => {
                                setField(item.id, 'isCleared', false)
                                // ── clear returnedDate error when switching to not cleared ──
                                setItemErrors(p => ({
                                  ...p, [item.id]: { ...(p[item.id] || {}), returnedDate: undefined }
                                }))
                              }}>
                              <XCircle size={12} /> Not Cleared
                            </button>
                          </div>

                          {/* Return date — required when cleared */}
                          {st.isCleared && (
                            <div className={s.extraField}>
                              <label>
                                Return Date <span className={s.req}>*</span>
                              </label>
                              <input
                                type="date"
                                max={new Date().toISOString().split('T')[0]}
                                value={st.returnedDate}
                                onChange={e => setField(item.id, 'returnedDate', e.target.value)}
                                style={{ borderColor: errs.returnedDate ? '#DC2626' : undefined }}
                              />
                              {errs.returnedDate && (
                                <span className={s.fieldErr}>{errs.returnedDate}</span>
                              )}
                            </div>
                          )}

                          {/* Pending due amount */}
                          {!st.isCleared && (
                            <div className={s.extraField}>
                              <label>Pending Due Amount (₹)</label>
                              <input
                                type="number"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                value={st.pendingDueAmount}
                                onChange={e => setField(item.id, 'pendingDueAmount', e.target.value)}
                                style={{ borderColor: errs.pendingDueAmount ? '#DC2626' : undefined }}
                              />
                              {errs.pendingDueAmount && (
                                <span className={s.fieldErr}>{errs.pendingDueAmount}</span>
                              )}
                            </div>
                          )}

                          {/* Remarks with char counter */}
                          <div className={s.extraField}>
                            <label>Remarks</label>
                            <input
                              placeholder="Optional notes..."
                              value={st.remarks}
                              onChange={e => setField(item.id, 'remarks', e.target.value)}
                              style={{ borderColor: errs.remarks ? '#DC2626' : undefined }}
                            />
                            {/* ── char counter ── */}
                            <span className={s.charCount}
                              style={{ color: st.remarks.length > 500 ? '#DC2626' : undefined }}>
                              {st.remarks.length}/500
                            </span>
                            {errs.remarks && (
                              <span className={s.fieldErr}>{errs.remarks}</span>
                            )}
                          </div>

                          <Button
                            variant="primary"
                            size="sm"
                            loading={submittingId === item.id}
                            onClick={() => submitItem(item, row.id)}>
                            <Shield size={12} /> Submit
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
