import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '../../components/common/Layout.jsx'
import { LayoutDashboard, Shield, BarChart3, Banknote } from 'lucide-react'
import AdminHome from './AdminHome.jsx'
import AdminClearance from './AdminClearance.jsx'
import AdminAnalytics from './AdminAnalytics.jsx'
import AdminSettlement from './AdminSettlement.jsx'

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { path: '/admin/clearance', label: 'Admin Clearance', icon: <Shield size={18} /> },
  { path: '/admin/settlement', label: 'Settlement', icon: <Banknote size={18} /> },
  { path: '/admin/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
]

export default function AdminDashboard() {
  return (
    <Layout navItems={navItems} title="Admin Portal">
      <Routes>
        <Route index element={<AdminHome />} />
        <Route path="clearance" element={<AdminClearance />} />
        <Route path="settlement" element={<AdminSettlement />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Layout>
  )
}
