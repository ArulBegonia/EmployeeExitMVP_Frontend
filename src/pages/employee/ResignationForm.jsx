import React, { useState, useEffect } from 'react'
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
  Plus, Trash2, Package, Users, Info, ClipboardList, ShieldCheck, ChevronDown
} from 'lucide-react'
import { addDays, format, differenceInDays } from 'date-fns'
import s from './ResignationForm.module.css'

const REASONS = [
  { v: 0, k: 'Select',       l: 'Select the Reason' },
  { v: 1, k: 'CareerGrowth', l: 'Career Growth' },
  { v: 2, k: 'HigherStudies',l: 'Higher Studies' },
  { v: 3, k: 'Relocation',   l: 'Relocation' },
  { v: 4, k: 'Personal',     l: 'Personal' },
  { v: 5, k: 'Health',       l: 'Health Issues' },
  { v: 6, k: 'Other',        l: 'Other' },
]

const ASSET_SUGGESTIONS = [
  'Laptop', 'Mobile Phone', 'Access Card', 'Headset',
  'Monitor', 'Keyboard & Mouse', 'Company Credit Card'
]

// business notice-period is still 30 days
const MIN = 30

// UI date-lock = at least 7 days from today
const UI_LOCK_DAYS = 7
const uiMinDate = format(addDays(new Date(), UI_LOCK_DAYS), 'yyyy-MM-dd')

// NOTICE: `days` and validation still use MIN (30) – behaviour unchanged

const ACTIVE_STATUSES = [
  'PendingL1Approval', 'PendingL2Approval', 'PendingHrReview',
  'ClearanceInProgress', 'SettlementPending'
]

function getCurrentUserRole() {
  try {
    const token = localStorage.getItem('em_token')
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    return (
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      payload['role'] || payload['roles'] || null
    )
  } catch {
    return null
  }
}

// get current employee id/code from token
function getCurrentEmpIdentity() {
  try {
    const token = localStorage.getItem('em_token')
    if (!token) return { empId: null, employeeCode: null }
    const payload = JSON.parse(atob(token.split('.')[1]))
    const empId        = parseInt(payload['empId'] || payload['sub']) || null
    const employeeCode = payload['employeeCode'] || null
    return { empId, employeeCode }
  } catch {
    return { empId: null, employeeCode: null }
  }
}

export default function ResignationForm() {
  const nav = useNavigate()
  const [f, setF] = useState({
    reasonType:              0,         
    detailedReason:          '',
    proposedLastWorkingDate: uiMinDate, 
    handoverBuddyId:         '',
    handoverNotes:           '',
  })

  const [assets, setAssets]         = useState([])
  const [assetInput, setAssetInput] = useState({ assetName: '', assetCode: '' })
  const [assetErrors, setAssetErrors] = useState({})
  const [formErrors, setFormErrors]   = useState({})
  const [confirm, setConfirm]         = useState(false)
  const [loading, setL]               = useState(false)
  const [done, setDone]               = useState(null)
  const [checking, setChecking]       = useState(true)
  const [existing, setExisting]       = useState(null)

  const userRole = getCurrentUserRole()
  const {
    empId: currentEmpId,
    employeeCode: currentEmpCode
  } = getCurrentEmpIdentity()

  const isHrOrAdmin   = userRole === 'HR' || userRole === 'ADMIN'
  const isElevated    = isHrOrAdmin
  const selectedReason = REASONS.find(r => r.v === f.reasonType)

  useEffect(() => {
    api.get('/Exit/my-exit-status')
      .then(r => {
        const data = r.data?.data || r.data
        if (data && ACTIVE_STATUSES.includes(data.status)) setExisting(data)
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [])

  const days  = f.proposedLastWorkingDate
    ? differenceInDays(new Date(f.proposedLastWorkingDate), new Date())
    : 0
  const valid = days >= MIN
  const isOther = f.reasonType === 6

  const validateForm = () => {
    const errs = {}

    if (!f.reasonType || f.reasonType === 0)
      errs.reasonType = 'Please select a reason for your resignation.'

    if (!f.proposedLastWorkingDate)
      errs.proposedLastWorkingDate = 'Last working date is required.'
    else if (days < MIN)
      errs.proposedLastWorkingDate = `Must be at least ${MIN} days from today.`
    else if (new Date(f.proposedLastWorkingDate) > addDays(new Date(), 365))
      errs.proposedLastWorkingDate = 'Cannot be more than 1 year in the future.'

    if (isOther && !f.detailedReason.trim())
      errs.detailedReason = 'Please describe your reason when selecting "Other".'

    if (f.detailedReason && f.detailedReason.length > 2000)
      errs.detailedReason = 'Details must not exceed 2000 characters.'

    if (f.handoverNotes && f.handoverNotes.length > 2000)
      errs.handoverNotes = 'Handover notes must not exceed 2000 characters.'

    // Handover buddy must not be self – compare against employeeCode instead of numeric empId
    if (f.handoverBuddyId && currentEmpCode &&
      f.handoverBuddyId.trim().toUpperCase() === currentEmpCode.toUpperCase()) {
      errs.handoverBuddyId = 'You cannot assign yourself as the handover buddy.'
    }

    // allow alphanumeric employee codes like EMP014, so only basic presence check here
    if (f.handoverBuddyId && f.handoverBuddyId.length > 50)
      errs.handoverBuddyId = 'Handover buddy code looks too long.'

    // Assets
    if (assets.length > 20)
      errs.assets = 'Cannot declare more than 20 assets.'

    if (assets.some(a => !a.assetCode.trim()))
      errs.assets = 'Serial / Tag # is required for all assets.'

    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateAssetInput = () => {
    const errs = {}
    if (!assetInput.assetName.trim()) errs.assetName = 'Asset name is required'
    if (!assetInput.assetCode.trim()) errs.assetCode = 'Serial / Tag # is required'
    if (
      assetInput.assetCode.trim() &&
      assets.some(a =>
        a.assetCode.trim().toLowerCase() === assetInput.assetCode.trim().toLowerCase()
      )
    ) errs.assetCode = `Serial "${assetInput.assetCode}" is already used`
    setAssetErrors(errs)
    return Object.keys(errs).length === 0
  }

  const addAsset = () => {
    if (assets.length >= 20) {
      toast.error('Cannot declare more than 20 assets.')
      return
    }
    if (!validateAssetInput()) return
    setAssets(p => [...p, { ...assetInput }])
    setAssetInput({ assetName: '', assetCode: '' })
    setAssetErrors({})
  }

  const addSuggested = (name) => {
    if (assets.length >= 20) {
      toast.error('Cannot declare more than 20 assets.')
      return
    }
    if (assets.some(a => a.assetName === name)) return
    setAssets(p => [...p, { assetName: name, assetCode: '' }])
  }

  const updateAssetCode = (idx, code) => {
    const isDup = assets.some((a, i) =>
      i !== idx &&
      a.assetCode.trim().toLowerCase() === code.trim().toLowerCase() &&
      code.trim() !== ''
    )
    if (isDup) {
      toast.error(`Serial "${code}" is already used`)
      return
    }
    setAssets(p => p.map((a, i) => i === idx ? { ...a, assetCode: code } : a))
  }

  const removeAsset = (idx) =>
    setAssets(p => p.filter((_, i) => i !== idx))

  const allAssetsHaveSerial = assets.every(a => a.assetCode.trim() !== '')

  const canSubmit =
    valid &&
    f.reasonType !== 0 &&
    !(isOther && !f.detailedReason.trim()) &&
    allAssetsHaveSerial

  const handleSubmitClick = () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting.')
      return
    }
    setConfirm(true)
  }

  const submit = async () => {
    if (!allAssetsHaveSerial) {
      toast.error('Please fill Serial / Tag # for all assets')
      return
    }
    setL(true)
    try {
      const r = await api.post('/Exit/resign', {
        reasonType:              f.reasonType,
        detailedReason:          f.detailedReason || null,
        proposedLastWorkingDate: new Date(f.proposedLastWorkingDate).toISOString(),
        handoverBuddyId:         f.handoverBuddyId ? f.handoverBuddyId.trim() : null,
        handoverNotes:           f.handoverNotes || null,
        assets:                  assets.length > 0 ? assets : null,
      })
      toast.success('Resignation submitted successfully!')
      setDone(r.data?.data || r.data)
      setConfirm(false)
    } catch (e) {
      const status = e.response?.status
      const msg    = e.response?.data?.message || ''
      if (status === 400) {
        const errors = e.response?.data?.errors
        toast.error(
          errors ? Object.values(errors).flat().join(' ') : msg || 'Validation failed'
        )
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

  if (checking) return <Loader text="Checking your exit status..." />

  if (existing) return (
    <div className={s.pg}>
      <div className={s.hdr}>
        <div className={s.hdrGrid} />
        <div className={s.hdrOrb} />
        <div className={s.hdrContent}>
          <div className={s.hdrEyebrow}>
            <span className={s.hdrEyebrowDot} />
            <span>Submit Resignation</span>
          </div>
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
                    .toLocaleDateString('en-GB', {
                      day: '2-digit', month: 'long', year: 'numeric'
                    })}
                </strong>
              </div>
            </div>
            <StatusBadge status={existing.status} />
          </div>
          <div className={s.existingTimeline}>
            <StepTimeline status={existing.status} />
          </div>
          <Link to="/employee/status">
            <Button variant="primary">
              Track My Exit Status <ArrowRight size={14} />
            </Button>
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

  return (
    <div className={s.pg}>
      <div className={s.hdr}>
        <div className={s.hdrGrid} />
        <div className={s.hdrOrb} />
        <div className={s.hdrContent}>
          <div className={s.hdrEyebrow}>
            <span className={s.hdrEyebrowDot} />
            <span>Exit Management</span>
          </div>
          <h2 className={s.hdrTitle}>Submit Resignation</h2>
          <p className={s.hdrSub}>Fill in the details below to start your exit process</p>
        </div>
      </div>

      <div className={s.grid}>
        <div className={s.leftCol}>

          {/* Resignation Details */}
          <Card>
            <div className={s.secHeader}>
              <div className={s.secIconWrap}><FileText size={15} /></div>
              <div>
                <div className={s.secTitle}>Resignation Details</div>
                <div className={s.secSub}>Primary information about your resignation</div>
              </div>
            </div>

            <div className={s.form}>

              <div className={s.fld}>
                <label className={s.label}>
                  Reason for Resignation <span className={s.req}>*</span>
                </label>
                <div className={s.selectWrap}>
                  <select
                    className={`${s.select} ${formErrors.reasonType ? s.inputErr : ''}`}
                    value={f.reasonType}
                    onChange={e =>
                      setF(p => ({ ...p, reasonType: parseInt(e.target.value, 10) }))
                    }
                  >
                    {REASONS.map(r => (
                      <option
                        key={r.v}
                        value={r.v}
                        disabled={r.v === 0}
                      >
                        {r.l}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className={s.selectIcon} />
                </div>
                {formErrors.reasonType && (
                  <span className={s.fieldErr}>{formErrors.reasonType}</span>
                )}
              </div>

              <div className={s.fld}>
                <label className={s.label}>
                  Additional Details{' '}
                  {isOther
                    ? <span className={s.req}>*</span>
                    : <span className={s.opt}></span>}
                </label>
                <textarea
                  className={`${s.textarea} ${formErrors.detailedReason ? s.inputErr : ''}`}
                  rows={3}
                  placeholder={isOther
                    ? 'Please describe your reason (required for Other)...'
                    : 'Provide more context about your decision...'}
                  value={f.detailedReason}
                  onChange={e => {
                    setF(p => ({ ...p, detailedReason: e.target.value }))
                    if (formErrors.detailedReason)
                      setFormErrors(p => ({ ...p, detailedReason: undefined }))
                  }}
                />
                <span
                  className={s.charCount}
                  style={{ color: f.detailedReason.length > 2000 ? '#DC2626' : undefined }}
                >
                  {f.detailedReason.length}/2000
                </span>
                {formErrors.detailedReason && (
                  <span className={s.fieldErr}>{formErrors.detailedReason}</span>
                )}
              </div>

              <div className={s.fld}>
                <label className={s.label}>
                  <Calendar size={13} /> Proposed Last Working Date
                  <span className={s.req}>*</span>
                </label>
                <input
                  className={`${s.input} ${formErrors.proposedLastWorkingDate ? s.inputErr : ''}`}
                  type="date"
                  min={uiMinDate} 
                  value={f.proposedLastWorkingDate}
                  onChange={e => {
                    setF(p => ({ ...p, proposedLastWorkingDate: e.target.value }))
                    if (formErrors.proposedLastWorkingDate)
                      setFormErrors(p => ({ ...p, proposedLastWorkingDate: undefined }))
                  }}
                />
                <div
                  className={`${s.noticePill} ${valid ? s.noticePillOk : s.noticePillErr}`}
                >
                  <span>{valid ? '✓' : '!'}</span>
                  {days} days notice period
                  {!valid && ` — minimum ${MIN} days required`}
                </div>
                {formErrors.proposedLastWorkingDate && (
                  <span className={s.fieldErr}>{formErrors.proposedLastWorkingDate}</span>
                )}
              </div>

            </div>
          </Card>

          {/* Handover Details */}
          <Card>
            <div className={s.secHeader}>
              <div className={s.secIconWrap}><Users size={15} /></div>
              <div>
                <div className={s.secTitle}>Handover Details</div>
                <div className={s.secSub}>Knowledge transfer and responsibility handover</div>
              </div>
            </div>

            <div className={s.form}>

              <div className={s.fld}>
                <label className={s.label}>
                  Handover Buddy Employee Code <span className={s.req}>*</span>
                </label>
                <input
                  className={`${s.input} ${formErrors.handoverBuddyId ? s.inputErr : ''}`}
                  type="text"
                  placeholder="e.g. EMP014"
                  value={f.handoverBuddyId}
                  onChange={e => {
                    setF(p => ({ ...p, handoverBuddyId: e.target.value }))
                    if (formErrors.handoverBuddyId)
                      setFormErrors(p => ({ ...p, handoverBuddyId: undefined }))
                  }}
                />
                <span className={s.hint}>
                  Enter the employee code of the person who will take over your responsibilities
                </span>
                {formErrors.handoverBuddyId && (
                  <span className={s.fieldErr}>{formErrors.handoverBuddyId}</span>
                  
                )}
              </div>

              <div className={s.fld}>
                <label className={s.label}>
                  Handover Notes <span className={s.opt}></span>
                </label>
                <textarea
                  className={`${s.textarea} ${formErrors.handoverNotes ? s.inputErr : ''}`}
                  rows={3}
                  placeholder="Key information, ongoing projects, credentials to handover..."
                  value={f.handoverNotes}
                  onChange={e => {
                    setF(p => ({ ...p, handoverNotes: e.target.value }))
                    if (formErrors.handoverNotes)
                      setFormErrors(p => ({ ...p, handoverNotes: undefined }))
                  }}
                />
                <span
                  className={s.charCount}
                  style={{ color: f.handoverNotes.length > 2000 ? '#DC2626' : undefined }}
                >
                  {f.handoverNotes.length}/2000
                </span>
                {formErrors.handoverNotes && (
                  <span className={s.fieldErr}>{formErrors.handoverNotes}</span>
                )}
              </div>

            </div>
          </Card>

          {/* Asset Declaration */}
          <Card>
            <div className={s.secHeader}>
              <div className={s.secIconWrap}><Package size={15} /></div>
              <div>
                <div className={s.secTitle}>Asset Declaration</div>
                <div className={s.secSub}>Declare all company assets in your possession</div>
              </div>
            </div>

            <div className={s.assetNote}>
              <Info size={13} />
              <span>Serial / Tag # is mandatory and must be unique per asset</span>
            </div>

            <div className={s.suggestions}>
              {ASSET_SUGGESTIONS.map(name => (
                <button
                  key={name}
                  type="button"
                  className={`${s.chip} ${assets.some(a => a.assetName === name) ? s.chipAdded : ''}`}
                  onClick={() => addSuggested(name)}
                  disabled={assets.some(a => a.assetName === name)}
                >
                  {assets.some(a => a.assetName === name) ? '✓ ' : '+ '}{name}
                </button>
              ))}
            </div>

            <div className={s.assetAddRow}>
              <div className={s.assetAddField}>
                <input
                  className={`${s.input} ${assetErrors.assetName ? s.inputErr : ''}`}
                  placeholder="Asset name *"
                  value={assetInput.assetName}
                  onChange={e => setAssetInput(p => ({ ...p, assetName: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addAsset()}
                />
                {assetErrors.assetName && (
                  <span className={s.fieldErr}>{assetErrors.assetName}</span>
                )}
              </div>
              <div className={s.assetAddField}>
                <input
                  className={`${s.input} ${assetErrors.assetCode ? s.inputErr : ''}`}
                  placeholder="Serial / Tag # *"
                  value={assetInput.assetCode}
                  onChange={e => setAssetInput(p => ({ ...p, assetCode: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addAsset()}
                />
                {assetErrors.assetCode && (
                  <span className={s.fieldErr}>{assetErrors.assetCode}</span>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={addAsset}>
                <Plus size={13} /> Add
              </Button>
            </div>

            {/* Asset list level error */}
            {formErrors.assets && (
              <span className={s.fieldErr}>{formErrors.assets}</span>
            )}

            {assets.length > 0 && (
              <div className={s.assetList}>
                {assets.map((a, i) => (
                  <div
                    key={i}
                    className={`${s.assetItem} ${!a.assetCode.trim() ? s.assetItemWarn : ''}`}
                  >
                    <div className={s.assetItemIcon}><Package size={13} /></div>
                    <span className={s.assetName}>{a.assetName}</span>
                    <input
                      className={`${s.assetCodeInline} ${!a.assetCode.trim() ? s.assetCodeInlineErr : ''}`}
                      placeholder="Serial / Tag # *"
                      value={a.assetCode}
                      onChange={e => updateAssetCode(i, e.target.value)}
                    />
                    <button type="button" className={s.removeBtn} onClick={() => removeAsset(i)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {!allAssetsHaveSerial && (
                  <div className={s.assetWarnMsg}>
                    Please fill Serial / Tag # for all assets before submitting.
                  </div>
                )}
              </div>
            )}

            {assets.length === 0 && (
              <div className={s.emptyAssets}>
                <Package size={20} />
                <span>No assets declared. If you hold no company assets, you may skip this section.</span>
              </div>
            )}
          </Card>

          {/* Submit */}
          <Button
            variant="primary" size="lg"
            onClick={handleSubmitClick}
            disabled={!canSubmit}
          >
            <FileText size={15} />
            Submit Resignation
          </Button>
        </div>

        {/* Right Sidebar */}
        <div className={s.side}>
          <Card>
            <div className={s.secHeader}>
              <div className={s.secIconWrap}><ShieldCheck size={15} /></div>
              <div>
                <div className={s.secTitle}>Before You Submit</div>
                <div className={s.secSub}>Important guidelines</div>
              </div>
            </div>
            <ul className={s.guideList}>
              <li className={s.guideItem}>
                <span className={s.guideDot} />
                Minimum <strong>{MIN}-day</strong> notice period required
              </li>
              {isElevated
                ? <li className={s.guideItem}><span className={s.guideDot} />As <strong>{userRole}</strong>, resignation goes <strong>directly to HR</strong></li>
                : <li className={s.guideItem}><span className={s.guideDot} />Your L1 Manager is notified immediately</li>}
              {isElevated
                ? <li className={s.guideItem}><span className={s.guideDot} />Flow: HR → IT + Admin clearance → Settlement</li>
                : <li className={s.guideItem}><span className={s.guideDot} />Flow: L1 → L2 → HR → IT + Admin → Settlement</li>}
              <li className={s.guideItem}><span className={s.guideDot} /><strong>Serial / Tag #</strong> must be unique per asset</li>
              <li className={s.guideItem}><span className={s.guideDot} />Only <strong>one active</strong> exit request at a time</li>
            </ul>
          </Card>

          <Card>
            <div className={s.secHeader}>
              <div className={s.secIconWrap}><ClipboardList size={15} /></div>
              <div>
                <div className={s.secTitle}>Request Summary</div>
                <div className={s.secSub}>Live preview of your submission</div>
              </div>
            </div>
            <div className={s.summaryList}>
              <div className={s.summaryRow}>
                <span className={s.summaryKey}>Reason</span>
                <strong className={s.summaryVal}>{selectedReason?.l}</strong>
              </div>
              <div className={s.summaryDivider} />
              <div className={s.summaryRow}>
                <span className={s.summaryKey}>Last Day</span>
                <strong className={s.summaryVal}>
                  {f.proposedLastWorkingDate
                    ? new Date(f.proposedLastWorkingDate)
                      .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'}
                </strong>
              </div>
              <div className={s.summaryDivider} />
              <div className={s.summaryRow}>
                <span className={s.summaryKey}>Notice Period</span>
                <strong className={valid ? s.summaryOk : s.summaryErr}>{days} days</strong>
              </div>
              <div className={s.summaryDivider} />
              <div className={s.summaryRow}>
                <span className={s.summaryKey}>Assets</span>
                <strong className={
                  assets.length > 0
                    ? (allAssetsHaveSerial ? s.summaryOk : s.summaryWarn)
                    : s.summaryMuted
                }>
                  {assets.length > 0
                    ? `${assets.length} item${assets.length > 1 ? 's' : ''}${!allAssetsHaveSerial ? ' ⚠️' : ''}`
                    : 'None'}
                </strong>
              </div>
              {f.handoverBuddyId && (
                <>
                  <div className={s.summaryDivider} />
                  <div className={s.summaryRow}>
                    <span className={s.summaryKey}>Handover Buddy</span>
                    <strong className={s.summaryVal}>EMP #{f.handoverBuddyId}</strong>
                  </div>
                </>
              )}
              {isElevated && (
                <>
                  <div className={s.summaryDivider} />
                  <div className={s.summaryRow}>
                    <span className={s.summaryKey}>Approver</span>
                    <strong className={s.summaryPrimary}>HR (Direct)</strong>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

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
              <div className={s.confRow}>
                <span>Last Working Date</span>
                <strong>{new Date(f.proposedLastWorkingDate).toLocaleDateString('en-GB')}</strong>
              </div>
              <div className={s.confDivider} />
              <div className={s.confRow}>
                <span>Reason</span>
                <strong>{selectedReason?.l}</strong>
              </div>
              <div className={s.confDivider} />
              <div className={s.confRow}>
                <span>Assets Declared</span>
                <strong>{assets.length > 0 ? `${assets.length} items` : 'None'}</strong>
              </div>
              <div className={s.confDivider} />
              <div className={s.confRow}>
                <span>First Approver</span>
                <strong>{isElevated ? 'HR (Direct)' : 'L1 Manager'}</strong>
              </div>
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
