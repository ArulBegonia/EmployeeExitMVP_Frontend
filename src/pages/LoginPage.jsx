import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const { login } = useAuth()
  const [form, setForm]               = useState({ email: '', password: '' })
  const [showPw, setShowPw]           = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // ── Password rules ──
  const PW_RULES = [
    { test: v => v.length >= 8,          msg: 'at least 8 characters'         },
    { test: v => /[A-Z]/.test(v),        msg: 'one uppercase letter (A–Z)'    },
    { test: v => /[a-z]/.test(v),        msg: 'one lowercase letter (a–z)'    },
    { test: v => /[0-9]/.test(v),        msg: 'one number (0–9)'              },
    { test: v => /[^A-Za-z0-9]/.test(v), msg: 'one special character (!@#$…)' },
  ]

  const validate = () => {
    const errs = {}
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!form.email.trim())
      errs.email = 'Email address is required.'
    else if (!emailRegex.test(form.email.trim()))
      errs.email = 'Please enter a valid email address.'

    if (!form.password) {
      errs.password = 'Password is required.'
    } else {
      const failed = PW_RULES.filter(r => !r.test(form.password))
      if (failed.length > 0)
        errs.password = `Password must contain ${failed.map(r => r.msg).join(', ')}.`
    }

    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    if (!validate()) return

    setLoading(true)
    try {
      await login(form.email.trim(), form.password)
    } catch (err) {
      const status = err.response?.status
      const data   = err.response?.data
      console.error('[Login] Error:', err)
      if (!err.response) {
        setError('Cannot connect to backend. Is it running on port 5178?')
      } else if (status === 401) {
        setError(data?.message || 'Invalid email or password.')
      } else if (status === 400) {
        const details = data?.errors
          ? Object.values(data.errors).flat().join(', ')
          : data?.message || 'Bad request'
        setError(details)
      } else {
        setError(err.message || 'Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const features = [
    'Automated approval workflows',
    'Risk assessment engine',
    'Real-time notifications',
    'Document generation',
  ]

  return (
    <div className={styles.page}>

      {/* ── Left Panel ── */}
      <div className={styles.left}>
        <div className={styles.glow1} />
        <div className={styles.glow2} />
        <div className={styles.glow3} />

        <div className={styles.leftInner}>

          {/* Brand */}
          <div className={styles.brand}>
            <div className={styles.brandMark}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" fillOpacity=".9"/>
                <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2"
                  strokeLinecap="round" strokeOpacity=".6"/>
                <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2"
                  strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className={styles.brandName}>ExitManage</div>
              <div className={styles.brandBy}>by Relevantz Technologies</div>
            </div>
          </div>

          {/* Hero */}
          <div className={styles.hero}>
            <div className={styles.heroEyebrow}>
              <span className={styles.eyebrowDot} />
              <span className={styles.eyebrowText}>Employee Exit Management Platform</span>
            </div>
            <h1 className={styles.heroTitle}>
              Exit workflows,
              <span className={styles.heroAccent}>done right.</span>
            </h1>
            <p className={styles.heroSub}>
              End-to-end exit management with automated approvals,
              risk assessment, and real-time tracking — all in one place.
            </p>
          </div>

          {/* Feature pills */}
          <div className={styles.pills}>
            {features.map(f => (
              <div key={f} className={styles.pill}>
                <span className={styles.pillCheck}>✓</span>
                {f}
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className={styles.stats}>
            {[
              { num: '5',    label: 'Role-based flows'   },
              { num: '100%', label: 'Audit tracked'      },
              { num: '∞',    label: 'Scalable workforce' },
            ].map(s => (
              <div key={s.label} className={styles.stat}>
                <div className={styles.statNum}>{s.num}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className={styles.right}>
        <div className={styles.formCard}>

          {/* Form Header */}
          <div className={styles.formHead}>
            <div className={styles.formBadge}>
              <span className={styles.badgeDot} />
              Secure Portal
            </div>
            <h2 className={styles.formTitle}>Welcome back</h2>
            <p className={styles.formSub}>
              Sign in to access your exit management dashboard
            </p>
          </div>

          <div className={styles.divider} />

          {/* Form */}
          <form onSubmit={handleSubmit} className={styles.form} noValidate>

            {/* ── Email field ── */}
            <div className={styles.field}>
              <label className={styles.label}>Email address</label>
              <div className={`${styles.inputBox} ${fieldErrors.email ? styles.inputBoxErr : ''}`}>
                <Mail size={15} className={styles.inputIcon} />
                <input
                  className={styles.input}
                  type="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={e => {
                    setForm(p => ({ ...p, email: e.target.value }))
                    if (fieldErrors.email)
                      setFieldErrors(p => ({ ...p, email: undefined }))
                  }}
                  autoComplete="email"
                  autoFocus
                />
              </div>
              {fieldErrors.email && (
                <span className={styles.fieldErr}>
                  <AlertCircle size={11} /> {fieldErrors.email}
                </span>
              )}
            </div>

            {/* ── Password field ── */}
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label}>Password</label>
              </div>
              <div className={`${styles.inputBox} ${fieldErrors.password ? styles.inputBoxErr : ''}`}>
                <Lock size={15} className={styles.inputIcon} />
                <input
                  className={styles.input}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => {
                    setForm(p => ({ ...p, password: e.target.value }))
                    if (fieldErrors.password)
                      setFieldErrors(p => ({ ...p, password: undefined }))
                  }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPw(p => !p)}
                  tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fieldErrors.password && (
                <span className={styles.fieldErr}>
                  <AlertCircle size={11} /> {fieldErrors.password}
                </span>
              )}
            </div>

            {/* ── API / server error ── */}
            {error && (
              <div className={styles.errorBox} role="alert">
                <div className={styles.errorIcon}>
                  <AlertCircle size={14} />
                </div>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || !form.email || !form.password}
            >
              {loading ? (
                <span className={styles.spinner} />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

          </form>

          {/* Footer */}
          <div className={styles.footerNote}>
            <div className={styles.footerIcon}>
              <ShieldCheck size={14} />
            </div>
            <p>
              Protected by role-based access control.
              Contact your administrator if you cannot sign in.
            </p>
          </div>

        </div>
      </div>

    </div>
  )
}
