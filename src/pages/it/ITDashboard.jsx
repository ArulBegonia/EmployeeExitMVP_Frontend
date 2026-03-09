import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '../../components/common/Layout.jsx'
import { LayoutDashboard, Shield } from 'lucide-react'
import ITHome from './ITHome.jsx'
import ITClearance from './ITClearance.jsx'

const navItems = [
  { path: '/it', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { path: '/it/clearance', label: 'Clearance', icon: <Shield size={18} /> },
]

export default function ITDashboard() {
  return (
    <Layout navItems={navItems} title="IT Portal">
      <Routes>
        <Route index element={<ITHome />} />
        <Route path="clearance" element={<ITClearance />} />
        <Route path="*" element={<Navigate to="/it" replace />} />
      </Routes>
    </Layout>
  )
}
