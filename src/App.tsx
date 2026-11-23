import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { MonetizationProvider } from './components/Monetization'
import { AppLayout } from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthScreen, OnboardingScreen, SplashScreen } from './pages/Auth'

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })))
const MealsBazar = lazy(() => import('./pages/MealsBazar').then((module) => ({ default: module.MealsBazar })))
const Arena = lazy(() => import('./pages/Arena').then((module) => ({ default: module.Arena })))
const Hub = lazy(() => import('./pages/Hub').then((module) => ({ default: module.Hub })))
const Settlement = lazy(() => import('./pages/Settlement').then((module) => ({ default: module.Settlement })))

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
    </div>
  )
}

function Shell() {
  const { ready, user, ws } = useApp()

  if (!ready) return <SplashScreen />
  if (!user) return <AuthScreen />
  if (!ws) return <OnboardingScreen />

  return (
    <AppLayout>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/meals" element={<MealsBazar />} />
          <Route path="/arena" element={<Arena />} />
          <Route path="/hub" element={<Hub />} />
          <Route path="/settlement" element={<Settlement />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppLayout>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MonetizationProvider>
          <Shell />
        </MonetizationProvider>
      </AppProvider>
    </ErrorBoundary>
  )
}
