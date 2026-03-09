import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import LoginPage         from './pages/LoginPage.jsx'
import EmployeeDashboard from './pages/employee/EmployeeDashboard.jsx'
import ManagerDashboard  from './pages/manager/ManagerDashboard.jsx'
import HRDashboard       from './pages/hr/HRDashboard.jsx'
import ITDashboard       from './pages/it/ITDashboard.jsx'
import AdminDashboard    from './pages/admin/AdminDashboard.jsx'
import NotFoundPage      from './pages/NotFoundPage.jsx'

const ROLE_HOME = {
  EMPLOYEE: '/employee',
  MANAGER:  '/manager',
  HR:       '/hr',
  IT:       '/it',
  ADMIN:    '/admin',
}

// Blocks back-button navigation
function SessionGuard({ children, roles }) {
  const { user } = useAuth()
  const location = useLocation()

  useEffect(() => {
    window.history.pushState(null, '', window.location.href)
    const handler = () => window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [location.pathname])

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (roles && !roles.includes(user.role))
    return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />
  return children
}

// Prevents logged-in users from going back to /login
function PublicOnly({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicOnly><LoginPage /></PublicOnly>
      }/>

      <Route path="/employee/*" element={
        <SessionGuard roles={['EMPLOYEE']}>
          <NotificationProvider><EmployeeDashboard /></NotificationProvider>
        </SessionGuard>
      }/>

      <Route path="/manager/*" element={
        <SessionGuard roles={['MANAGER']}>
          <NotificationProvider><ManagerDashboard /></NotificationProvider>
        </SessionGuard>
      }/>

      <Route path="/hr/*" element={
        <SessionGuard roles={['HR']}>
          <NotificationProvider><HRDashboard /></NotificationProvider>
        </SessionGuard>
      }/>

      <Route path="/it/*" element={
        <SessionGuard roles={['IT']}>
          <NotificationProvider><ITDashboard /></NotificationProvider>
        </SessionGuard>
      }/>

      <Route path="/admin/*" element={
        <SessionGuard roles={['ADMIN']}>
          <NotificationProvider><AdminDashboard /></NotificationProvider>
        </SessionGuard>
      }/>

      <Route path="/"  element={<Navigate to="/login" replace />} />
      <Route path="*"  element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition:   true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily:   'Inter, sans-serif',
              fontSize:     '14px',
              borderRadius: '10px',
            },
            success: { iconTheme: { primary: '#16A34A', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#DC2626', secondary: '#fff' } },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
