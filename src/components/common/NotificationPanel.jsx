import React from 'react'
import { useNotifications } from '../../context/NotificationContext.jsx'
import { Bell, X, CheckCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import styles from './NotificationPanel.module.css'

export default function NotificationPanel({ onClose }) {
  const { notifications, markRead } = useNotifications()

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Bell size={18} />
            <span>Notifications</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={styles.list}>
          {notifications.length === 0 && (
            <div className={styles.empty}>
              <Bell size={32} opacity={0.3} />
              <p>No notifications yet</p>
            </div>
          )}
          {notifications.map(n => (
            <div key={n.id} className={`${styles.item} ${!n.isRead ? styles.unread : ''}`}>
              <div className={styles.itemContent}>
                <div className={styles.itemTitle}>{n.title}</div>
                <div className={styles.itemMsg}>{n.message}</div>
                <div className={styles.itemTime}>
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </div>
              </div>
              {!n.isRead && (
                <button className={styles.readBtn} onClick={() => markRead(n.id)} title="Mark as read">
                  <CheckCheck size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
