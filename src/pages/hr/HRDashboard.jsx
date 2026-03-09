import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '../../components/common/Layout.jsx'
import { LayoutDashboard, List, FileText, BarChart2, DollarSign, UserCheck } from 'lucide-react'
import HRHome         from './HRHome.jsx'
import HRExitRequests from './HRExitRequests.jsx'
import HRDocuments    from './HRDocuments.jsx'
import HRAnalytics    from './HRAnalytics.jsx'
import HRSettlement   from './HRSettlement.jsx'
import HRRehire       from './HRRehire.jsx'

const navItems = [
  { path: '/hr',               label: 'Dashboard',         icon: <LayoutDashboard size={16} />, exact: true },
  { path: '/hr/exit-requests', label: 'All Exit Requests',  icon: <List size={16} /> },
  { path: '/hr/documents',     label: 'Documents',          icon: <FileText size={16} /> },
  { path: '/hr/settlement',    label: 'Settlement',         icon: <DollarSign size={16} /> },
  { path: '/hr/rehire',        label: 'Rehire Eligibility', icon: <UserCheck size={16} /> },
  { path: '/hr/analytics',     label: 'Analytics',          icon: <BarChart2 size={16} /> },
]

export default function HRDashboard() {
  return (
    <Layout navItems={navItems} title="HR Portal">
      <Routes>
        <Route index               element={<HRHome />} />
        <Route path="exit-requests" element={<HRExitRequests />} />
        <Route path="documents"    element={<HRDocuments />} />
        <Route path="settlement"   element={<HRSettlement />} />
        <Route path="rehire"       element={<HRRehire />} />
        <Route path="analytics"    element={<HRAnalytics />} />
        <Route path="*"            element={<Navigate to="/hr" replace />} />
      </Routes>
    </Layout>
  )
}
