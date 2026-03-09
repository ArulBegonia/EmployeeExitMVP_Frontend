import React, {
  createContext, useContext, useState,
  useEffect, useRef, useCallback
} from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1]
      .replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64).split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    )
    return JSON.parse(json)
  } catch (e) {
    console.error('[Auth] JWT parse error:', e)
    return null
  }
}

function getRoleFromPayload(payload) {
  return (
    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
    payload.role ||
    payload.Role ||
    null
  )
}

export const TOKEN_KEY = 'em_token'

const ROUTES = {
  EMPLOYEE: '/employee',
  MANAGER:  '/manager',
  HR:       '/hr',
  IT:       '/it',
  ADMIN:    '/admin',
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate              = useNavigate()
  const timerRef              = useRef(null)

  const scheduleExpiry = useCallback((exp) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const ms = exp * 1000 - Date.now() - 5000
    if (ms > 0) {
      timerRef.current = setTimeout(() => {
        localStorage.removeItem(TOKEN_KEY)
        setUser(null)
        toast.error('Session expired. Please log in again.')
        navigate('/login', { replace: true })
      }, ms)
    }
  }, [navigate])

  // Restore session on refresh
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      const payload = parseJwt(token)
      if (payload && payload.exp * 1000 > Date.now()) {
        const role         = getRoleFromPayload(payload)
        const empId        = payload.empId        || payload.sub || payload.nameid
        // ── NEW: read employeeCode and email from JWT claims ──
        const employeeCode = payload.employeeCode || empId
        const email        = payload.email        || ''
        if (role) {
          setUser({ token, empId, employeeCode, email, role })
          scheduleExpiry(payload.exp)
        } else {
          localStorage.removeItem(TOKEN_KEY)
        }
      } else {
        localStorage.removeItem(TOKEN_KEY)
      }
    }
    setLoading(false)
  }, [scheduleExpiry])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const login = async (email, password) => {
    console.log('[Auth] Attempting login for:', email)
    const res = await axios.post(
      '/api/Auth/login',
      { email, password },
      { headers: { 'Content-Type': 'application/json' } }
    )
    const token = res.data?.token || res.data?.Token || res.data?.data?.token
    if (!token) throw new Error('Server did not return a token.')

    localStorage.setItem(TOKEN_KEY, token)

    const payload = parseJwt(token)
    const role    = getRoleFromPayload(payload)
    const empId   = payload?.empId        || payload?.sub || payload?.nameid
    // ── NEW: read employeeCode and email from JWT claims ──
    const employeeCode = payload?.employeeCode || empId
    const userEmail    = payload?.email        || ''

    if (!role) throw new Error('Could not determine user role from token.')

    const userData = { token, empId, employeeCode, email: userEmail, role }
    setUser(userData)
    scheduleExpiry(payload.exp)

    const destination = ROUTES[role.toUpperCase()]
    if (!destination) throw new Error(`Unknown role: "${role}"`)

    toast.success('Welcome back!')
    navigate(destination, { replace: true })
    return userData
  }

  const logout = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    navigate('/login', { replace: true })
    toast.success('Logged out successfully')
  }, [navigate])

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
