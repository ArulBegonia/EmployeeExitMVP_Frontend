import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../../services/api.js'
import Card from '../../components/common/Card.jsx'
import Button from '../../components/common/Button.jsx'
import Modal from '../../components/common/Modal.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import StepTimeline from '../../components/common/StepTimeline.jsx'
import Loader from '../../components/common/Loader.jsx'
import toast from 'react-hot-toast'
import {
  FileText, Calendar, AlertTriangle, CheckCircle, ArrowRight,
  Users, ClipboardList, ShieldCheck, ChevronDown, Briefcase,
  UserCheck, UserX, Loader2, Save, Info
} from 'lucide-react'
import { addDays, format, differenceInDays, isWeekend } from 'date-fns'
import s from './ResignationForm.module.css'


// Constants

const REASONS = [
  { v: 0, k: 'Select',        l: 'Select the Reason' },
  { v: 1, k: 'CareerGrowth',  l: 'Better Career Opportunity' },
  { v: 2, k: 'HigherStudies', l: 'Higher Studies' },
  { v: 3, k: 'Relocation',    l: 'Relocation' },
  { v: 4, k: 'Personal',      l: 'Personal Reasons' },
  { v: 5, k: 'Health',        l: 'Health Issues' },
  { v: 6, k: 'Salary',        l: 'Compensation' },
  { v: 7, k: 'WorkLife',      l: 'Work-Life Balance' },
  { v: 8, k: 'Retirement',    l: 'Retirement' },
  { v: 9, k: 'Other',         l: 'Other' },
]

const RESIGNATION_TYPES = [
  { v: 'Voluntary',   l: 'Voluntary Resignation' },
  { v: 'Retirement',  l: 'Retirement' },
  { v: 'ContractEnd', l: 'Contract End / Completion' },
  { v: 'Mutual',      l: 'Mutual Separation' },
]

const MIN          = 30
const UI_LOCK_DAYS = 7
const DRAFT_KEY    = 'em_resignation_draft'
const uiMinDate    = format(addDays(new Date(), UI_LOCK_DAYS), 'yyyy-MM-dd')

const ACTIVE_STATUSES = [
  'PendingL1Approval', 'PendingL2Approval', 'PendingHrReview',
  'ClearanceInProgress', 'SettlementPending'
]


// Helpers

function getCurrentUserRole() {
  try {
    const token = localStorage.getItem('em_token')
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    return (
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      payload['role'] || payload['roles'] || null
    )
  } catch { return null }
}

function getCurrentEmpIdentity() {
  try {
    const token = localStorage.getItem('em_token')
    if (!token) return {}
    const payload = JSON.parse(atob(token.split('.')[1]))
    return {
      empId:        parseInt(payload['empId'] || payload['sub']) || null,
      employeeCode: payload['employeeCode'] || null,
      name:         payload['name'] || payload['unique_name'] || null,
      department:   payload['department'] || null,
      designation:  payload['designation'] || null,
      joiningDate:  payload['joiningDate'] || null,
    }
  } catch { return {} }
}

// Skip weekends when suggesting last working date
function nextWorkingDate(daysFromNow) {
  let d = addDays(new Date(), daysFromNow)
  while (isWeekend(d)) d = addDays(d, 1)
  return format(d, 'yyyy-MM-dd')
}


const INITIAL_FORM = {
  resignationType:          'Voluntary',
  reasonType:               0,
  detailedReason:           '',
  proposedLastWorkingDate:  nextWorkingDate(MIN + UI_LOCK_DAYS),
  noticePeriodWaiver:       false,
  waiverReason:             '',
  requestedEarlyExitDate:   '',
  lastWorkingDateFlexible:  false,
  handoverBuddyId:          '',
  handoverBuddyName:        '',
  handoverNotes:            '',
  willingToTrain:           false,
  currentProjects:          '',
  immediateHandoverNeeds:   '',
}


// Main Component

export default function ResignationForm() {
  const nav = useNavigate()

  // State
  const [f, setF] = useState(() => {
    // Restore draft from localStorage
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...INITIAL_FORM, ...parsed }
      }
    } catch {}
    return INITIAL_FORM
  })

  const [formErrors, setFormErrors]   = useState({})
  const [confirm, setConfirm]         = useState(false)
  const [loading, setL]               = useState(false)
  const [done, setDone]               = useState(null)
  const [checking, setChecking]       = useState(true)
  const [existing, setExisting]       = useState(null)
  const [draftSaved, setDraftSaved]   = useState(false)

  // Handover buddy lookup state
  const [buddyLookup, setBuddyLookup] = useState({ status: 'idle', name: '', dept: '' })
  // 'idle' | 'loading' | 'found' | 'notfound' | 'error'
  const buddyTimer = useRef(null)

  const userRole = getCurrentUserRole()
  const identity = getCurrentEmpIdentity()
  const { employeeCode: currentEmpCode } = identity

  const isHrOrAdmin    = userRole === 'HR' || userRole === 'ADMIN'
  const isElevated     = isHrOrAdmin
  const selectedReason = REASONS.find(r => r.v === f.reasonType)
  const isOther        = f.reasonType === 9

  const days  = f.proposedLastWorkingDate
    ? differenceInDays(new Date(f.proposedLastWorkingDate), new Date())
    : 0
  const valid = days >= MIN || f.noticePeriodWaiver

  const tenureText = (() => {
    if (!identity.joiningDate) return null
    const diff = differenceInDays(new Date(), new Date(identity.joiningDate))
    const yrs  = Math.floor(diff / 365)
    const mos  = Math.floor((diff % 365) / 30)
    return yrs > 0 ? `${yrs}y ${mos}m` : `${mos} months`
  })()


  // ── Draft auto-save ────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(f))
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 1500)
    }, 2000)
    return () => clearTimeout(timer)
  }, [f])

  const clearDraft = () => localStorage.removeItem(DRAFT_KEY)


  // ── Existing exit check ────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/Exit/my-exit-status')
      .then(r => {
        const data = r.data?.data || r.data
        if (data && ACTIVE_STATUSES.includes(data.status)) setExisting(data)
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [])


  // ── Handover buddy debounced lookup ───────────────────────────────────────
  const lookupBuddy = useCallback((code) => {
    clearTimeout(buddyTimer.current)
    if (!code || code.length < 3) {
      setBuddyLookup({ status: 'idle', name: '', dept: '' })
      return
    }
    if (currentEmpCode && code.toUpperCase() === currentEmpCode.toUpperCase()) {
      setBuddyLookup({ status: 'error', name: '', dept: '' })
      return
    }
    buddyTimer.current = setTimeout(async () => {
      setBuddyLookup({ status: 'loading', name: '', dept: '' })
      try {
        const res  = await api.get(`/Employee/lookup?code=${code.trim()}`)
        const emp  = res.data?.data || res.data
        if (emp?.name) {
          setBuddyLookup({ status: 'found', name: emp.name, dept: emp.department || '' })
          setF(p => ({ ...p, handoverBuddyName: emp.name }))
        } else {
          setBuddyLookup({ status: 'notfound', name: '', dept: '' })
        }
      } catch {
        setBuddyLookup({ status: 'notfound', name: '', dept: '' })
      }
    }, 600)
  }, [currentEmpCode])


  // ── Validation ────────────────────────────────────────────────────────────
  const validateForm = () => {
    const errs = {}

    if (!f.reasonType || f.reasonType === 0)
      errs.reasonType = 'Please select a reason for your resignation.'

    if (!f.proposedLastWorkingDate)
      errs.proposedLastWorkingDate = 'Last working date is required.'
    else if (days < MIN && !f.noticePeriodWaiver)
      errs.proposedLastWorkingDate = `Must be at least ${MIN} days from today (or request a waiver).`
    else if (new Date(f.proposedLastWorkingDate) > addDays(new Date(), 365))
      errs.proposedLastWorkingDate = 'Cannot be more than 1 year in the future.'

    if (f.noticePeriodWaiver && !f.waiverReason.trim())
      errs.waiverReason = 'Please provide a reason for the waiver request.'

    if (isOther && !f.detailedReason.trim())
      errs.detailedReason = 'Please describe your reason when selecting "Other".'

    if (f.detailedReason.length > 2000)
      errs.detailedReason = 'Details must not exceed 2000 characters.'

    if (f.handoverBuddyId && currentEmpCode &&
      f.handoverBuddyId.trim().toUpperCase() === currentEmpCode.toUpperCase())
      errs.handoverBuddyId = 'You cannot assign yourself as the handover buddy.'

    if (f.handoverBuddyId.length > 50)
      errs.handoverBuddyId = 'Employee code looks too long.'

    if (f.handoverNotes.length > 2000)
      errs.handoverNotes = 'Handover notes must not exceed 2000 characters.'

    if (buddyLookup.status === 'notfound' && f.handoverBuddyId)
      errs.handoverBuddyId = 'Employee not found. Please check the code.'

    if (f.currentProjects.length > 1500)
      errs.currentProjects = 'Project list must not exceed 1500 characters.'

    if (f.immediateHandoverNeeds.length > 1000)
      errs.immediateHandoverNeeds = 'Must not exceed 1000 characters.'

    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const canSubmit =
    valid &&
    f.reasonType !== 0 &&
    !(isOther && !f.detailedReason.trim()) &&
    !(f.noticePeriodWaiver && !f.waiverReason.trim())

  const handleSubmitClick = () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting.')
      return
    }
    setConfirm(true)
  }


  // Submit
  const submit = async () => {
    setL(true)
    try {
      const payload = {
        resignationType:          f.resignationType,
        reasonType:               f.reasonType,
        detailedReason:           f.detailedReason        || null,
        proposedLastWorkingDate:  new Date(f.proposedLastWorkingDate).toISOString(),
        lastWorkingDateFlexible:  f.lastWorkingDateFlexible,
        noticePeriodWaiver:       f.noticePeriodWaiver,
        waiverReason:             f.noticePeriodWaiver ? f.waiverReason : null,
        requestedEarlyExitDate:   f.noticePeriodWaiver && f.requestedEarlyExitDate
                                    ? new Date(f.requestedEarlyExitDate).toISOString()
                                    : null,
        handoverBuddyId:          f.handoverBuddyId       ? f.handoverBuddyId.trim() : null,
        handoverBuddyName:        f.handoverBuddyName     || null,
        handoverNotes:            f.handoverNotes         || null,
        willingToTrain:           f.willingToTrain,
        currentProjects:          f.currentProjects       || null,
        immediateHandoverNeeds:   f.immediateHandoverNeeds || null,
      }

      const r = await api.post('/Exit/resign', payload)
      toast.success('Resignation submitted successfully!')
      setDone(r.data?.data || r.data)
      clearDraft()
      setConfirm(false)

    } catch (e) {
      const status = e.response?.status
      const msg    = e.response?.data?.message || ''
      if (status === 400) {
        const errors = e.response?.data?.errors
        toast.error(errors ? Object.values(errors).flat().join(' ') : msg || 'Validation failed')
      } else if (status === 409) {
        toast.error('You already have an active exit request.')
        setChecking(true)
        api.get('/Exit/my-exit-status')
          .then(r => setExisting(r.data?.data || r.data))
          .finally(() => setChecking(false))
      } else {
        toast.error(msg || 'Submission failed. Please try again.')
      }
    } finally {
      setL(false)
    }
  }


  // Guards
  if (checking) return <Loader text="Checking your exit status..." />

  if (existing) return (
    <div className={s.pg}>
      <div className={s.hdr}>
        <div className={s.hdrGrid} /><div className={s.hdrOrb} />
        <div className={s.hdrContent}>
          <div className={s.hdrEyebrow}><span className={s.hdrEyebrowDot} /><span>Submit Resignation</span></div>
          <h2 className={s.hdrTitle}>Active Exit Request</h2>
          <p className={s.hdrSub}>Your exit request is currently being processed</p>
        </div>
      </div>
      <Card>
        <div className={s.existingWrap}>
          <div className={s.existingAlert}>
            <div className={s.existingAlertIcon}><AlertTriangle size={20} /></div>
            <div className={s.existingAlertBody}>
              <div className={s.existingAlertTitle}>You already have an active exit request</div>
              <div className={s.existingAlertSub}>
                You cannot submit a new resignation while your current request is in progress.
                You can only re-apply if your request is <strong>Rejected</strong>.
              </div>
            </div>
          </div>
          <div className={s.existingMeta}>
            <div className={s.existingMetaLeft}>
              <div className={s.existingReqId}>Request #{existing.exitRequestId}</div>
              <div className={s.existingLwd}>
                Last Day{' '}
                <strong>
                  {new Date(existing.proposedLastWorkingDate)
                    .toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </strong>
              </div>
            </div>
            <StatusBadge status={existing.status} />
          </div>
          <div className={s.existingTimeline}><StepTimeline status={existing.status} /></div>
          <Link to="/employee/status">
            <Button variant="primary">Track My Exit Status <ArrowRight size={14} /></Button>
          </Link>
        </div>
      </Card>
    </div>
  )

  if (done) return (
    <div className={s.ok}>
      <Card>
        <div className={s.successWrap}>
          <div className={s.successIcon}><CheckCircle size={36} /></div>
          <div className={s.successText}>
            <h2>Resignation Submitted!</h2>
            <p>Exit Request <strong>#{done}</strong> has been created successfully.</p>
            <p>
              {isElevated
                ? 'Your resignation has been routed directly to HR for review.'
                : 'Your L1 Manager has been notified. Track progress from the status page.'}
            </p>
          </div>
          <Button variant="primary" onClick={() => nav('/employee/status')}>
            Track My Status <ArrowRight size={14} />
          </Button>
        </div>
      </Card>
    </div>
  )


  // ── Main Form ─────────────────────────────────────────────────────────────
  return (
    <div className={s.pg}>
      <div className={s.hdr}>
        <div className={s.hdrGrid} /><div className={s.hdrOrb} />
        <div className={s.hdrContent}>
          <div className={s.hdrEyebrow}><span className={s.hdrEyebrowDot} /><span>Exit Management</span></div>
          <h2 className={s.hdrTitle}>Submit Resignation</h2>
          <p className={s.hdrSub}>Fill in the details below to start your exit process</p>
        </div>
      </div>

      {/* Draft saved indicator */}
      {draftSaved && (
        <div className={s.draftBadge} aria-live="polite">
          <Save size={12} /> Draft auto-saved
        </div>
      )}

      <div className={s.grid}>
        <div className={s.leftCol}>

          {/* ── Employee Snapshot ── */}
          {(identity.name || identity.department || identity.designation) && (
            <Card>
              <SectionHeader icon={<Briefcase size={15} />} title="Your Employment Details" sub="Automatically pulled from your profile" />
              <div className={s.snapshotGrid}>
                {identity.name         && <SnapItem label="Name"          value={identity.name} />}
                {identity.employeeCode && <SnapItem label="Employee Code" value={identity.employeeCode} />}
                {identity.designation  && <SnapItem label="Designation"   value={identity.designation} />}
                {identity.department   && <SnapItem label="Department"    value={identity.department} />}
                {tenureText            && <SnapItem label="Tenure"        value={tenureText} />}
              </div>
            </Card>
          )}

          {/* ── Resignation Details ── */}
          <Card>
            <SectionHeader icon={<FileText size={15} />} title="Resignation Details" sub="Primary information about your resignation" />
            <div className={s.form}>

              {/* Type */}
              <Field label="Resignation Type" required>
                <div className={s.radioRow}>
                  {RESIGNATION_TYPES.map(rt => (
                    <label key={rt.v} className={s.radioLabel}>
                      <input type="radio" name="resignationType" value={rt.v}
                        checked={f.resignationType === rt.v}
                        onChange={() => setF(p => ({ ...p, resignationType: rt.v }))} />
                      {rt.l}
                    </label>
                  ))}
                </div>
              </Field>

              {/* Reason */}
              <Field label="Reason for Resignation" required error={formErrors.reasonType}>
                <div className={s.selectWrap}>
                  <select
                    className={`${s.select} ${formErrors.reasonType ? s.inputErr : ''}`}
                    value={f.reasonType}
                    onChange={e => {
                      setF(p => ({ ...p, reasonType: parseInt(e.target.value, 10) }))
                      if (formErrors.reasonType) setFormErrors(p => ({ ...p, reasonType: undefined }))
                    }}
                  >
                    {REASONS.map(r => <option key={r.v} value={r.v} disabled={r.v === 0}>{r.l}</option>)}
                  </select>
                  <ChevronDown size={14} className={s.selectIcon} />
                </div>
              </Field>

              {/* Additional Details */}
              <Field
                label="Additional Details"
                required={isOther}
                optional={!isOther}
                error={formErrors.detailedReason}
                hint={!isOther ? "Optional — provide context if you'd like" : undefined}
              >
                <textarea
                  className={`${s.textarea} ${formErrors.detailedReason ? s.inputErr : ''}`}
                  rows={3}
                  placeholder={isOther ? 'Please describe your reason (required for Other)...' : 'Provide more context about your decision...'}
                  value={f.detailedReason}
                  onChange={e => {
                    setF(p => ({ ...p, detailedReason: e.target.value }))
                    if (formErrors.detailedReason) setFormErrors(p => ({ ...p, detailedReason: undefined }))
                  }}
                />
                <CharCount value={f.detailedReason} max={2000} />
              </Field>

              {/* Last Working Date */}
              <Field label={<><Calendar size={13} /> Proposed Last Working Date</>} required error={formErrors.proposedLastWorkingDate}>
                <input
                  className={`${s.input} ${formErrors.proposedLastWorkingDate ? s.inputErr : ''}`}
                  type="date"
                  min={uiMinDate}
                  value={f.proposedLastWorkingDate}
                  onChange={e => {
                    setF(p => ({ ...p, proposedLastWorkingDate: e.target.value }))
                    if (formErrors.proposedLastWorkingDate) setFormErrors(p => ({ ...p, proposedLastWorkingDate: undefined }))
                  }}
                />
                {/* Notice pill with calendar date */}
                <div className={`${s.noticePill} ${valid ? s.noticePillOk : s.noticePillErr}`}>
                  <span>{valid ? '✓' : '!'}</span>
                  <span>
                    {days} days notice period
                    {f.proposedLastWorkingDate && (
                      <> &mdash; {new Date(f.proposedLastWorkingDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</>
                    )}
                  </span>
                  {!valid && <span className={s.noticePillReq}> — minimum {MIN} days required</span>}
                </div>
                {/* Weekend warning */}
                {f.proposedLastWorkingDate && isWeekend(new Date(f.proposedLastWorkingDate)) && (
                  <div className={s.weekendWarn}>
                    <Info size={12} /> This date falls on a weekend. Consider choosing the nearest working day.
                  </div>
                )}
              </Field>

              {/* Flexible LWD */}
              <Field>
                <label className={s.checkLabel}>
                  <input type="checkbox" checked={f.lastWorkingDateFlexible}
                    onChange={e => setF(p => ({ ...p, lastWorkingDateFlexible: e.target.checked }))} />
                  I am open to negotiating the last working date with my manager
                </label>
              </Field>

              {/* Notice Period Waiver */}
              <Field hint="Subject to management approval. Early exit is not guaranteed.">
                <label className={s.checkLabel}>
                  <input type="checkbox" checked={f.noticePeriodWaiver}
                    onChange={e => setF(p => ({
                      ...p,
                      noticePeriodWaiver:      e.target.checked,
                      waiverReason:            e.target.checked ? p.waiverReason : '',
                      requestedEarlyExitDate:  e.target.checked ? p.requestedEarlyExitDate : '',
                    }))} />
                  Request notice period waiver (early exit)
                </label>
              </Field>

              {f.noticePeriodWaiver && (
                <>
                  <Field label="Waiver Reason" required error={formErrors.waiverReason}>
                    <textarea
                      className={`${s.textarea} ${formErrors.waiverReason ? s.inputErr : ''}`}
                      rows={2}
                      placeholder="Explain why you need an early exit (e.g., joining date at new company, relocation urgency)..."
                      value={f.waiverReason}
                      onChange={e => {
                        setF(p => ({ ...p, waiverReason: e.target.value }))
                        if (formErrors.waiverReason) setFormErrors(p => ({ ...p, waiverReason: undefined }))
                      }}
                    />
                  </Field>

                  {/* Requested early exit date */}
                  <Field label="Requested Early Exit Date" optional hint="The earliest date you'd like to be relieved, if waiver is approved.">
                    <input
                      className={s.input}
                      type="date"
                      min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                      max={f.proposedLastWorkingDate || undefined}
                      value={f.requestedEarlyExitDate}
                      onChange={e => setF(p => ({ ...p, requestedEarlyExitDate: e.target.value }))}
                    />
                  </Field>
                </>
              )}

            </div>
          </Card>

          {/* ── Handover & Knowledge Transfer ── */}
          <Card>
            <SectionHeader
              icon={<Users size={15} />}
              title="Handover & Knowledge Transfer"
              sub="Help ensure a smooth transition for your team"
            />
            <div className={s.form}>

              <Field
                label="Handover Buddy Employee Code"
                optional
                error={formErrors.handoverBuddyId}
                hint="The colleague who will take over your responsibilities"
              >
                <div className={s.buddyInputWrap}>
                  <input
                    className={`${s.input} ${formErrors.handoverBuddyId ? s.inputErr : ''}`}
                    type="text"
                    placeholder="e.g. EMP014"
                    value={f.handoverBuddyId}
                    onChange={e => {
                      const val = e.target.value
                      setF(p => ({ ...p, handoverBuddyId: val }))
                      if (formErrors.handoverBuddyId) setFormErrors(p => ({ ...p, handoverBuddyId: undefined }))
                      lookupBuddy(val)
                    }}
                  />
                  {/* Live lookup status badge */}
                  <div className={s.buddyStatus}>
                    {buddyLookup.status === 'loading'  && <Loader2 size={14} className={s.spin} />}
                    {buddyLookup.status === 'found'    && <UserCheck size={14} className={s.buddyFound} />}
                    {buddyLookup.status === 'notfound' && <UserX size={14} className={s.buddyNotFound} />}
                    {buddyLookup.status === 'error'    && <UserX size={14} className={s.buddyNotFound} />}
                  </div>
                </div>
                {/* Resolved name card */}
                {buddyLookup.status === 'found' && (
                  <div className={s.buddyCard}>
                    <UserCheck size={13} />
                    <span><strong>{buddyLookup.name}</strong>{buddyLookup.dept && ` — ${buddyLookup.dept}`}</span>
                  </div>
                )}
                {buddyLookup.status === 'notfound' && f.handoverBuddyId && (
                  <div className={s.buddyCardErr}>
                    <UserX size={13} /> Employee not found for code "{f.handoverBuddyId}"
                  </div>
                )}
              </Field>

              {/* Willing to train */}
              <Field>
                <label className={s.checkLabel}>
                  <input type="checkbox" checked={f.willingToTrain}
                    onChange={e => setF(p => ({ ...p, willingToTrain: e.target.checked }))} />
                  I am willing to train my replacement during the notice period
                </label>
              </Field>

              {/* Current projects */}
              <Field
                label="Current Projects / Responsibilities"
                optional
                error={formErrors.currentProjects}
                hint="List active projects, recurring tasks, or key responsibilities"
              >
                <textarea
                  className={`${s.textarea} ${formErrors.currentProjects ? s.inputErr : ''}`}
                  rows={4}
                  placeholder="• Project A - 60% complete, milestone due next month&#10;• Monthly reporting to leadership&#10;• Client calls every Tuesday with XYZ Corp&#10;• System admin for internal portal"
                  value={f.currentProjects}
                  onChange={e => {
                    setF(p => ({ ...p, currentProjects: e.target.value }))
                    if (formErrors.currentProjects) setFormErrors(p => ({ ...p, currentProjects: undefined }))
                  }}
                />
                <CharCount value={f.currentProjects} max={1500} />
              </Field>

              {/* Immediate handover needs */}
              <Field
                label="Immediate Handover Needs"
                optional
                error={formErrors.immediateHandoverNeeds}
                hint="Critical information that needs immediate attention"
              >
                <textarea
                  className={`${s.textarea} ${formErrors.immediateHandoverNeeds ? s.inputErr : ''}`}
                  rows={3}
                  placeholder="Urgent items: credentials, ongoing escalations, pending approvals, critical deadlines..."
                  value={f.immediateHandoverNeeds}
                  onChange={e => {
                    setF(p => ({ ...p, immediateHandoverNeeds: e.target.value }))
                    if (formErrors.immediateHandoverNeeds) setFormErrors(p => ({ ...p, immediateHandoverNeeds: undefined }))
                  }}
                />
                <CharCount value={f.immediateHandoverNeeds} max={1000} />
              </Field>

              {/* General handover notes */}
              <Field
                label="General Handover Notes"
                optional
                error={formErrors.handoverNotes}
                hint="Documentation locations, key contacts, tips for your successor"
              >
                <textarea
                  className={`${s.textarea} ${formErrors.handoverNotes ? s.inputErr : ''}`}
                  rows={4}
                  placeholder="Document locations, passwords/credentials, key contacts, tips for successor..."
                  value={f.handoverNotes}
                  onChange={e => {
                    setF(p => ({ ...p, handoverNotes: e.target.value }))
                    if (formErrors.handoverNotes) setFormErrors(p => ({ ...p, handoverNotes: undefined }))
                  }}
                />
                <CharCount value={f.handoverNotes} max={2000} />
              </Field>

            </div>
          </Card>

          <Button variant="primary" size="lg" onClick={handleSubmitClick} disabled={!canSubmit}>
            <FileText size={15} />
            Submit Resignation
          </Button>

        </div>

        {/* ── Sidebar ── */}
        <div className={s.side}>
          <Card>
            <SectionHeader icon={<ShieldCheck size={15} />} title="Before You Submit" sub="Important guidelines" />
            <ul className={s.guideList}>
              <li className={s.guideItem}><span className={s.guideDot} />Minimum <strong>{MIN}-day</strong> notice period required</li>
              {isElevated
                ? <li className={s.guideItem}><span className={s.guideDot} />As <strong>{userRole}</strong>, resignation goes <strong>directly to HR</strong></li>
                : <li className={s.guideItem}><span className={s.guideDot} />Your L1 Manager will be notified immediately</li>}
              {isElevated
                ? <li className={s.guideItem}><span className={s.guideDot} />Flow: HR → IT/Admin clearance → Settlement</li>
                : <li className={s.guideItem}><span className={s.guideDot} />Flow: L1 → L2 → HR → IT/Admin → Settlement</li>}
              <li className={s.guideItem}><span className={s.guideDot} />Only <strong>one active</strong> exit request at a time</li>
              <li className={s.guideItem}><span className={s.guideDot} />Exit interview will be scheduled by HR separately</li>
              <li className={s.guideItem}><span className={s.guideDot} />Asset clearance checklist sent after approval</li>
            </ul>
          </Card>

          {/* Live summary */}
          <Card>
            <SectionHeader icon={<ClipboardList size={15} />} title="Request Summary" sub="Live preview" />
            <div className={s.summaryList}>
              <SummaryRow k="Type"   v={f.resignationType} />
              <SummaryRow k="Reason" v={selectedReason?.l} />
              <SummaryRow k="Last Day"
                v={f.proposedLastWorkingDate
                  ? new Date(f.proposedLastWorkingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—'} />
              <SummaryRow k="Notice" v={`${days} days`} cls={valid ? s.summaryOk : s.summaryErr} />
              {f.noticePeriodWaiver && <SummaryRow k="Waiver" v="Requested" cls={s.summaryWarn} />}
              {f.handoverBuddyId && (
                <SummaryRow k="Handover To" v={buddyLookup.status === 'found' ? buddyLookup.name : f.handoverBuddyId.toUpperCase()} />
              )}
              {f.willingToTrain && <SummaryRow k="Training" v="Willing to train" cls={s.summaryOk} />}
              {isElevated && <SummaryRow k="Approver" v="HR (Direct)" cls={s.summaryPrimary} />}
            </div>
          </Card>
        </div>
      </div>

      {/* Confirm Modal */}
      {confirm && (
        <Modal title="Confirm Resignation" onClose={() => setConfirm(false)} size="sm">
          <div className={s.conf}>
            <div className={s.confWarn}>
              <div className={s.confWarnIcon}><AlertTriangle size={18} /></div>
              <div className={s.confWarnBody}>
                <strong>Are you sure you want to submit?</strong>
                <p>
                  {isElevated
                    ? 'This will submit your resignation directly to HR for review.'
                    : 'This will submit your resignation and notify your manager immediately.'}
                </p>
              </div>
            </div>
            <div className={s.confDetails}>
              <ConfRow k="Last Working Date"  v={new Date(f.proposedLastWorkingDate).toLocaleDateString('en-GB')} />
              <ConfRow k="Resignation Type"   v={f.resignationType} />
              <ConfRow k="Reason"             v={selectedReason?.l} />
              <ConfRow k="Notice Period"      v={`${days} days`} />
              {f.noticePeriodWaiver && <ConfRow k="Waiver" v="Requested" warn />}
              {f.handoverBuddyId    && <ConfRow k="Handover Buddy" v={buddyLookup.status === 'found' ? buddyLookup.name : f.handoverBuddyId.toUpperCase()} />}
              <ConfRow k="First Approver" v={isElevated ? 'HR (Direct)' : 'L1 Manager'} />
            </div>
            <div className={s.confActions}>
              <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
              <Button variant="danger" loading={loading} onClick={submit}>
                Yes, Submit Resignation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}


// ─── Helper Components ────────────────────────────────────────────────────────

function SnapItem({ label, value }) {
  return (
    <div className={s.snapshotItem}>
      <span className={s.snapshotKey}>{label}</span>
      <span className={s.snapshotVal}>{value}</span>
    </div>
  )
}

function SectionHeader({ icon, title, sub }) {
  return (
    <div className={s.secHeader}>
      <div className={s.secIconWrap}>{icon}</div>
      <div><div className={s.secTitle}>{title}</div><div className={s.secSub}>{sub}</div></div>
    </div>
  )
}

function Field({ label, required, optional, hint, error, children }) {
  return (
    <div className={s.fld}>
      {label && (
        <label className={s.label}>
          {label}
          {required && <span className={s.req}> *</span>}
          {optional && <span className={s.opt}> (optional)</span>}
        </label>
      )}
      {children}
      {hint  && !error && <span className={s.hint}>{hint}</span>}
      {error && <span className={s.fieldErr}>{error}</span>}
    </div>
  )
}

function CharCount({ value, max }) {
  const over = value.length > max
  return (
    <span className={s.charCount} style={{ color: over ? '#DC2626' : undefined }}>
      {value.length}/{max}
    </span>
  )
}

function SummaryRow({ k, v, cls }) {
  return (
    <>
      <div className={s.summaryRow}>
        <span className={s.summaryKey}>{k}</span>
        <strong className={cls || s.summaryVal}>{v}</strong>
      </div>
      <div className={s.summaryDivider} />
    </>
  )
}

function ConfRow({ k, v, warn }) {
  return (
    <>
      <div className={s.confRow}>
        <span>{k}</span>
        <strong style={warn ? { color: '#D97706' } : undefined}>{v}</strong>
      </div>
      <div className={s.confDivider} />
    </>
  )
}
