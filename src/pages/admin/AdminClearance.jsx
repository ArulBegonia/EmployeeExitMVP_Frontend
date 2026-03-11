import React, { useEffect, useState, useCallback, useRef } from 'react'
import api from '../../services/api.js'
import Button from '../../components/common/Button.jsx'
import Loader from '../../components/common/Loader.jsx'
import toast from 'react-hot-toast'
import {
  Shield, CheckCircle, XCircle, Info, Package, AlertTriangle,
  RefreshCw, Lock, ShieldOff, ChevronDown, ChevronUp,
  Users, Search, X, CheckCheck, Clock, TrendingUp
} from 'lucide-react'
import s from './AdminClearance.module.css'

const RELEVANT_STATUSES = ['ClearanceInProgress']

export default function AdminClearance() {
  const [list,           setList]           = useState([])
  const [loading,        setLoading]        = useState(true)
  const [forbidden,      setForbidden]      = useState(false)
  const [expandedId,     setExpandedId]     = useState(null)

  const [search,         setSearch]         = useState('')
  const [filterStatus,   setFilterStatus]   = useState('all')
  const [sortBy,         setSortBy]         = useState('urgency')
  const [showControls,   setShowControls]   = useState(false)

  const [itemsMap,       setItemsMap]       = useState({})
  const [itemsLoading,   setItemsLoading]   = useState({})
  const [itemState,      setItemState]      = useState({})
  const [itemErrors,     setItemErrors]     = useState({})
  const [submittingId,   setSubmittingId]   = useState(null)
  const [bulkSubmitting, setBulkSubmitting] = useState(null)

  // ── FIX: ref that always mirrors the latest itemState to avoid stale closures ──
  const itemStateRef = useRef({})
  useEffect(() => { itemStateRef.current = itemState }, [itemState])

  const searchRef = useRef(null)

  /* ── DATA ── */
  const load = useCallback(() => {
    setLoading(true)
    setForbidden(false)
    api.get('/Exit/all-requests')
      .then(r => {
        const data     = r.data?.data || r.data || []
        const filtered = data.filter(x => RELEVANT_STATUSES.includes(x.status))
        setList(filtered)
        if (filtered.length > 0) {
          setExpandedId(filtered[0].id)
          loadItems(filtered[0].id)
        }
      })
      .catch(err => {
        if (err.response?.status === 403) setForbidden(true)
        else toast.error('Failed to load admin clearance list')
        setList([])
      })
      .finally(() => setLoading(false))
  }, [])

  const parseItemsIntoState = (items) => {
    const initState = {}
    items.forEach(item => {
      initState[item.id] = {
        isCleared:        item.status === 'Cleared',
        remarks:          item.remarks || '',
        returnedDate:     item.returnedDate
          ? (item.returnedDate.includes('T') ? item.returnedDate.split('T')[0] : item.returnedDate)
          : '',
        pendingDueAmount: item.pendingDueAmount || '',
      }
    })
    return initState
  }

  const loadItems = async (exitId) => {
    if (itemsMap[exitId]) return
    setItemsLoading(p => ({ ...p, [exitId]: true }))
    try {
      const r     = await api.get(`/Exit/clearance-items/${exitId}/Admin`)
      const items = r.data?.data || r.data || []
      setItemsMap(p => ({ ...p, [exitId]: items }))
      setItemState(p => ({ ...p, ...parseItemsIntoState(items) }))
    } catch {
      setItemsMap(p => ({ ...p, [exitId]: [] }))
    } finally {
      setItemsLoading(p => ({ ...p, [exitId]: false }))
    }
  }

  const reloadItems = async (exitId) => {
    setItemsLoading(p => ({ ...p, [exitId]: true }))
    try {
      const r     = await api.get(`/Exit/clearance-items/${exitId}/Admin`)
      const items = r.data?.data || r.data || []
      setItemsMap(p => ({ ...p, [exitId]: items }))
      setItemState(p => ({ ...p, ...parseItemsIntoState(items) }))
    } catch {
      setItemsMap(p => ({ ...p, [exitId]: [] }))
    } finally {
      setItemsLoading(p => ({ ...p, [exitId]: false }))
    }
  }

  useEffect(() => { load() }, [load])

  /* ── KEYBOARD: Ctrl+K → focus search ── */
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  /* ── ACCORDION ── */
  const toggleExpand = (id) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    loadItems(id)
  }

  /* ── ITEM STATE ── */
  const getItemState = (itemId) =>
    itemStateRef.current[itemId] ||
    itemState[itemId] ||
    { isCleared: true, remarks: '', returnedDate: '', pendingDueAmount: '' }

  const setField = (itemId, field, value) => {
    setItemState(p => ({ ...p, [itemId]: { ...getItemState(itemId), [field]: value } }))
    setItemErrors(p => ({ ...p, [itemId]: { ...(p[itemId] || {}), [field]: undefined } }))
  }

  /* ── VALIDATION ── */
  const validateItem = (itemId, lwd, stateSnapshot) => {
    // ── FIX: accept optional stateSnapshot so bulk ops pass fresh state ──
    const st   = stateSnapshot || getItemState(itemId)
    const errs = {}

    if (st.isCleared) {
      if (!st.returnedDate) {
        errs.returnedDate = 'Return date is required when marking as cleared.'
      } else if (lwd) {
        const rd      = new Date(st.returnedDate); rd.setHours(0, 0, 0, 0)
        const lastDay = new Date(lwd);             lastDay.setHours(0, 0, 0, 0)
        if (rd > lastDay)
          errs.returnedDate = `Assets must be returned on or before the employee's Last Working Day (${lastDay.toLocaleDateString('en-GB')}).`
      }
    }
    if (!st.isCleared && st.returnedDate)
      errs.returnedDate = 'Return date should only be set when item is cleared.'
    if (!st.isCleared && st.pendingDueAmount !== '') {
      const amt = parseFloat(st.pendingDueAmount)
      if (isNaN(amt) || amt < 0)  errs.pendingDueAmount = 'Amount must be a positive number.'
      else if (amt > 9999999)     errs.pendingDueAmount = 'Amount seems too large. Please verify.'
    }
    if (st.remarks && st.remarks.length > 500)
      errs.remarks = 'Remarks must not exceed 500 characters.'

    setItemErrors(p => ({ ...p, [itemId]: errs }))
    return Object.keys(errs).length === 0
  }

  /* ── SUBMIT SINGLE ── */
  const submitItem = async (item, row) => {
    if (!validateItem(item.id, row.proposedLastWorkingDate)) return
    const st = getItemState(item.id)
    setSubmittingId(item.id)
    try {
      await api.post('/Exit/update-clearance-item', {
        itemId:                  Number(item.id),
        isCleared:               st.isCleared,
        remarks:                 st.remarks || null,
        returnedDate:            st.isCleared && st.returnedDate ? st.returnedDate : null,
        pendingDueAmount:        !st.isCleared && st.pendingDueAmount ? parseFloat(st.pendingDueAmount) : null,
        proposedLastWorkingDate: row.proposedLastWorkingDate ? row.proposedLastWorkingDate.split('T')[0] : null,
      })
      toast.success(`${item.itemName} — ${st.isCleared ? 'cleared ✓' : 'flagged'}`)
      await reloadItems(row.id)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally {
      setSubmittingId(null)
    }
  }

  /* ── MARK ALL CLEARED then auto-submit ── */
  const markAllCleared = async (exitId, lwd, items, row) => {
    const today  = new Date().toISOString().split('T')[0]
    const lwdStr = lwd ? lwd.split('T')[0] : today
    const defaultDate = today <= lwdStr ? today : lwdStr

    // ── FIX: Build the full next-state snapshot synchronously ──
    const nextStateForItems = {}
    items.forEach(item => {
      const current = getItemState(item.id)
      nextStateForItems[item.id] = {
        ...current,
        isCleared:    true,
        returnedDate: current.returnedDate || defaultDate
      }
    })

    // Apply to React state and ref immediately
    setItemState(p => ({ ...p, ...nextStateForItems }))
    itemStateRef.current = { ...itemStateRef.current, ...nextStateForItems }

    toast('All items marked as cleared — submitting now…', { icon: '✅' })

    // ── FIX: Submit immediately using the fresh snapshot ──
    setBulkSubmitting(exitId)
    let successCount = 0
    for (const item of items) {
      const st = nextStateForItems[item.id]

      // Inline validation using fresh snapshot
      const errs = {}
      if (st.isCleared && !st.returnedDate) {
        errs.returnedDate = 'Return date is required.'
      } else if (st.isCleared && lwd) {
        const rd      = new Date(st.returnedDate); rd.setHours(0, 0, 0, 0)
        const lastDay = new Date(lwd);             lastDay.setHours(0, 0, 0, 0)
        if (rd > lastDay) errs.returnedDate = 'Return date exceeds LWD.'
      }
      setItemErrors(p => ({ ...p, [item.id]: errs }))
      if (Object.keys(errs).length > 0) continue

      try {
        await api.post('/Exit/update-clearance-item', {
          itemId:                  Number(item.id),
          isCleared:               true,
          remarks:                 st.remarks || null,
          returnedDate:            st.returnedDate,
          pendingDueAmount:        null,
          proposedLastWorkingDate: lwd ? lwd.split('T')[0] : null,
        })
        successCount++
      } catch (err) {
        toast.error(`Failed: ${item.itemName} — ${err.response?.data?.message || 'error'}`)
      }
    }

    if (successCount > 0)
      toast.success(`${successCount} item${successCount > 1 ? 's' : ''} cleared & saved ✓`)

    await reloadItems(exitId)
    setBulkSubmitting(null)
  }

  /* ── BULK SUBMIT ALL PENDING ── */
  const bulkSubmitAll = async (row) => {
    const items = itemsMap[row.id] || []

    // ── FIX: Read from ref so we always get the latest state ──
    const currentState = itemStateRef.current

    const pending = items.filter(item => {
      const st = currentState[item.id]
      return st ? !st.isCleared : true
    })

    if (pending.length === 0) { toast('All items already cleared!'); return }

    // Validate all using fresh ref state
    let allValid = true
    for (const item of pending) {
      const st = currentState[item.id]
      if (!validateItem(item.id, row.proposedLastWorkingDate, st)) allValid = false
    }
    if (!allValid) { toast.error('Fix validation errors before bulk submitting.'); return }

    setBulkSubmitting(row.id)
    let successCount = 0
    for (const item of pending) {
      const st = currentState[item.id] || getItemState(item.id)
      try {
        await api.post('/Exit/update-clearance-item', {
          itemId:                  Number(item.id),
          isCleared:               st.isCleared,
          remarks:                 st.remarks || null,
          returnedDate:            st.isCleared && st.returnedDate ? st.returnedDate : null,
          pendingDueAmount:        !st.isCleared && st.pendingDueAmount ? parseFloat(st.pendingDueAmount) : null,
          proposedLastWorkingDate: row.proposedLastWorkingDate ? row.proposedLastWorkingDate.split('T')[0] : null,
        })
        successCount++
      } catch {
        toast.error(`Failed to update: ${item.itemName}`)
      }
    }
    if (successCount > 0)
      toast.success(`${successCount} item${successCount > 1 ? 's' : ''} submitted successfully`)
    await reloadItems(row.id)
    setBulkSubmitting(null)
  }

  /* ── LWD HELPERS ── */
  const getLwdStatus = (proposedLastWorkingDate) => {
    const today    = new Date(); today.setHours(0, 0, 0, 0)
    const lwd      = new Date(proposedLastWorkingDate); lwd.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((lwd - today) / (1000 * 60 * 60 * 24))
    if (diffDays < 0)   return { type: 'overdue', daysAgo: Math.abs(diffDays) }
    if (diffDays === 0) return { type: 'today' }
    if (diffDays <= 3)  return { type: 'urgent', daysLeft: diffDays }
    return { type: 'normal', daysLeft: diffDays }
  }

  const getLwdUrgencyScore = (proposedLastWorkingDate) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const lwd   = new Date(proposedLastWorkingDate); lwd.setHours(0, 0, 0, 0)
    return Math.ceil((lwd - today) / (1000 * 60 * 60 * 24))
  }

  const hasPendingItems = (exitId) =>
    (itemsMap[exitId] || []).some(item => !getItemState(item.id).isCleared)

  const getProgressStats = (exitId) => {
    const items        = itemsMap[exitId] || []
    const clearedCount = items.filter(item => getItemState(item.id).isCleared).length
    const totalCount   = items.length
    const pct          = totalCount > 0 ? Math.round((clearedCount / totalCount) * 100) : 0
    const color        = pct === 100 ? '#16A34A' : pct >= 50 ? '#F59E0B' : '#DC2626'
    return { clearedCount, totalCount, pct, color }
  }

  /* ── SEARCH / FILTER / SORT ── */
  const getFilteredSortedList = () => {
    let result = [...list]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(r =>
        (r.employeeName || '').toLowerCase().includes(q) ||
        (r.employeeCode || '').toLowerCase().includes(q)
      )
    }
    if (filterStatus !== 'all') {
      result = result.filter(r => getLwdStatus(r.proposedLastWorkingDate).type === filterStatus)
    }
    result.sort((a, b) => {
      if (sortBy === 'urgency')  return getLwdUrgencyScore(a.proposedLastWorkingDate) - getLwdUrgencyScore(b.proposedLastWorkingDate)
      if (sortBy === 'progress') return getProgressStats(a.id).pct - getProgressStats(b.id).pct
      if (sortBy === 'name')     return (a.employeeName || '').localeCompare(b.employeeName || '')
      if (sortBy === 'lwd')      return new Date(a.proposedLastWorkingDate) - new Date(b.proposedLastWorkingDate)
      return 0
    })
    return result
  }

  const filteredList    = getFilteredSortedList()
  const overdueCount    = list.filter(r => getLwdStatus(r.proposedLastWorkingDate).type === 'overdue').length
  const fullyCleared    = list.filter(r => getProgressStats(r.id).pct === 100).length
  const hasActiveFilter = search.trim() || filterStatus !== 'all' || sortBy !== 'urgency'

  /* ── RENDER STATES ── */
  if (loading) return <Loader />

  if (forbidden) {
    return (
      <div className={s.pg}>
        <div className={s.emptyWrap}>
          <div className={s.emptyVisual}>
            <div className={s.emptyRing1} /><div className={s.emptyRing2} />
            <div className={`${s.emptyIconWrap} ${s.emptyIconRed}`}><Lock size={24} /></div>
          </div>
          <div className={s.emptyText}>
            <h3>Access Denied</h3>
            <p>You don't have permission to view admin clearance requests. Contact your administrator if you believe this is a mistake.</p>
            <button className={s.retryBtn} onClick={load}><RefreshCw size={14} /> Try Again</button>
          </div>
        </div>
      </div>
    )
  }

  if (!loading && list.length === 0) {
    return (
      <div className={s.pg}>
        <div className={s.hdr}>
          <div className={s.hdrGrid} /><div className={s.hdrOrb} />
          <div className={s.hdrContent}>
            <div className={s.hdrEyebrow}><span className={s.hdrEyebrowDot} /><span>Admin Portal</span></div>
            <div className={s.hdrMain}>
              <div>
                <h1 className={s.hdrTitle}>Admin Clearance</h1>
                <p className={s.hdrSub}>Track and clear administrative assets for each exiting employee</p>
              </div>
            </div>
          </div>
        </div>
        <div className={s.emptyWrap}>
          <div className={s.emptyVisual}>
            <div className={s.emptyRing1} /><div className={s.emptyRing2} />
            <div className={`${s.emptyIconWrap} ${s.emptyIconGreen}`}><ShieldOff size={24} /></div>
          </div>
          <div className={s.emptyText}>
            <h3>No Pending Clearances</h3>
            <p>There are no employees in <span className={s.inlineCode}>ClearanceInProgress</span> status right now.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={s.pg}>
      {/* ── Header ── */}
      <div className={s.hdr}>
        <div className={s.hdrGrid} /><div className={s.hdrOrb} />
        <div className={s.hdrContent}>
          <div className={s.hdrEyebrow}><span className={s.hdrEyebrowDot} /><span>Admin Portal</span></div>
          <div className={s.hdrMain}>
            <div>
              <h1 className={s.hdrTitle}>Admin Clearance</h1>
              <p className={s.hdrSub}>{list.length} employee{list.length !== 1 ? 's' : ''} pending clearance</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats cards ── */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={`${s.statIcon} ${s.statIconBlue}`}><Users size={16} /></div>
          <div className={s.statInfo}>
            <span className={s.statVal}>{list.length}</span>
            <span className={s.statLbl}>Total Employees</span>
          </div>
        </div>
        <div className={`${s.statCard} ${overdueCount > 0 ? s.statCardRed : ''}`}>
          <div className={`${s.statIcon} ${s.statIconRed}`}><AlertTriangle size={16} /></div>
          <div className={s.statInfo}>
            <span className={s.statVal}>{overdueCount}</span>
            <span className={s.statLbl}>Overdue</span>
          </div>
        </div>
        <div className={s.statCard}>
          <div className={`${s.statIcon} ${s.statIconAmber}`}><Clock size={16} /></div>
          <div className={s.statInfo}>
            <span className={s.statVal}>
              {list.filter(r => ['today', 'urgent'].includes(getLwdStatus(r.proposedLastWorkingDate).type)).length}
            </span>
            <span className={s.statLbl}>Due Soon</span>
          </div>
        </div>
        <div className={s.statCard}>
          <div className={`${s.statIcon} ${s.statIconGreen}`}><TrendingUp size={16} /></div>
          <div className={s.statInfo}>
            <span className={s.statVal}>{fullyCleared}</span>
            <span className={s.statLbl}>Fully Cleared</span>
          </div>
        </div>
      </div>

      {/* ── Search toolbar ── */}
      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search size={14} className={s.searchIcon} />
          <input
            ref={searchRef}
            className={s.searchInput}
            placeholder="Search by name or code… (Ctrl+K)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className={s.searchClear} onClick={() => setSearch('')}><X size={12} /></button>
          )}
        </div>
      </div>

      {/* ── Controls row ── */}
      {showControls && (
        <div className={s.controlsRow}>
          <div className={s.controlGroup}>
            <span className={s.controlLabel}>Sort by</span>
            <div className={s.pillRow}>
              {[
                { value: 'urgency',  label: 'Urgency'  },
                { value: 'progress', label: 'Progress' },
                { value: 'name',     label: 'Name'     },
                { value: 'lwd',      label: 'LWD'      },
              ].map(opt => (
                <button
                  key={opt.value}
                  className={`${s.pill} ${sortBy === opt.value ? s.pillActive : ''}`}
                  onClick={() => setSortBy(opt.value)}
                >{opt.label}</button>
              ))}
            </div>
          </div>
          {hasActiveFilter && (
            <button
              className={s.clearFilters}
              onClick={() => { setSearch(''); setFilterStatus('all'); setSortBy('urgency') }}
            >
              <X size={12} /> Clear Filters
            </button>
          )}
        </div>
      )}

      {/* ── Result count ── */}
      {(search.trim() || filterStatus !== 'all') && (
        <p className={s.resultCount}>
          Showing <strong>{filteredList.length}</strong> of <strong>{list.length}</strong> employees
        </p>
      )}

      {/* ── No results ── */}
      {filteredList.length === 0 && (
        <div className={s.noResults}>
          <Search size={20} />
          No employees match your current filters.
        </div>
      )}

      {/* ── Accordion list ── */}
      <div className={s.accordion}>
        {filteredList.map(row => {
          const isExpanded    = expandedId === row.id
          const items         = itemsMap[row.id] || []
          const isLoadingRow  = itemsLoading[row.id]
          const lwdFormatted  = new Date(row.proposedLastWorkingDate).toLocaleDateString('en-GB')
          const lwdStatus     = getLwdStatus(row.proposedLastWorkingDate)
          const pendingExists = hasPendingItems(row.id)
          const lwdStr        = row.proposedLastWorkingDate.split('T')[0]
          const { clearedCount, totalCount, pct, color } = getProgressStats(row.id)
          const pendingCount  = totalCount - clearedCount

          const lwdBadgeClass =
            lwdStatus.type === 'overdue' ? s.lwdBadgeRed   :
            lwdStatus.type === 'today'   ? s.lwdBadgeOrange :
            lwdStatus.type === 'urgent'  ? s.lwdBadgeAmber  :
            s.lwdBadgeGray

          const itemDots = items.slice(0, 6)

          return (
            <div
              key={row.id}
              className={`${s.panel} ${isExpanded ? s.panelOpen : ''} ${lwdStatus.type === 'overdue' && pendingExists ? s.panelOverdue : ''}`}
            >
              {/* ── Collapsed header ── */}
              <button className={s.panelHdr} onClick={() => toggleExpand(row.id)} type="button">
                <div className={`${s.avatar} ${lwdStatus.type === 'overdue' && pendingExists ? s.avatarOverdue : ''}`}>
                  {(row.employeeName || '?')[0].toUpperCase()}
                </div>

                <div className={s.panelLeft}>
                  <div className={s.panelInfo}>
                    <div className={s.panelNameRow}>
                      <span className={s.panelName}>{row.employeeName}</span>
                      {pct === 100 && <span className={s.allClearTag}>✓ All Clear</span>}
                    </div>
                    <div className={s.panelMeta}>
                      <span>{row.employeeCode}</span>
                      <span className={s.dot}>·</span>
                      <span>Req #{row.id}</span>
                      {itemDots.length > 0 && (
                        <>
                          <span className={s.dot}>·</span>
                          <div className={s.itemDots}>
                            {itemDots.map(item => (
                              <span
                                key={item.id}
                                className={`${s.itemDot} ${getItemState(item.id).isCleared ? s.itemDotGreen : s.itemDotRed}`}
                                title={item.itemName}
                              />
                            ))}
                            {items.length > 6 && <span className={s.itemDotMore}>+{items.length - 6}</span>}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className={s.panelBadges}>
                  <span className={`${s.lwdBadge} ${lwdBadgeClass}`}>
                    {lwdStatus.type === 'overdue' ? `Overdue ${lwdStatus.daysAgo}d` :
                     lwdStatus.type === 'today'   ? 'Due Today' :
                     lwdStatus.type === 'urgent'  ? `${lwdStatus.daysLeft}d left` :
                     `LWD ${lwdFormatted}`}
                  </span>
                  {totalCount > 0 && pendingCount > 0 && (
                    <span className={s.pendingBadge}>{pendingCount} pending</span>
                  )}
                </div>

                <div className={s.panelRight}>
                  {totalCount > 0 && (
                    <div className={s.miniBarWrap}>
                      <div className={s.miniBar}>
                        <div className={s.miniBarFill} style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <span className={s.miniBarPct} style={{ color }}>{pct}%</span>
                    </div>
                  )}
                  <span className={s.chevron}>{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                </div>
              </button>

              {/* ── Expanded body ── */}
              {isExpanded && (
                <div className={s.panelBody}>
                  {lwdStatus.type === 'overdue' && pendingExists ? (
                    <div className={`${s.lwdNotice} ${s.lwdOverdue}`}>
                      <AlertTriangle size={14} />
                      <span><strong>Overdue by {lwdStatus.daysAgo} day{lwdStatus.daysAgo !== 1 ? 's' : ''}!</strong> LWD was {lwdFormatted}. Pending assets must be resolved immediately.</span>
                    </div>
                  ) : lwdStatus.type === 'today' ? (
                    <div className={`${s.lwdNotice} ${s.lwdToday}`}>
                      <AlertTriangle size={14} />
                      <span><strong>Today is the Last Working Day!</strong> All assets must be returned today ({lwdFormatted}).</span>
                    </div>
                  ) : lwdStatus.type === 'urgent' ? (
                    <div className={`${s.lwdNotice} ${s.lwdUrgent}`}>
                      <AlertTriangle size={14} />
                      <span><strong>{lwdStatus.daysLeft} day{lwdStatus.daysLeft !== 1 ? 's' : ''} left!</strong> Assets must be returned on or before LWD ({lwdFormatted}).</span>
                    </div>
                  ) : (
                    <div className={s.lwdNotice}>
                      <AlertTriangle size={14} />
                      Assets must be returned on or before the employee's Last Working Day ({lwdFormatted})
                    </div>
                  )}

                  {/* Bulk action bar */}
                  {!isLoadingRow && items.length > 0 && (
                    <div className={s.bulkBar}>
                      <span className={s.bulkInfo}>
                        <CheckCircle size={13} style={{ color: '#16A34A' }} />
                        {clearedCount}/{totalCount} items cleared
                      </span>
                      <div className={s.bulkActions}>
                        {/* ── FIX: pass items and row into markAllCleared ── */}
                        {pendingExists && (
                          <button
                            className={s.bulkMarkBtn}
                            disabled={!!bulkSubmitting}
                            onClick={() => markAllCleared(row.id, row.proposedLastWorkingDate, items, row)}
                          >
                            {bulkSubmitting === row.id
                              ? <><RefreshCw size={12} className={s.spinIcon} /> Clearing…</>
                              : <><CheckCheck size={13} /> Mark All Cleared</>
                            }
                          </button>
                        )}
                        <button
                          className={s.bulkSubmitBtn}
                          disabled={!!bulkSubmitting}
                          onClick={() => bulkSubmitAll(row)}
                        >
                          {bulkSubmitting === row.id
                            ? <><RefreshCw size={12} className={s.spinIcon} /> Submitting…</>
                            : <><Shield size={12} /> Submit All Pending</>
                          }
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Items grid */}
                  {isLoadingRow ? (
                    <div className={s.loadingItems}>
                      <div className={s.loadingDots}><span /><span /><span /></div>
                      Loading admin clearance items…
                    </div>
                  ) : items.length === 0 ? (
                    <div className={s.noItems}><Info size={14} /> No admin clearance items found.</div>
                  ) : (
                    <div className={s.itemsGrid}>
                      {items.map(item => {
                        const st   = getItemState(item.id)
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
                                <label>Return Date <span className={s.req}>*</span></label>
                                <input
                                  type="date"
                                  max={lwdStr}
                                  value={st.returnedDate}
                                  onChange={e => setField(item.id, 'returnedDate', e.target.value)}
                                  style={{ borderColor: errs.returnedDate ? '#DC2626' : undefined }}
                                />
                                {errs.returnedDate && (
                                  <span className={s.fieldErr}><AlertTriangle size={11} />{errs.returnedDate}</span>
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
                                  <span className={s.fieldErr}><AlertTriangle size={11} />{errs.pendingDueAmount}</span>
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
                              <span className={s.charCount}>{(st.remarks || '').length}/500</span>
                              {errs.remarks && (
                                <span className={s.fieldErr}><AlertTriangle size={11} />{errs.remarks}</span>
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
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
