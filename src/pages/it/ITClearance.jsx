import React, { useEffect, useState } from 'react'
import api from '../../services/api.js'
import Card from '../../components/common/Card.jsx'
import Button from '../../components/common/Button.jsx'
import Loader from '../../components/common/Loader.jsx'
import toast from 'react-hot-toast'
import {
  Shield, CheckCircle, XCircle, Info, Package,
  AlertTriangle, RefreshCw, Lock, ShieldOff
} from 'lucide-react'
import s from './ITClearance.module.css'

const RELEVANT_STATUSES = ['ClearanceInProgress']

export default function ITClearance() {

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  const [itemsMap, setItemsMap] = useState({})
  const [itemsLoading, setItemsLoading] = useState({})
  const [itemState, setItemState] = useState({})
  const [itemErrors, setItemErrors] = useState({})
  const [submittingId, setSubmittingId] = useState(null)

  const load = () => {
    setLoading(true)
    setForbidden(false)

    api.get('/Exit/all-requests')
      .then(r => {
        const data = r.data?.data || r.data || []
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
      const r = await api.get(`/Exit/clearance-items/${exitId}/IT`)
      const items = r.data?.data || r.data || []
      setItemsMap(p => ({ ...p, [exitId]: items }))

      const initState = {}
      items.forEach(item => {
        initState[item.id] = {
          isCleared: item.status === 'Cleared',
          remarks: item.remarks || '',
          returnedDate: item.returnedDate ? item.returnedDate.split('T')[0] : '',
          pendingDueAmount: item.pendingDueAmount || ''
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
    setItemState(p => ({
      ...p,
      [itemId]: { ...getItemState(itemId), [field]: value }
    }))
    setItemErrors(p => ({
      ...p,
      [itemId]: { ...(p[itemId] || {}), [field]: undefined }
    }))
  }

  /* ── VALIDATION ── */
  const validateItem = (itemId, lwd) => {
    const st = getItemState(itemId)
    const errs = {}

    if (st.isCleared) {
      if (!st.returnedDate) {
        errs.returnedDate = 'Return date is required when marking as cleared.'
      } else if (lwd) {
        // ✅ Only rule: return date must be on or before LWD
        const rd = new Date(st.returnedDate)
        rd.setHours(0, 0, 0, 0)

        const lastDay = new Date(lwd)
        lastDay.setHours(0, 0, 0, 0)

        if (rd > lastDay)
          errs.returnedDate =
            `Assets must be returned on or before the employee's Last Working Day (${lastDay.toLocaleDateString('en-GB')}).`
      }
    }

    if (!st.isCleared && st.returnedDate)
      errs.returnedDate = 'Return date should only be set when item is cleared.'

    if (!st.isCleared && st.pendingDueAmount !== '') {
      const amt = parseFloat(st.pendingDueAmount)
      if (isNaN(amt) || amt < 0)
        errs.pendingDueAmount = 'Amount must be a positive number.'
      else if (amt > 9999999)
        errs.pendingDueAmount = 'Amount seems too large. Please verify.'
    }

    if (st.remarks && st.remarks.length > 500)
      errs.remarks = 'Remarks must not exceed 500 characters.'

    setItemErrors(p => ({ ...p, [itemId]: errs }))
    return Object.keys(errs).length === 0
  }


  /* ── SUBMIT ── */
  const submitItem = async (item, row) => {
    if (!validateItem(item.id, row.proposedLastWorkingDate)) return

    const st = getItemState(item.id)
    setSubmittingId(item.id)

    try {
      await api.post('/Exit/update-clearance-item', {
        itemId: Number(item.id),
        isCleared: st.isCleared,
        remarks: st.remarks || null,
        returnedDate:
          st.isCleared && st.returnedDate
            ? st.returnedDate                    // plain "YYYY-MM-DD" → maps to DateOnly
            : null,
        pendingDueAmount:
          !st.isCleared && st.pendingDueAmount
            ? parseFloat(st.pendingDueAmount)
            : null,
        // Send LWD so backend validates against it instead of today
        proposedLastWorkingDate: row.proposedLastWorkingDate
          ? row.proposedLastWorkingDate.split('T')[0]  // plain "YYYY-MM-DD" → maps to DateOnly
          : null
      })

      toast.success(`${item.itemName} — ${st.isCleared ? 'cleared' : 'flagged'}`)
      await loadItems(row.id)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally {
      setSubmittingId(null)
    }
  }



  /* ── LWD HELPERS ── */
  const getLwdStatus = (proposedLastWorkingDate) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const lwd = new Date(proposedLastWorkingDate)
    lwd.setHours(0, 0, 0, 0)

    const diffDays = Math.ceil((lwd - today) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { type: 'overdue', daysAgo: Math.abs(diffDays) }
    if (diffDays === 0) return { type: 'today' }
    if (diffDays <= 3) return { type: 'urgent', daysLeft: diffDays }
    return { type: 'normal' }
  }

  const hasPendingItems = (exitId) => {
    const items = itemsMap[exitId] || []
    return items.some(item => !getItemState(item.id).isCleared)
  }

  if (loading) return <Loader />

  if (forbidden) {
    return (
      <div className={s.pg}>
        <div className={s.emptyWrap}>
          <div className={s.emptyVisual}>
            <div className={s.emptyRing1} />
            <div className={s.emptyRing2} />
            <div className={`${s.emptyIconWrap} ${s.emptyIconRed}`}>
              <Lock size={24} />
            </div>
          </div>
          <div className={s.emptyText}>
            <h3>Access Denied</h3>
            <p>
              You don't have permission to view IT clearance requests.
              Contact your administrator if you believe this is a mistake.
            </p>
            <button className={s.retryBtn} onClick={load}>
              <RefreshCw size={14} /> Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!loading && list.length === 0) {
    return (
      <div className={s.pg}>
        <div className={s.hdr}>
          <div className={s.hdrGrid} />
          <div className={s.hdrOrb} />
          <div className={s.hdrContent}>
            <div className={s.hdrEyebrow}>
              <span className={s.hdrEyebrowDot} />
              <span>IT Department</span>
            </div>
            <div className={s.hdrMain}>
              <div>
                <h1 className={s.hdrTitle}>IT Clearance</h1>
                <p className={s.hdrSub}>Manage and verify employee asset returns</p>
              </div>
            </div>
          </div>
        </div>
        <div className={s.emptyWrap}>
          <div className={s.emptyVisual}>
            <div className={s.emptyRing1} />
            <div className={s.emptyRing2} />
            <div className={`${s.emptyIconWrap} ${s.emptyIconGreen}`}>
              <ShieldOff size={24} />
            </div>
          </div>
          <div className={s.emptyText}>
            <h3>No Pending Clearances</h3>
            <p>
              There are no employees in <span className={s.inlineCode}>ClearanceInProgress</span> status right now.
              Check back later or refresh to see updates.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={s.pg}>

      <div className={s.hdr}>
        <div className={s.hdrGrid} />
        <div className={s.hdrOrb} />
        <div className={s.hdrContent}>
          <div className={s.hdrEyebrow}>
            <span className={s.hdrEyebrowDot} />
            <span>IT Department</span>
          </div>
          <div className={s.hdrMain}>
            <div>
              <h1 className={s.hdrTitle}>IT Clearance</h1>
              <p className={s.hdrSub}>
                {list.length} employee{list.length !== 1 ? 's' : ''} pending clearance
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={s.cards}>
        {list.map(row => {

          const items = itemsMap[row.id] || []
          const isLoading = itemsLoading[row.id]
          const lwd = new Date(row.proposedLastWorkingDate)
          const lwdFormatted = lwd.toLocaleDateString('en-GB')
          const lwdStatus = getLwdStatus(row.proposedLastWorkingDate)
          const pendingExists = hasPendingItems(row.id)

          // ✅ Cap the date picker at LWD only — no today restriction
          const lwdStr = row.proposedLastWorkingDate.split('T')[0]

          const clearedCount = items.filter(item => getItemState(item.id).isCleared).length
          const totalCount = items.length
          const progressPct = totalCount > 0 ? Math.round((clearedCount / totalCount) * 100) : 0
          const progressColor =
            progressPct === 100 ? '#16A34A' :
              progressPct >= 50 ? '#F59E0B' : '#DC2626'

          return (
            <Card key={row.id}>

              <div className={s.empHdr}>
                <div>
                  <div className={s.empName}>{row.employeeName}</div>
                  <div className={s.empMeta}>
                    {row.employeeCode}
                    <span className={s.dot}>·</span>
                    Request #{row.id}
                    <span className={s.dot}>·</span>
                    Last Day: <strong>{lwdFormatted}</strong>
                  </div>
                </div>

                {!isLoading && totalCount > 0 && (
                  <div className={s.progressWrap}>
                    <div className={s.progressBar}>
                      <div
                        className={s.progressFill}
                        style={{ width: `${progressPct}%`, background: progressColor }}
                      />
                    </div>
                    <span className={s.progressLabel} style={{ color: progressColor }}>
                      {clearedCount}/{totalCount} cleared
                    </span>
                  </div>
                )}
              </div>

              {lwdStatus.type === 'overdue' && pendingExists ? (
                <div className={`${s.lwdNotice} ${s.lwdOverdue}`}>
                  <AlertTriangle size={14} />
                  <span>
                    <strong>Overdue by {lwdStatus.daysAgo} day{lwdStatus.daysAgo !== 1 ? 's' : ''}!</strong>
                    {' '}LWD was {lwdFormatted}. Pending assets must be resolved immediately.
                  </span>
                </div>
              ) : lwdStatus.type === 'today' ? (
                <div className={`${s.lwdNotice} ${s.lwdToday}`}>
                  <AlertTriangle size={14} />
                  <span>
                    <strong>Today is the Last Working Day!</strong>
                    {' '}All assets must be returned today ({lwdFormatted}).
                  </span>
                </div>
              ) : lwdStatus.type === 'urgent' ? (
                <div className={`${s.lwdNotice} ${s.lwdUrgent}`}>
                  <AlertTriangle size={14} />
                  <span>
                    <strong>{lwdStatus.daysLeft} day{lwdStatus.daysLeft !== 1 ? 's' : ''} left!</strong>
                    {' '}Assets must be returned on or before LWD ({lwdFormatted}).
                  </span>
                </div>
              ) : (
                <div className={s.lwdNotice}>
                  <AlertTriangle size={14} />
                  Assets must be returned on or before the employee's Last Working Day ({lwdFormatted})
                </div>
              )}

              {isLoading ? (
                <div className={s.loadingItems}>Loading IT clearance items...</div>
              ) : items.length === 0 ? (
                <div className={s.noItems}>
                  <Info size={14} /> No IT clearance items found.
                </div>
              ) : (
                <div className={s.itemsGrid}>
                  {items.map(item => {
                    const st = getItemState(item.id)
                    const errs = itemErrors[item.id] || {}

                    return (
                      <div
                        key={item.id}
                        className={`${s.itemCard} ${st.isCleared ? s.itemCleared : s.itemFlagged}`}
                      >
                        <div className={s.itemTop}>
                          <div className={`${s.itemIcon} ${st.isCleared ? s.itemIconCleared : s.itemIconFlagged}`}>
                            <Package size={14} />
                          </div>
                          <div className={s.itemName}>{item.itemName}</div>
                          {st.isCleared
                            ? <span className={s.clearedTag}>Cleared</span>
                            : <span className={s.flaggedTag}>Flagged</span>
                          }
                        </div>

                        <div className={s.decRow}>
                          <button
                            type="button"
                            className={`${s.decBtn} ${st.isCleared ? s.decCleared : ''}`}
                            onClick={() => setField(item.id, 'isCleared', true)}
                          >
                            <CheckCircle size={12} /> Cleared
                          </button>
                          <button
                            type="button"
                            className={`${s.decBtn} ${!st.isCleared ? s.decFlagged : ''}`}
                            onClick={() => setField(item.id, 'isCleared', false)}
                          >
                            <XCircle size={12} /> Not Cleared
                          </button>
                        </div>

                        {st.isCleared && (
                          <div className={s.extraField}>
                            <label>
                              Return Date <span className={s.req}>*</span>
                            </label>
                            {/* ✅ Calendar allows any date up to LWD */}
                            <input
                              type="date"
                              max={lwdStr}
                              value={st.returnedDate}
                              onChange={e => setField(item.id, 'returnedDate', e.target.value)}
                              style={{ borderColor: errs.returnedDate ? '#DC2626' : undefined }}
                            />
                            {errs.returnedDate && (
                              <span className={s.fieldErr}>
                                <AlertTriangle size={11} />
                                {errs.returnedDate}
                              </span>
                            )}
                          </div>
                        )}

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
                              <span className={s.fieldErr}>
                                <AlertTriangle size={11} />
                                {errs.pendingDueAmount}
                              </span>
                            )}
                          </div>
                        )}

                        <div className={s.extraField}>
                          <label>Remarks</label>
                          <input
                            value={st.remarks}
                            onChange={e => setField(item.id, 'remarks', e.target.value)}
                            style={{ borderColor: errs.remarks ? '#DC2626' : undefined }}
                          />
                          <span className={s.charCount}>
                            {(st.remarks || '').length}/500
                          </span>
                          {errs.remarks && (
                            <span className={s.fieldErr}>
                              <AlertTriangle size={11} />
                              {errs.remarks}
                            </span>
                          )}
                        </div>

                        <Button
                          variant="primary"
                          size="sm"
                          loading={submittingId === item.id}
                          onClick={() => submitItem(item, row)}
                        >
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

    </div>
  )
}
