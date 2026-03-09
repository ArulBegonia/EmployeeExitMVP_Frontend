import React, { useEffect, useState } from 'react'
import api from '../../services/api.js'
import StatCard from '../../components/common/StatCard.jsx'
import Loader from '../../components/common/Loader.jsx'
import { Users, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import s from './AdminHome.module.css'

export default function AdminHome() {
  const [analytics, setAnalytics] = useState(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    api.get('/Exit/analytics')
      .then(r => setAnalytics(r.data?.data || r.data))
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false))
  }, [])

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
              <h2 className={s.hdrTitle}>Admin Dashboard</h2>
              <p className={s.hdrSub}>
                Overview of all exit processes. Manage clearances and settlements.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className={s.stats}>
        <StatCard
          label="Total Exits"
          value={analytics?.totalExits ?? '—'}
          icon={<Users size={20} />}
          color="#27235C"
        />
        <StatCard
          label="Completed"
          value={analytics?.completedExits ?? '—'}
          icon={<CheckCircle size={20} />}
          color="#16A34A"
        />
        <StatCard
          label="In Progress"
          value={analytics?.pendingExits ?? '—'}
          icon={<Clock size={20} />}
          color="#D97706"
        />
        <StatCard
          label="Avg. Days"
          value={analytics?.averageProcessingDays
            ? `${analytics.averageProcessingDays}d`
            : '—'}
          icon={<TrendingUp size={20} />}
          color="#9D247D"
        />
      </div>

    </div>
  )
}
