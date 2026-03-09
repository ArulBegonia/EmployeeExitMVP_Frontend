import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '../../components/common/Layout.jsx'
import { LayoutDashboard, ClipboardCheck, GitBranch, FileText, Clock } from 'lucide-react'
import ManagerHome      from './ManagerHome.jsx'
import ManagerApprovals from './ManagerApprovals.jsx'
import KnowledgeTransfer from './KnowledgeTransfer.jsx'
import ManagerResign    from './ManagerResign.jsx'
import ManagerMyStatus  from './ManagerMyStatus.jsx'

const navItems = [
  { path:'/manager',             label:'Dashboard',          icon:<LayoutDashboard size={16}/>, exact:true },
  { path:'/manager/approvals',   label:'Pending Approvals',  icon:<ClipboardCheck size={16}/> },
  { path:'/manager/kt',          label:'Knowledge Transfer', icon:<GitBranch size={16}/> },
  { path:'/manager/resign',      label:'My Resignation',     icon:<FileText size={16}/> },
  { path:'/manager/my-status',   label:'My Exit Status',     icon:<Clock size={16}/> },
]
export default function ManagerDashboard() {
  return (
    <Layout navItems={navItems} title="Manager Portal">
      <Routes>
        <Route index            element={<ManagerHome/>} />
        <Route path="approvals" element={<ManagerApprovals/>} />
        <Route path="kt"        element={<KnowledgeTransfer/>} />
        <Route path="resign"    element={<ManagerResign/>} />
        <Route path="my-status" element={<ManagerMyStatus/>} />
        <Route path="*"         element={<Navigate to="/manager" replace/>} />
      </Routes>
    </Layout>
  )
}
