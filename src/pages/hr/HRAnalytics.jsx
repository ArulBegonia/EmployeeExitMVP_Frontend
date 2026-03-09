import React, { useEffect, useState } from 'react'
import api from '../../services/api.js'
import Card from '../../components/common/Card.jsx'
import Loader from '../../components/common/Loader.jsx'
import Button from '../../components/common/Button.jsx'
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer
} from 'recharts'
import { Download, BarChart2, RefreshCw } from 'lucide-react'
import s from './HRAnalytics.module.css'

const RISK_COLORS = ['#16A34A', '#D97706', '#EA580C', '#DC2626']

export default function HRAnalytics() {
  const [data,    setData]  = useState(null)
  const [loading, setLoad]  = useState(true)

  const load = () => {
    setLoad(true)
    api.get('/Exit/analytics')
      .then(r => setData(r.data?.data || r.data))
      .catch(() => setData(null))
      .finally(() => setLoad(false))
  }

  useEffect(() => { load() }, [])

  const exportCSV = () => {
    if (!data) return
    const rows = [
      ['Metric', 'Value'],
      ['Total Exits',         data.totalExits],
      ['Completed',           data.completedExits],
      ['Pending',             data.pendingExits],
      ['Avg Processing Days', data.averageProcessingDays],
      ['Low Risk',            data.lowRiskCount],
      ['Medium Risk',         data.mediumRiskCount],
      ['High Risk',           data.highRiskCount],
      ['Critical Risk',       data.criticalRiskCount],
      ['Top Reason',          data.topResignationReason],
    ]
    const csv  = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'exit_analytics.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <Loader />

  if (!data) return (
    <div className={s.pg}>
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
              <h2 className={s.hdrTitle}>Exit Analytics</h2>
              <p className={s.hdrSub}>Organization-wide exit statistics and trends</p>
            </div>
          </div>
        </div>
      </div>
      <Card>
        <div className={s.empty}>No analytics data available</div>
      </Card>
    </div>
  )

  const riskPieData = [
    { name: 'Low',      value: data.lowRiskCount      },
    { name: 'Medium',   value: data.mediumRiskCount    },
    { name: 'High',     value: data.highRiskCount      },
    { name: 'Critical', value: data.criticalRiskCount  },
  ].filter(d => d.value > 0)

  const barData = [
    { name: 'Total',     value: data.totalExits,     fill: '#27235C' },
    { name: 'Completed', value: data.completedExits, fill: '#16A34A' },
    { name: 'Pending',   value: data.pendingExits,   fill: '#9D247D' },
  ]

  const statBoxes = [
    { label: 'Total Exits', val: data.totalExits,            color: '#27235C' },
    { label: 'Completed',   val: data.completedExits,        color: '#16A34A' },
    { label: 'In Progress', val: data.pendingExits,          color: '#9D247D' },
    { label: 'Avg. Days',   val: data.averageProcessingDays, color: '#1E3A8A' },
  ]

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
              <h2 className={s.hdrTitle}>Exit Analytics</h2>
              <p className={s.hdrSub}>Organization-wide exit statistics and trends</p>
            </div>
            <div className={s.hdrBtns}>
              <button className={s.exportBtn} onClick={exportCSV}>
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat boxes ── */}
      <div className={s.statsRow}>
        {statBoxes.map(item => (
          <div
            key={item.label}
            className={s.statBox}
            style={{ borderTop: `3px solid ${item.color}` }}
          >
            <div className={s.statVal} style={{ color: item.color }}>{item.val}</div>
            <div className={s.statLabel}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className={s.charts}>
        <Card>
          <h3 className={s.chartTitle}>Exit Status Overview</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className={s.chartTitle}>Risk Distribution</h3>
          {riskPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={100}
                  paddingAngle={3} dataKey="value"
                >
                  {riskPieData.map((_, i) => (
                    <Cell key={i} fill={RISK_COLORS[i % RISK_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className={s.noData}>No risk data available</p>
          )}
        </Card>
      </div>

      {/* ── Summary table ── */}
      <Card>
        <h3 className={s.chartTitle}>Summary Table</h3>
        <table className={s.table}>
          <thead>
            <tr><th>Metric</th><th>Value</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Top Resignation Reason</td>
              <td><strong>{data.topResignationReason || '—'}</strong></td>
            </tr>
            <tr>
              <td>Average Processing Days</td>
              <td><strong>{data.averageProcessingDays} days</strong></td>
            </tr>
            <tr>
              <td>Completion Rate</td>
              <td><strong>
                {data.totalExits
                  ? Math.round((data.completedExits / data.totalExits) * 100) : 0}%
              </strong></td>
            </tr>
            <tr>
              <td>Low Risk Exits</td>
              <td><strong style={{ color: '#16A34A' }}>{data.lowRiskCount}</strong></td>
            </tr>
            <tr>
              <td>Medium Risk Exits</td>
              <td><strong style={{ color: '#D97706' }}>{data.mediumRiskCount}</strong></td>
            </tr>
            <tr>
              <td>High Risk Exits</td>
              <td><strong style={{ color: '#EA580C' }}>{data.highRiskCount}</strong></td>
            </tr>
            <tr>
              <td>Critical Risk Exits</td>
              <td><strong style={{ color: '#DC2626' }}>{data.criticalRiskCount}</strong></td>
            </tr>
          </tbody>
        </table>
      </Card>

    </div>
  )
}
