import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react'
import { useStore } from '../store/useStore'
import { useAuth } from '../hooks/useAuth'
import { useProject } from '../hooks/useProject'
import { calcCompleteness } from '../lib/calculos'
import { ToastContainer, toast } from '../components/ui'
import { exportarPDF } from '../lib/pdfExport'

// Pages — lazy loaded for better initial bundle performance
const PageInstitucional = lazy(() => import('./PageInstitucional'))
const PageEstrategica = lazy(() => import('./PageEstrategica'))
const PageMarketing = lazy(() => import('./PageMarketing'))
const PageProduccion = lazy(() => import('./PageProduccion'))
const PageFinanciera = lazy(() => import('./PageFinanciera'))
const PageLegal = lazy(() => import('./PageLegal'))
const PageDashboard = lazy(() => import('./PageDashboard'))
const PageReporte = lazy(() => import('./PageReporte'))
const PageAdminClases = lazy(() => import('./PageAdminClases'))
const PageAdminSeguimiento = lazy(() => import('./PageAdminSeguimiento'))
const PageEstudianteClases = lazy(() => import('./PageEstudianteClases'))
import { NotificationCenter } from '../components/NotificationCenter'

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--text3)', fontSize: '0.85rem' }}>
    Cargando...
  </div>
)

const NAV_ITEMS_ALL = [
  { id: 'mis-clases', label: 'Mis Clases', icon: '🏫', section: 'gestiones', roles: ['estudiante'] },
  { id: 'institucional', label: 'Datos Institucionales', icon: '🏠', section: 'proyecto', roles: ['estudiante', 'profesor'] },
  { id: 'estrategica', label: 'Estratégica', icon: '🎯', section: 'gestiones', roles: ['estudiante', 'profesor'] },
  { id: 'marketing', label: 'Marketing', icon: '📢', section: 'gestiones', roles: ['estudiante', 'profesor'] },
  { id: 'produccion', label: 'Producción', icon: '🏭', section: 'gestiones', roles: ['estudiante', 'profesor'] },
  { id: 'financiera', label: 'Económica-Financiera', icon: '📊', section: 'gestiones', roles: ['estudiante', 'profesor'] },
  { id: 'legal', label: 'Legal e Impositiva', icon: '⚖️', section: 'gestiones', roles: ['estudiante', 'profesor'] },
  { id: 'dashboard', label: 'Dashboard', icon: '📈', section: 'reportes', roles: ['estudiante', 'profesor'] },
  { id: 'reporte', label: 'Reporte Final', icon: '📄', section: 'reportes', roles: ['estudiante', 'profesor'] },
  { id: 'admin-clases', label: 'Mis Clases', icon: '🏫', section: 'admin', roles: ['profesor'] },
  { id: 'admin-seguimiento', label: 'Seguimiento Alumnos', icon: '👥', section: 'admin', roles: ['profesor'] },
]

const PAGE_META: Record<string, { title: string; sub: string }> = {
  institucional: { title: 'Datos Institucionales', sub: 'Completá los datos de tu escuela y proyecto' },
  estrategica: { title: 'Gestión Estratégica', sub: 'Misión, Visión, Objetivos y Análisis FODA' },
  marketing: { title: 'Gestión de Marketing', sub: 'Segmentación, competidores y marketing mix' },
  produccion: { title: 'Gestión de Producción', sub: 'Viabilidad técnica, equipamiento e inversión' },
  financiera: { title: 'Gestión Económica-Financiera', sub: 'Presupuestos, punto de equilibrio y resultados' },
  legal: { title: 'Gestión Legal e Impositiva', sub: 'Trámites y gestiones para operar legalmente' },
  dashboard: { title: 'Dashboard Dinámico', sub: 'Vista general de tu plan de negocios' },
  reporte: { title: 'Reporte Final', sub: 'Exportá tu plan de negocios completo' },
  'admin-clases': { title: 'Panel del Docente', sub: 'Administrá tus clases y códigos de acceso' },
  'admin-seguimiento': { title: 'Seguimiento de Proyectos', sub: 'Monitoreá el avance en tiempo real de tus alumnos' },
  'mis-clases': { title: 'Mis Clases', sub: 'Inscribite a una clase o gestioná tus proyectos' },
}

export default function AppShell() {
  const { activePage, setActivePage, isSidebarOpen, setSidebarOpen, form, estado, proyectoId, proyectoContexto, setProyectoId, setProyectoContexto, isDirty } = useStore()
  const { user, perfil, signOut } = useAuth()
  const { saveToCloud } = useProject()
  const [saving, setSaving] = useState(false)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save con debounce: guarda 3 segundos después del último cambio
  useEffect(() => {
    if (!user || !isDirty) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      saveToCloud()
    }, 3000)
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [form, estado, user, isDirty])

  const comp = calcCompleteness(form, estado.secciones_aprobadas || [])

  const isProfesor = perfil?.rol === 'profesor'
  const navItems = NAV_ITEMS_ALL.filter(i => i.roles.includes(perfil?.rol || 'estudiante'))

  // Filtrar ítems de edición si el alumno no eligió clase aún
  const filteredNavItems = navItems.filter(item => {
    // Si el alumno no eligió clase, solo ve "Mis Clases"
    if (!isProfesor && item.id !== 'mis-clases' && !useStore.getState().claseId) return false
    return true
  })

  // Redirección si es alumno y no está en modo vista
  useEffect(() => {
    if (!isProfesor && activePage === 'admin-clases') {
      setActivePage('mis-clases')
    }
    // Si el alumno no tiene clase seleccionada, forzar a mis-clases
    if (!isProfesor && !useStore.getState().claseId && activePage !== 'mis-clases') {
      setActivePage('mis-clases')
    }
  }, [activePage, isProfesor, setActivePage])

  const badgeColor = (pct: number) => {
    if (pct === 100) return 'var(--success)'
    if (pct > 0) return 'var(--warn)'
    return 'var(--border)'
  }

  const handleSave = useCallback(async () => {
    setSaving(true)
    const ok = await saveToCloud()
    toast(ok ? '✅ Guardado en la nube.' : '💾 Guardado localmente.', ok ? 'success' : 'warn')
    setSaving(false)
  }, [saveToCloud])

  const handleExport = () => {
    exportarPDF(form, estado)
    toast('📄 PDF generado correctamente.', 'success')
  }

  // El docente ve sus herramientas de admin, y si está viendo un proyecto, también las del alumno
  const sections = isProfesor 
    ? (proyectoId ? ['admin', 'proyecto', 'gestiones', 'reportes'] : ['admin'])
    : ['proyecto', 'gestiones', 'reportes']

  const sectionLabels: Record<string, string> = {
    proyecto: 'Datos del Proyecto',
    gestiones: 'Gestiones',
    reportes: 'Reportes',
    admin: 'Administración',
  }

  const PageComponent = (({
    institucional: PageInstitucional,
    estrategica: PageEstrategica,
    marketing: PageMarketing,
    produccion: PageProduccion,
    financiera: PageFinanciera,
    legal: PageLegal,
    dashboard: PageDashboard,
    reporte: PageReporte,
    'admin-clases': PageAdminClases,
    'admin-seguimiento': PageAdminSeguimiento,
    'mis-clases': PageEstudianteClases
  } as Record<string, any>)[activePage]) 
  ?? (isProfesor ? PageAdminClases : PageEstudianteClases)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <ToastContainer />

      {/* OVERLAY mobile */}
      {isSidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR */}
      <nav style={{
        width: 260, minWidth: 260, background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, height: '100vh',
        zIndex: 100, overflowY: 'auto',
        transform: isSidebarOpen ? 'translateX(0)' : undefined,
        transition: 'transform 0.3s ease',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.5px', borderBottom: '1px solid var(--border)' }}>
          Emprende<span style={{ color: 'var(--accent)' }}>Plan</span>
        </div>

        {/* Nav */}
        <div style={{ padding: '12px 0', flex: 1 }}>
          {sections.map(sec => (
            <div key={sec}>
              <div style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text3)', padding: '12px 20px 4px' }}>
                {sectionLabels[sec]}
              </div>
              {filteredNavItems.filter(n => n.section === sec).map(item => {
                const pct = (!isProfesor || proyectoId) ? (comp[item.id as keyof typeof comp] as number | undefined) : undefined
                const isActive = activePage === item.id
                return (
                  <div key={item.id}
                    onClick={() => { 
                      if (item.id.startsWith('admin-')) {
                        setProyectoId(null);
                        setProyectoContexto(null);
                      }
                      setActivePage(item.id); 
                      setSidebarOpen(false);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '11px 20px', cursor: 'pointer',
                      borderLeft: `3px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                      background: isActive ? 'rgba(124,106,247,0.12)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--text2)',
                      fontSize: '0.875rem', transition: 'all 0.18s',
                    }}>
                    <span style={{ width: 18, textAlign: 'center' }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {pct !== undefined && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: badgeColor(pct), flexShrink: 0 }} />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Progress (Estudiantes o Docente en modo vista) */}
        {(!isProfesor || proyectoId) && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text2)', marginBottom: 6 }}>
              <span>Completitud del Plan</span><span>{comp.overall}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${comp.overall}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent3))', borderRadius: 99, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        )}

        {/* Logout (OLD) - Removed for cleaner UI */}
        
        {/* Author */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'rgba(124,106,247,0.04)' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 4 }}>Desarrollado por</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Juan Manuel Gómez</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text3)', lineHeight: 1.5 }}>
            Prof. en Ciencias Económicas<br />
            Lic. en Educación · Experto en Tecnología Educativa
          </div>
          <div style={{ marginTop: 6, fontSize: '0.58rem', color: 'var(--text3)', borderTop: '1px solid var(--border)', paddingTop: 5 }}>
            React · TypeScript · Vite · Supabase · jsPDF
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <div style={{ marginLeft: 260, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* TOPBAR */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(15,15,19,0.9)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          padding: '12px 32px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <button onClick={() => setSidebarOpen(!isSidebarOpen)}
            style={{ display: 'none', background: 'none', border: 'none', color: 'var(--text)', fontSize: '1.3rem', cursor: 'pointer', padding: 4 }}
            className="menu-toggle">☰</button>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem' }}>
                {PAGE_META[activePage]?.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>{PAGE_META[activePage]?.sub}</div>
            </div>

            {/* Banner de Supervisión para Docentes */}
            {isProfesor && proyectoContexto && (
              <div style={{ 
                margin: '0 20px', padding: '6px 16px', borderRadius: 10, 
                background: 'rgba(124,106,247,0.15)', border: '1px solid var(--accent)',
                display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 450
              }}>
                <span style={{ fontSize: '1.2rem' }}>👁️‍🗨️</span>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Supervisando a:
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {proyectoContexto.alumno} <span style={{ color: 'var(--text3)', fontWeight: 400, margin: '0 4px' }}>—</span> {proyectoContexto.emprendimiento}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botón Volver para Docente (si está en página de proyecto) */}
          {isProfesor && !activePage.startsWith('admin-') && (
            <button onClick={() => { setProyectoId(null); setProyectoContexto(null); setActivePage('admin-seguimiento') }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--accent)', background: 'rgba(124,106,247,0.1)', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              ⬅ Volver al Seguimiento
            </button>
          )}

          {/* User chip or local chip */}
          <NotificationCenter />
          
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(124,106,247,0.1)', border: '1px solid rgba(124,106,247,0.25)', borderRadius: 99, padding: '4px 12px 4px 6px' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: perfil?.rol === 'profesor' ? 'var(--accent2)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>
                {(perfil?.nombre_completo || user.email).charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {perfil?.nombre_completo?.split(' ')[0] || user.email.split('@')[0]}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {perfil?.rol === 'profesor' ? 'Docente' : 'Alumno'}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 99, padding: '4px 10px', fontSize: '0.72rem', color: 'var(--warn)', fontWeight: 600 }}>
              💾 Solo local
            </div>
          )}

          {/* Botón Salir - Siempre visible para poder volver al inicio */}
          <button onClick={() => {
              if (user) { signOut(); }
              else { localStorage.removeItem('ep_mode'); window.location.reload(); }
            }}
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', 
              borderRadius: 8, border: '1px solid rgba(240,68,68,0.2)', 
              background: 'rgba(240,68,68,0.05)', color: '#f04444', fontSize: '0.82rem', 
              fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
              marginLeft: 'auto'
            }}>
            ↪ Salir
          </button>

          {/* Acciones de proyecto (solo estudiantes) */}
          {!isProfesor && (
            <>
              <button onClick={handleSave} disabled={saving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                {saving ? '⏳' : '💾'} Guardar
              </button>

              <button onClick={() => setActivePage('dashboard')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                📈 Dashboard
              </button>

              <button onClick={handleExport}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(74,222,128,0.2)', background: 'rgba(74,222,128,0.1)', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                📄 PDF
              </button>
            </>
          )}

        </div>

        {/* PAGE CONTENT */}
        <div style={{ padding: '32px', maxWidth: 1100, width: '100%' }}>
          <Suspense fallback={<PageLoader />}>
            <PageComponent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
