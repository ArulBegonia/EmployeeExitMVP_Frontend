import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useNotifications } from '../../context/NotificationContext.jsx'
import NotificationPanel from './NotificationPanel.jsx'
import {
  LogOut, Bell, Menu, X, ChevronRight, User, Mail, Shield, Building2
} from 'lucide-react'
import styles from './Layout.module.css'

export default function Layout({ children, navItems, title }) {
  const { user, logout }              = useAuth()
  const { unreadCount }               = useNotifications()
  const location                      = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notifOpen,   setNotifOpen]   = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef                    = useRef(null)

  const roleLabels = {
    EMPLOYEE: 'Employee',
    MANAGER:  'Manager',
    HR:       'HR Executive',
    IT:       'IT Staff',
    ADMIN:    'Administrator'
  }

  const roleStyleMap = {
    EMPLOYEE: 'roleEmployee',
    MANAGER:  'roleManager',
    HR:       'roleHR',
    IT:       'roleIT',
    ADMIN:    'roleAdmin'
  }

  const roleKey   = user?.role || 'EMPLOYEE'
  const roleClass = roleStyleMap[roleKey] || 'roleEmployee'
  const roleLabel = roleLabels[roleKey]   || roleKey

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className={styles.shell}>

      {/* ── Sidebar ── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.collapsed}`}>

        {/* Brand Header */}
        <div className={styles.sidebarHeader}>
          {sidebarOpen && (
            <div className={styles.brand}>
              <div className={styles.brandIcon}><span>EM</span></div>
              <div className={styles.brandText}>
                <div className={styles.brandName}>ExitManage</div>
                <div className={styles.brandSub}>Relevantz</div>
              </div>
            </div>
          )}
          <button
            className={styles.toggleBtn}
            onClick={() => setSidebarOpen(p => !p)}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Role Chip */}
        {sidebarOpen && (
          <div className={styles.roleChipWrap}>
            <div className={`${styles.roleChip} ${styles[roleClass]}`}>
              <span className={styles.roleChipDot} />
              <span className={styles.roleChipText}>{roleLabel}</span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className={styles.nav}>
          {navItems.map(item => {
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`${styles.navItem} ${active ? styles.navActive : ''}`}
                title={!sidebarOpen ? item.label : ''}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {sidebarOpen && <span className={styles.navLabel}>{item.label}</span>}
                {sidebarOpen && active && <ChevronRight size={13} className={styles.navArrow} />}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className={styles.sidebarFooter}>
          {sidebarOpen && (
            <div className={styles.sidebarUserMini}>
              <div className={`${styles.suAvatar} ${styles[roleClass + 'Bg']}`}>
                {roleKey.charAt(0)}
              </div>
              <div className={styles.suInfo}>
                {/* ── CHANGED: show employeeCode instead of empId ── */}
                <div className={styles.suId}>{user?.employeeCode || '—'}</div>
                <div className={styles.suRole}>{roleLabel}</div>
              </div>
            </div>
          )}
          <button className={styles.logoutBtn} onClick={logout} title="Logout">
            <LogOut size={16} />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className={styles.main}>

        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <div className={styles.pageTitleWrap}>
              <div className={`${styles.pageTitleAccent} ${styles[roleClass + 'Accent']}`} />
              <h1 className={styles.pageTitle}>{title}</h1>
            </div>
          </div>

          <div className={styles.topbarRight}>

            {/* Notification Bell */}
            <button
              className={styles.notifBtn}
              onClick={() => setNotifOpen(p => !p)}
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className={styles.badge}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <div className={styles.topbarDivider} />

            {/* Profile Button */}
            <div className={styles.profileWrap} ref={profileRef}>
              <button
                className={`${styles.avatarBtn} ${profileOpen ? styles.avatarBtnActive : ''}`}
                onClick={() => setProfileOpen(p => !p)}
                title="Profile"
              >
                <div className={`${styles.avatar} ${styles[roleClass + 'Bg']}`}>
                  {roleKey.charAt(0)}
                </div>
                <div className={styles.avatarMeta}>
                  {/* ── CHANGED: show employeeCode instead of empId ── */}
                  <span className={styles.avatarEmpId}>{user?.employeeCode || 'User'}</span>
                  <span className={styles.avatarRoleLabel}>{roleLabel}</span>
                </div>
                <ChevronRight
                  size={13}
                  className={`${styles.avatarChevron} ${profileOpen ? styles.avatarChevronOpen : ''}`}
                />
              </button>

              {/* Profile Dropdown */}
              {profileOpen && (
                <div className={styles.profileDrop}>

                  {/* Header */}
                  <div className={`${styles.pdHeader} ${styles[roleClass + 'Header']}`}>
                    <div className={styles.pdAvatarSection}>
                      <div className={styles.pdAvatarLg}>{roleKey.charAt(0)}</div>
                      <div className={styles.pdOnlineDot} />
                    </div>
                    <div className={styles.pdHeaderInfo}>
                      <div className={styles.pdName}>{roleLabel}</div>
                      {/* ── CHANGED: show employeeCode instead of empId ── */}
                      <div className={styles.pdEmpIdBadge}>
                        <span>ID: {user?.employeeCode || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Info rows */}
                  <div className={styles.pdBody}>

                    <div className={styles.pdRow}>
                      <div className={`${styles.pdRowIcon} ${styles[roleClass + 'IconBg']}`}>
                        <User size={13} className={styles[roleClass + 'IconColor']} />
                      </div>
                      <div className={styles.pdRowContent}>
                        <div className={styles.pdLabel}>Employee ID</div>
                        {/* ── CHANGED: show employeeCode instead of empId ── */}
                        <div className={styles.pdValue}>{user?.employeeCode || '—'}</div>
                      </div>
                    </div>

                    <div className={styles.pdDivider} />

                    <div className={styles.pdRow}>
                      <div className={`${styles.pdRowIcon} ${styles[roleClass + 'IconBg']}`}>
                        <Shield size={13} className={styles[roleClass + 'IconColor']} />
                      </div>
                      <div className={styles.pdRowContent}>
                        <div className={styles.pdLabel}>Role</div>
                        <div className={styles.pdValue}>{roleLabel}</div>
                      </div>
                      <div className={`${styles.pdRolePill} ${styles[roleClass + 'Pill']}`}>
                        {roleKey}
                      </div>
                    </div>

                    <div className={styles.pdDivider} />

                    <div className={styles.pdRow}>
                      <div className={`${styles.pdRowIcon} ${styles[roleClass + 'IconBg']}`}>
                        <Mail size={13} className={styles[roleClass + 'IconColor']} />
                      </div>
                      <div className={styles.pdRowContent}>
                        <div className={styles.pdLabel}>Email</div>
                        {/* ── CHANGED: show actual email from JWT, no fake fallback ── */}
                        <div className={styles.pdValue}>{user?.email || '—'}</div>
                      </div>
                    </div>

                    <div className={styles.pdDivider} />

                    <div className={styles.pdRow}>
                      <div className={`${styles.pdRowIcon} ${styles[roleClass + 'IconBg']}`}>
                        <Building2 size={13} className={styles[roleClass + 'IconColor']} />
                      </div>
                      <div className={styles.pdRowContent}>
                        <div className={styles.pdLabel}>Organization</div>
                        <div className={styles.pdValue}>Relevantz Technologies</div>
                      </div>
                    </div>

                  </div>

                  {/* Footer */}
                  <div className={styles.pdFooter}>
                    <button className={styles.pdLogout} onClick={logout}>
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>

                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={styles.content}>
          {children}
        </main>
      </div>

      {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
    </div>
  )
}
