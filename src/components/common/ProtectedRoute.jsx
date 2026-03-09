import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

const ALLOWED_ROLES = {
  '/employee': ['EMPLOYEE', 'Employee'],
  '/manager':  ['MANAGER', 'Manager', 'L1Manager', 'L2Manager', 'l1manager', 'l2manager', 'L1 Manager', 'L2 Manager'],
  '/hr':       ['HR', 'Hr'],
  '/it':       ['IT', 'It'],
  '/admin':    ['ADMIN', 'Admin'],
}

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && allowedRoles.length > 0) {
    const hasAccess = allowedRoles.some(r =>
      r.toUpperCase() === (user.role || '').toUpperCase()
    )
    if (!hasAccess) return <Navigate to="/login" replace />
  }

  return children
}
