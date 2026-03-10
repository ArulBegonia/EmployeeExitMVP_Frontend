import React, { useEffect, useState } from 'react'
import api from '../../services/api.js'
import Card from '../../components/common/Card.jsx'
import Button from '../../components/common/Button.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import Loader from '../../components/common/Loader.jsx'
import toast from 'react-hot-toast'
import { FileText, Download, Award, Shield, RefreshCw, Calendar } from 'lucide-react'
import s from './HRDocuments.module.css'

const DOC_TYPES = [
  {
    key:      'relieving',
    label:    'Relieving Letter',
    icon:     <FileText size={13} />,
    endpoint: id => `/Exit/relieving-letter/${id}`,
    filename: 'RelievingLetter.pdf',
    requiresCompleted: true,
  },
  {
    key:      'experience',
    label:    'Experience Letter',
    icon:     <Award size={13} />,
    endpoint: id => `/Exit/experience-letter/${id}`,
    filename: 'ExperienceLetter.pdf',
    requiresCompleted: true,
  },
  {
    key:      'clearance',
    label:    'Clearance Certificate',
    icon:     <Shield size={13} />,
    endpoint: id => `/Exit/clearance-certificate/${id}`,
    filename: 'ClearanceCertificate.pdf',
    requiresCompleted: false, 
  },
]

const RELEVANT_STATUSES = ['ClearanceInProgress', 'SettlementPending', 'Completed']

export default function HRDocuments() {
  const [list,      setList]  = useState([])
  const [fetching,  setFetch] = useState(true)
  const [dlLoading, setDlL]   = useState({})

  const load = () => {
    setFetch(true)
    api.get('/Exit/all-requests')
      .then(r => {
        const data = r.data?.data || r.data || []
        setList(data.filter(x => RELEVANT_STATUSES.includes(x.status)))
      })
      .catch(() => toast.error('Failed to load exit requests'))
      .finally(() => setFetch(false))
  }

  useEffect(() => { load() }, [])

  const handleDownload = async (docType, row) => {
    if (docType.requiresCompleted && row.status !== 'Completed') {
      toast.error(
        `${docType.label} is only available after the exit is fully Completed.`,
        { duration: 4000 }
      )
      return
    }

    const key = `${docType.key}-${row.id}`
    setDlL(p => ({ ...p, [key]: true }))
    try {
      const res = await api.get(docType.endpoint(row.id), { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a   = document.createElement('a')
      a.href     = url
      a.download = `${docType.filename.replace('.pdf', '')}_${
        row.employeeName?.replace(/\s/g, '_') || row.id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`${docType.label} downloaded!`)
    } catch (err) {
      if (err.response?.status === 404)
        toast.error('Document not available yet for this request.')
      else
        toast.error(err.response?.data?.message || 'Failed to generate document')
    } finally {
      setDlL(p => ({ ...p, [key]: false }))
    }
  }

  if (fetching) return <Loader />

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
              <h2 className={s.hdrTitle}>Document Generation</h2>
              <p className={s.hdrSub}>
                Generate official exit documents for eligible requests
                {list.length > 0 && ` · ${list.length} eligible`}
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
            <div className={s.emptyIconWrap}><FileText size={26} /></div>
          </div>
          <div className={s.emptyText}>
            <h3>No Eligible Requests</h3>
            <p>
              Documents can be generated for requests in
              Clearance, Settlement or Completed stage.
            </p>
          </div>
        </div>
      ) : (
        <div className={s.cards}>
          {list.map(row => (
            <Card key={row.id} className={s.docCard}>

              {row.status === 'Completed' && <div className={s.doneStripe} />}

              {/* Avatar + name */}
              <div className={s.cardTop}>
                <div className={s.avatar}>
                  {(row.employeeName || 'E').charAt(0).toUpperCase()}
                </div>
                <div className={s.topMeta}>
                  <div className={s.empName}>
                    {row.employeeName || row.employeeFullName || `Employee #${row.employeeId}`}
                  </div>
                  <div className={s.empCode}>{row.employeeCode} · #{row.id}</div>
                </div>
                <StatusBadge status={row.status} />
              </div>

              {/* LWD fact tile */}
              <div className={s.lwd}>
                <Calendar size={11} />
                <span>
                  Last Day:{' '}
                  <strong>
                    {row.proposedLastWorkingDate
                      ? new Date(row.proposedLastWorkingDate).toLocaleDateString('en-GB',
                          { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </strong>
                </span>
              </div>

              {/* Document buttons */}
              <div className={s.docBtns}>
                {DOC_TYPES.map(doc => {
                  const isLocked = doc.requiresCompleted && row.status !== 'Completed'
                  return (
                    <button
                      key={doc.key}
                      className={`${s.docBtn} ${
                        row.status === 'Completed' ? s.docBtnPrimary :
                        isLocked ? s.docBtnLocked : s.docBtnOutline
                      }`}
                      disabled={dlLoading[`${doc.key}-${row.id}`] || isLocked}
                      title={isLocked
                        ? `${doc.label} available only after exit is Completed`
                        : undefined}
                      onClick={() => handleDownload(doc, row)}
                    >
                      {dlLoading[`${doc.key}-${row.id}`]
                        ? <span className={s.spinner} />
                        : isLocked
                          ? <span className={s.lockIcon}>🔒</span>
                          : <Download size={12} />}
                      {doc.label}
                    </button>
                  )
                })}
              </div>

              {/* Warning notice */}
              {row.status !== 'Completed' && (
                <div className={s.notice}>
                  Relieving & Experience letters available only after status is{' '}
                  <strong>Completed</strong>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
