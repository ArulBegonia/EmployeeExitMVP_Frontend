import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '../../components/common/Layout.jsx'
import { LayoutDashboard, FileText, Bell, ClipboardList } from 'lucide-react'
import EmployeeHome from './EmployeeHome.jsx'
import ResignationForm from './ResignationForm.jsx'
import ExitStatus from './ExitStatus.jsx'

const navItems = [
  { path: '/employee', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { path: '/employee/resign', label: 'Submit Resignation', icon: <FileText size={18} /> },
  { path: '/employee/status', label: 'My Exit Status', icon: <ClipboardList size={18} /> },
]

export default function EmployeeDashboard() {
  return (
    <Layout navItems={navItems} title="Employee Portal">
      <Routes>
        <Route index element={<EmployeeHome />} />
        <Route path="resign" element={<ResignationForm />} />
        <Route path="status" element={<ExitStatus />} />
        <Route path="*" element={<Navigate to="/employee" replace />} />
      </Routes>
    </Layout>
  )
}
