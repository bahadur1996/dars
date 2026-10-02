import { Box, CircularProgress } from '@mui/material'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { AuditPage } from './pages/AuditPage'
import { DashboardPage } from './pages/DashboardPage'
import { DriverDetailPage } from './pages/DriverDetailPage'
import { DriverFormPage } from './pages/DriverFormPage'
import { DriversPage } from './pages/DriversPage'
import { LoginPage } from './pages/LoginPage'
import { OwnersPage } from './pages/OwnersPage'
import { RickshawDetailPage } from './pages/RickshawDetailPage'
import { RickshawsPage } from './pages/RickshawsPage'
import { RickshawWizardPage } from './pages/RickshawWizardPage'
import { UsersPage } from './pages/UsersPage'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, restoring } = useAuth()
  const location = useLocation()
  if (restoring) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress aria-label="Loading" />
      </Box>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return children
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user?.role === 'ADMIN' ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="rickshaws" element={<RickshawsPage />} />
        <Route path="rickshaws/new" element={<RickshawWizardPage />} />
        <Route path="rickshaws/:id" element={<RickshawDetailPage />} />
        <Route path="rickshaws/:id/edit" element={<RickshawWizardPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="drivers/new" element={<DriverFormPage />} />
        <Route path="drivers/:id" element={<DriverDetailPage />} />
        <Route path="drivers/:id/edit" element={<DriverFormPage />} />
        <Route path="owners" element={<OwnersPage />} />
        <Route path="users" element={<RequireAdmin><UsersPage /></RequireAdmin>} />
        <Route path="audit" element={<RequireAdmin><AuditPage /></RequireAdmin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
