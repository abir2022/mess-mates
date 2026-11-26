import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { MonetizationProvider } from './components/Monetization'
import { AppLayout } from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthScreen, OnboardingScreen, SplashScreen } from './pages/Auth'
import { LegalPage } from './pages/Legal'
import { LandingPage } from './pages/Landing'

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })))
const MealsBazar = lazy(() => import('./pages/MealsBazar').then((module) => ({ default: module.MealsBazar })))
const Arena = lazy(() => import('./pages/Arena').then((module) => ({ default: module.Arena })))
const Hub = lazy(() => import('./pages/Hub').then((module) => ({ default: module.Hub })))
const Settlement = lazy(() => import('./pages/Settlement').then((module) => ({ default: module.Settlement })))
const Support = lazy(() => import('./pages/Support').then((module) => ({ default: module.Support })))

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
    </div>
  )
}

function Shell() {
  const { ready, user, ws } = useApp()
  const location = useLocation()

  // Legal pages stay readable before signing in, and they are the only routes
  // outside the app shell.
  if (location.pathname === '/privacy' || location.pathname === '/terms') {
    return <LegalPage kind={location.pathname === '/privacy' ? 'privacy' : 'terms'} />
  }

  if (!ready) return <SplashScreen />
  if (!user) {
    // The marketing page is the public home; the sign-in card lives at /signin
    // so a shared link never drops a stranger on a login form.
    return location.pathname === '/signin' ? <AuthScreen /> : <LandingPage />
  }
  if (!ws) return <OnboardingScreen />

  return (
    <AppLayout>
      {/* One broken screen no longer takes the whole shell down: the sidebar,
          bottom bar and toasts stay alive, and navigating away resets it. */}
      <ErrorBoundary compact resetKey={location.pathname}>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/meals" element={<MealsBazar />} />
            <Route path="/arena" element={<Arena />} />
            <Route path="/hub" element={<Hub />} />
            <Route path="/settlement" element={<Settlement />} />
            <Route path="/support" element={<Support />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
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
