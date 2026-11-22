import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { MonetizationProvider } from './components/Monetization'
import { AppLayout } from './components/Layout'
import { AuthScreen, OnboardingScreen, SplashScreen } from './pages/Auth'
import { Dashboard } from './pages/Dashboard'
import { MealsBazar } from './pages/MealsBazar'
import { Arena } from './pages/Arena'
import { Hub } from './pages/Hub'
import { Settlement } from './pages/Settlement'

function Shell() {
  const { ready, user, ws } = useApp()

  if (!ready) return <SplashScreen />
  if (!user) return <AuthScreen />
  if (!ws) return <OnboardingScreen />

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/meals" element={<MealsBazar />} />
        <Route path="/arena" element={<Arena />} />
        <Route path="/hub" element={<Hub />} />
        <Route path="/settlement" element={<Settlement />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  return (
    <AppProvider>
      <MonetizationProvider>
        <Shell />
      </MonetizationProvider>
    </AppProvider>
  )
}
