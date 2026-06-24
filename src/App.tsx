import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useProject } from './hooks/useProject'
import Landing from './pages/Landing'
import AppShell from './pages/AppShell'

export default function App() {
  const { user } = useAuth()
  const { loadFromCloud } = useProject()
  const [authChecked, setAuthChecked] = useState(false)
  const [appMode, setAppMode] = useState<'landing' | 'app'>(() => {
    return localStorage.getItem('ep_mode') === 'app' ? 'app' : 'landing'
  })

  useEffect(() => {
    // Give Supabase time to restore session
    const timer = setTimeout(() => setAuthChecked(true), 600)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (user) {
      localStorage.setItem('ep_mode', 'app')
      setAppMode('app')
      loadFromCloud()
    }
  }, [user])

  function handleEnterApp() {
    localStorage.setItem('ep_mode', 'app')
    setAppMode('app')
  }

  if (!authChecked) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, letterSpacing: -1 }}>
          Start<span style={{ color: 'var(--accent)' }}>lab</span>
        </div>
        <div style={{ width: 200, height: 3, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: '60%',
            background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
            borderRadius: 99, animation: 'pulse 1s ease infinite'
          }} />
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          appMode === 'app'
            ? <AppShell />
            : <Landing onEnter={handleEnterApp} />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
