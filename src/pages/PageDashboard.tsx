import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { useStore } from '../store/useStore'
import { calcFinanciero, calcCompleteness, calcTotalGastosFijos, fmt } from '../lib/calculos'
import { KpiCard } from '../components/ui'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const SECCIONES = [
  { id: 'institucional', icon: '🏫', label: 'Datos Institucionales' },
  { id: 'estrategica', icon: '🎯', label: 'Gestión Estratégica' },
  { id: 'marketing', icon: '📣', label: 'Gestión de Marketing' },
  { id: 'produccion', icon: '🏭', label: 'Gestión de Producción' },
  { id: 'financiera', icon: '📊', label: 'Gestión Financiera' },
  { id: 'legal', icon: '⚖️', label: 'Gestión Legal' },
]

export default function PageDashboard() {
  const { form, estado, perfil } = useStore()
  const comp = useMemo(() => calcCompleteness(form), [form])
  const calc = useMemo(() => calcFinanciero(form, estado), [form, estado])
  const costosFijos = useMemo(() => calcTotalGastosFijos(estado.gastosFijos), [estado.gastosFijos])

  const labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4']
  const ingresos = calc.semanas.map(s => s.ingresos)
  const costos = calc.semanas.map(s => s.costoVariable + s.costoFijoProporcionado)

  const allTramites = ['cuit','mono','afip','banco','marca','ing_brutos','rentas','habilitacion_prov','hab_mun','libre_deuda','bromatologia','patente']
  const tramitesDone = allTramites.filter(t => estado.tramitesDone[t]).length

  function statusColor(pct: number) {
    if (pct === 100) return 'var(--success)'
    if (pct > 0) return 'var(--warn)'
    return 'var(--text3)'
  }

  const cardStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.5px' }}>📈 Dashboard del Proyecto</h1>
        <p style={{ color: 'var(--text2)', marginTop: 4, fontSize: '0.9rem' }}>Vista general y dinámica de todos los bloques del plan de negocios.</p>
      </div>

      {/* PANEL DE CALIFICACIÓN (Si existe) */}
      {(perfil?.nota || perfil?.feedback_docente || form.i_nombre_emp) && (
        <div style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)', borderRadius: 16, padding: '24px 32px', marginBottom: 28, color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, fontSize: '8rem', opacity: 0.1 }}>📝</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', margin: 0 }}>Estado de tu Proyecto</h2>
              {perfil?.nota && (
                <div style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', padding: '8px 16px', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', opacity: 0.9 }}>Nota Final</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{perfil.nota}</div>
                </div>
              )}
            </div>
            
            {perfil?.feedback_docente ? (
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12, fontSize: '0.9rem', lineHeight: 1.6, borderLeft: '4px solid rgba(255,255,255,0.5)' }}>
                <b>💬 Feedback del Docente:</b><br/>
                {perfil.feedback_docente}
              </div>
            ) : (
              <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95rem' }}>
                ¡Buen trabajo! Seguí completando las secciones para que tu docente pueda evaluar el plan final.
              </p>
            )}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <KpiCard value={`${comp.overall}%`} label="Completitud del Plan" color="var(--accent)" />
        <KpiCard value={`$${fmt(calc.totalIngresos)}`} label="Ventas 4 Semanas" color="var(--success)" />
        <KpiCard value={`${calc.totalResultado >= 0 ? '+' : ''}$${fmt(calc.totalResultado)}`} label="Resultado Estimado" color={calc.totalResultado >= 0 ? 'var(--success)' : 'var(--error)'} />
        <KpiCard value={`${calc.puntoEquilibrioUnidades} u.`} label="Punto de Equilibrio" color="var(--accent3)" />
      </div>

      {/* CHARTS */}
      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', marginBottom: 16, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          📊 Ingresos vs Costos — 4 Semanas
        </div>
        <Bar data={{
          labels,
          datasets: [
            { label: 'Ingresos', data: ingresos, backgroundColor: 'rgba(124,106,247,0.7)', borderRadius: 6 },
            { label: 'Costos Totales', data: costos, backgroundColor: 'rgba(247,106,138,0.6)', borderRadius: 6 },
          ],
        }} options={{
          responsive: true,
          plugins: { legend: { labels: { color: '#9090b0' } } },
          scales: {
            x: { ticks: { color: '#9090b0' }, grid: { color: 'rgba(42,42,56,0.8)' } },
            y: { ticks: { color: '#9090b0', callback: (v) => '$' + fmt(Number(v)) }, grid: { color: 'rgba(42,42,56,0.8)' } },
          },
        }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Datos proyecto */}
        <div style={cardStyle}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', marginBottom: 16, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🏫 Datos del Proyecto</div>
          {[
            { l: 'Emprendimiento', v: form.i_nombre_emp || '-' },
            { l: 'Escuela', v: form.i_escuela || '-' },
            { l: 'Curso', v: form.i_curso || '-' },
            { l: 'Docente', v: form.i_docente || '-' },
            { l: 'Ciclo Lectivo', v: form.i_ciclo || '-' },
            { l: 'Integrantes', v: String(estado.members.length) },
          ].map(item => (
            <div key={item.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text2)' }}>{item.l}</span>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{item.v}</span>
            </div>
          ))}
        </div>

        {/* Completitud */}
        <div style={cardStyle}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', marginBottom: 16, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>✅ Estado de Completitud</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SECCIONES.map(s => {
              const pct = comp[s.id as keyof typeof comp] as number
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 8, fontSize: '0.82rem' }}>
                  <span>{s.icon}</span>
                  <span style={{ flex: 1, color: pct === 100 ? 'var(--text)' : 'var(--text2)' }}>{s.label}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: statusColor(pct) }}>{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Financiero */}
        <div style={cardStyle}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', marginBottom: 16, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>💰 Resumen Financiero</div>
          {[
            { l: 'Ventas est. (4 sem.)', v: '$' + fmt(calc.totalIngresos), c: 'var(--success)' },
            { l: 'Costos Variables', v: '-$' + fmt(calc.totalCostoVariable), c: 'var(--error)' },
            { l: 'Costos Fijos Mensual', v: '-$' + fmt(costosFijos), c: 'var(--accent4)' },
            { l: 'Resultado Estimado', v: (calc.totalResultado >= 0 ? '+' : '') + '$' + fmt(calc.totalResultado), c: calc.totalResultado >= 0 ? 'var(--success)' : 'var(--error)' },
            { l: 'Inv. Inicial', v: '$' + fmt(parseFloat(form.p_inv_total) || 0), c: 'var(--accent2)' },
            { l: 'Margen Contribución', v: calc.margenContribucion.toFixed(1) + '%', c: 'var(--accent3)' },
          ].map(item => (
            <div key={item.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text2)' }}>{item.l}</span>
              <span style={{ fontWeight: 700, color: item.c }}>{item.v}</span>
            </div>
          ))}
        </div>

        {/* Legal */}
        <div style={cardStyle}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', marginBottom: 16, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⚖️ Estado Legal</div>
          {[
            { l: 'Forma Jurídica', v: form.l_forma || 'No definida' },
            { l: 'Régimen Impositivo', v: form.l_impositivo || 'No definido' },
            { l: 'Trámites completados', v: `${tramitesDone} / ${allTramites.length}` },
          ].map(item => (
            <div key={item.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text2)' }}>{item.l}</span>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{item.v}</span>
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text2)', marginBottom: 6 }}>
              <span>Progreso legal</span><span>{Math.round(tramitesDone / allTramites.length * 100)}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(tramitesDone / allTramites.length) * 100}%`, background: 'var(--accent3)', borderRadius: 99, transition: 'width 0.4s' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
