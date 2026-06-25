import { useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { useStore } from '../store/useStore'
import { calcFinanciero, calcTotalGastosFijos, calcTotalMateriaPrima, calcTotalMOD, fmt, n, round2, calcCompleteness } from '../lib/calculos'
import { FeedbackPanel } from '../components/FeedbackPanel'
import { IconBtn } from '../components/ui'
import type { GastoFijo, ManoObra, LineaPresupuesto } from '../types'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler)

const CHART_OPTS = {
  responsive: true,
  plugins: { legend: { labels: { color: '#9090b0', font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: '#9090b0' }, grid: { color: 'rgba(100,100,120,0.15)' } },
    y: { ticks: { color: '#9090b0', callback: (v: number | string) => '$' + fmt(Number(v)) }, grid: { color: 'rgba(100,100,120,0.15)' } },
  },
}

// ── InfoBox: collapsible explanatory help ─────────────────────────
function InfoBox({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: 14 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: 'rgba(124,106,247,0.08)', border: '1px solid rgba(124,106,247,0.2)',
          borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
          fontSize: '0.8rem', color: '#7c6af7', fontWeight: 600,
        }}
      >
        💡 {titulo} {open ? '▲' : '▼'}
      </button>
      {open && (
        <div style={{
          marginTop: 8, background: 'rgba(124,106,247,0.05)',
          border: '1px solid rgba(124,106,247,0.15)', borderRadius: 10,
          padding: '14px 16px', fontSize: '0.84rem', color: 'var(--text2)', lineHeight: 1.65,
        }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── Step header ───────────────────────────────────────────────────
function StepHeader({ num, title, subtitle }: { num: number; title: string; subtitle: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
      <div style={{
        minWidth: 36, height: 36, borderRadius: '50%',
        background: 'rgba(124,106,247,0.15)', border: '2px solid rgba(124,106,247,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: '0.9rem', color: '#7c6af7', flexShrink: 0,
      }}>
        {num}
      </div>
      <div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>{title}</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--text3)', margin: '2px 0 0' }}>{subtitle}</p>
      </div>
    </div>
  )
}

// ── Card wrapper ──────────────────────────────────────────────────
function Bloque({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: '1.25rem 1.5rem', marginBottom: 20, ...style }}>
      {children}
    </div>
  )
}

// ── Sub-section inside a bloque ───────────────────────────────────
function SubBloque({ icon, title, subtitle, children }: { icon: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>{title}</span>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text3)', margin: '0 0 12px' }}>{subtitle}</p>
      {children}
    </div>
  )
}

// ── Minimal table helpers ─────────────────────────────────────────
const th: React.CSSProperties = { background: 'var(--bg3)', padding: '9px 12px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text2)', fontWeight: 600, borderBottom: '1px solid var(--border)' }
const td: React.CSSProperties = { padding: '9px 12px', fontSize: '0.85rem', borderTop: '1px solid var(--border)' }
const numTd: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }

// ── KPI card ──────────────────────────────────────────────────────
function KpiCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', flex: 1, minWidth: 140 }}>
      <p style={{ fontSize: '0.73rem', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>{label}</p>
      <p style={{ fontSize: '1.35rem', fontWeight: 800, color, margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: '0.73rem', color: 'var(--text3)', margin: '4px 0 0' }}>{sub}</p>}
    </div>
  )
}

// ── Add button ────────────────────────────────────────────────────
function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{ marginTop: 10, background: 'var(--bg)', border: '1px dashed var(--border)', borderRadius: 8, padding: '7px 16px', color: 'var(--text2)', fontSize: '0.83rem', cursor: 'pointer', width: '100%' }}>
      {label}
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function PageFinanciera() {
  const { form, estado, setEstado, perfil } = useStore()
  const isProfesor = perfil?.rol === 'profesor'
  const completeness = calcCompleteness(form, estado.secciones_aprobadas ?? [])
  const pct = completeness.financiera
  const headerColor = pct >= 80 ? '#22c55e' : pct >= 40 ? '#7c6af7' : '#94a3b8'

  const calc = useMemo(() => calcFinanciero(form, estado), [
    form.f_costos_fijos, form.f_pvu, form.f_cvu,
    estado.gastosFijos, estado.pronosticoVentas, estado.materiaPrima, estado.manoObraDirecta
  ])

  const totalGastosFijos = useMemo(() => calcTotalGastosFijos(estado.gastosFijos || []), [estado.gastosFijos])
  const totalMP          = useMemo(() => calcTotalMateriaPrima(estado.materiaPrima || []), [estado.materiaPrima])
  const totalMOD         = useMemo(() => calcTotalMOD(estado.manoObraDirecta || []), [estado.manoObraDirecta])
  const costosFijosEfectivos = n(form.f_costos_fijos) > 0 ? n(form.f_costos_fijos) : totalGastosFijos

  // Viabilidad
  const mesPosFirst = calc.proyeccionMensual.findIndex(m => m.resultado >= 0)
  const esViable   = mesPosFirst >= 0
  const viabilidadColor  = !esViable ? '#ef4444' : mesPosFirst <= 1 ? '#22c55e' : mesPosFirst <= 3 ? '#f59e0b' : '#ef4444'
  const viabilidadEmoji  = !esViable ? '🔴' : mesPosFirst <= 1 ? '🟢' : mesPosFirst <= 3 ? '🟡' : '🔴'
  const viabilidadTexto  = !esViable
    ? 'El negocio no sería rentable en los primeros 6 meses. Revisá tus precios o reduce costos.'
    : mesPosFirst === 0
    ? 'Excelente: el emprendimiento generaría ganancia desde el primer mes.'
    : `El emprendimiento entraría en zona positiva a partir del Mes ${mesPosFirst + 1}.`

  // CRUD pronóstico
  const addPronostico = () => {
    if (isProfesor) return
    setEstado({ pronosticoVentas: [...(estado.pronosticoVentas || []), { id: Date.now(), nombre: '', precio: 0, costo: 0, margen: 30, crecimientoMensual: 5, semanas: [0, 0, 0, 0] }] })
  }
  const removePronostico = (id: number) => {
    if (isProfesor) return
    setEstado({ pronosticoVentas: (estado.pronosticoVentas || []).filter(p => p.id !== id) })
  }
  const updatePronostico = (id: number, field: string, value: string | number | number[]) => {
    if (isProfesor) return
    setEstado({ pronosticoVentas: (estado.pronosticoVentas || []).map(p => p.id === id ? { ...p, [field]: value } : p) })
  }

  // CRUD MP
  const addMP    = () => { if (isProfesor) return; setEstado({ materiaPrima: [...(estado.materiaPrima || []), { id: Date.now(), concepto: '', cantidad: 0, precio: 0 }] }) }
  const removeMP = (id: number) => { if (isProfesor) return; setEstado({ materiaPrima: (estado.materiaPrima || []).filter(m => m.id !== id) }) }
  const updateMP = (id: number, field: keyof LineaPresupuesto, value: string | number) => {
    if (isProfesor) return
    setEstado({ materiaPrima: (estado.materiaPrima || []).map(m => m.id === id ? { ...m, [field]: value } : m) })
  }

  // CRUD MOD
  const addMOD    = () => { if (isProfesor) return; setEstado({ manoObraDirecta: [...(estado.manoObraDirecta || []), { id: Date.now(), nombre: '', horas: 0, valorHora: 0 }] }) }
  const removeMOD = (id: number) => { if (isProfesor) return; setEstado({ manoObraDirecta: (estado.manoObraDirecta || []).filter(m => m.id !== id) }) }
  const updateMOD = (id: number, field: keyof ManoObra, value: string | number) => {
    if (isProfesor) return
    setEstado({ manoObraDirecta: (estado.manoObraDirecta || []).map(m => m.id === id ? { ...m, [field]: value } : m) })
  }

  // CRUD GF
  const addGasto    = () => { if (isProfesor) return; setEstado({ gastosFijos: [...(estado.gastosFijos || []), { id: Date.now(), concepto: '', tipo: 'Comercial', monto: 0 }] }) }
  const removeGasto = (id: number) => { if (isProfesor) return; setEstado({ gastosFijos: (estado.gastosFijos || []).filter(g => g.id !== id) }) }
  const updateGasto = (id: number, field: keyof GastoFijo, value: string | number) => {
    if (isProfesor) return
    setEstado({ gastosFijos: (estado.gastosFijos || []).map(g => g.id === id ? { ...g, [field]: value } : g) })
  }

  const labels6m    = ['Mes 1', 'Mes 2', 'Mes 3', 'Mes 4', 'Mes 5', 'Mes 6']
  const proyIngresos   = calc.proyeccionMensual.map(m => m.ingresos)
  const proyCostos     = calc.proyeccionMensual.map(m => m.costoVariable + m.costoFijo)
  const proyResultados = calc.proyeccionMensual.map(m => m.resultado)

  const costoBase = calc.cvuPromedio + calc.cfuPromedio

  return (
    <div>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            📊 Gestión Económica-Financiera
            <span style={{ background: 'rgba(124,106,247,0.15)', color: 'var(--accent)', border: '1px solid rgba(124,106,247,0.25)', borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600 }}>Paso Final</span>
          </h1>
          <p style={{ color: 'var(--text3)', marginTop: 6, fontSize: '0.9rem', marginBottom: 0 }}>Presupuestos, costos, punto de equilibrio y proyección a 6 meses.</p>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 18px', minWidth: 180, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>Completitud</p>
            <div style={{ height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: headerColor, borderRadius: 99, transition: 'width 0.4s ease' }} />
            </div>
          </div>
          <span style={{ fontSize: '1.15rem', fontWeight: 700, color: headerColor }}>{pct}%</span>
        </div>
      </div>

      {/* ── KPI Dashboard (live) ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <KpiCard label="Ingresos Mes 1" value={`$${fmt(calc.totalIngresos)}`} color="var(--accent3)" sub="Ventas totales estimadas" />
        <KpiCard label="Costos Mes 1" value={`$${fmt(calc.totalCostoVariable + (costosFijosEfectivos))}`} color="#ef4444" sub="Variables + Fijos" />
        <KpiCard
          label="Resultado Mes 1"
          value={`${calc.totalResultado >= 0 ? '+' : ''}$${fmt(calc.totalResultado)}`}
          color={calc.totalResultado >= 0 ? '#22c55e' : '#ef4444'}
          sub={calc.totalResultado >= 0 ? 'Ganancia estimada' : 'Pérdida estimada'}
        />
        <KpiCard label="Punto de Equilibrio" value={`${calc.puntoEquilibrioUnidades} u.`} color="#7c6af7" sub={`= $${fmt(calc.puntoEquilibrioMonto)}`} />
        <KpiCard label="Margen de Contribución" value={`${calc.margenContribucion}%`} color="#22a0f7" sub="De cada peso vendido" />
      </div>

      {/* ── Guía de cómo funciona ── */}
      <InfoBox titulo="¿Cómo funciona este módulo?">
        <p style={{ margin: '0 0 8px' }}><b>Este módulo tiene 7 pasos que se van alimentando entre sí:</b></p>
        <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li><b>Pronóstico</b> → cuántas unidades van a vender por semana en el primer mes, y cuánto esperan crecer cada mes.</li>
          <li><b>Costos</b> → cuánto cuesta fabricar (materia prima + mano de obra) y cuáles son los gastos fijos.</li>
          <li><b>Precio</b> → el sistema calcula el costo promedio por unidad y vos definís el margen de ganancia.</li>
          <li><b>Resultados</b> → se generan automáticamente: presupuesto de ventas, punto de equilibrio y proyección a 6 meses.</li>
        </ol>
        <p style={{ margin: '10px 0 0', color: 'var(--text3)' }}>Los recuadros azules con 💡 tienen explicaciones de cada concepto financiero.</p>
      </InfoBox>

      {/* ══ PASO 1: PRONÓSTICO ══════════════════════════════════════ */}
      <Bloque>
        <StepHeader num={1} title="Pronóstico de Ventas — Cantidades" subtitle="¿Cuántas unidades estimás vender por semana en el primer mes?" />

        <InfoBox titulo="¿Qué pongo acá?">
          <p style={{ margin: 0 }}>Completá por <b>semana</b> cuántas unidades de cada producto o servicio van a vender. Si es la misma cantidad todas las semanas, podés poner el mismo número en S1, S2, S3 y S4.</p>
          <p style={{ margin: '8px 0 0' }}>El <b>Crecimiento Mensual (%)</b> indica cuánto esperás aumentar las ventas cada mes. Ej: si ponés 10%, en el Mes 2 venderás 10% más que en el Mes 1, y así sucesivamente.</p>
          <p style={{ margin: '8px 0 0', background: 'rgba(124,106,247,0.08)', padding: '6px 10px', borderRadius: 6 }}>💡 <b>Tip:</b> Sé realista. Estudiá cuántas personas hay en tu zona y cuánto compra cada una. Es mejor empezar conservador.</p>
        </InfoBox>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
            <thead>
              <tr>
                <th style={th}>Producto / Servicio</th>
                <th style={{ ...th, textAlign: 'center', minWidth: 70 }}>Semana 1</th>
                <th style={{ ...th, textAlign: 'center', minWidth: 70 }}>Semana 2</th>
                <th style={{ ...th, textAlign: 'center', minWidth: 70 }}>Semana 3</th>
                <th style={{ ...th, textAlign: 'center', minWidth: 70 }}>Semana 4</th>
                <th style={{ ...th, textAlign: 'center', minWidth: 90 }}>Crec. mensual (%)</th>
                <th style={{ ...th, textAlign: 'right', minWidth: 90 }}>Total Mes 1</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {(!estado.pronosticoVentas || estado.pronosticoVentas.length === 0) ? (
                <tr>
                  <td colSpan={8} style={{ ...td, textAlign: 'center', color: 'var(--text3)', padding: 28, fontStyle: 'italic' }}>
                    Hacé clic en "Agregar producto" para ingresar tu pronóstico.
                  </td>
                </tr>
              ) : (
                (estado.pronosticoVentas || []).map(p => {
                  const totalU = (p.semanas || []).reduce((a, b) => n(a) + n(b), 0)
                  return (
                    <tr key={p.id} style={{ transition: 'background 0.1s' }}>
                      <td style={td}>
                        <input value={p.nombre} onChange={e => updatePronostico(p.id, 'nombre', e.target.value)} placeholder="Ej: Alfajor de chocolate" style={{ width: '100%', padding: '5px 8px' }} disabled={isProfesor} />
                      </td>
                      {[0, 1, 2, 3].map(idx => (
                        <td key={idx} style={{ ...td, textAlign: 'center' }}>
                          <input type="number" min={0} value={p.semanas?.[idx] || 0}
                            onChange={e => {
                              const s = [...(p.semanas || [0, 0, 0, 0])]
                              s[idx] = +e.target.value
                              updatePronostico(p.id, 'semanas', s)
                            }}
                            style={{ width: 60, padding: '5px 6px', textAlign: 'center' }} disabled={isProfesor} />
                        </td>
                      ))}
                      <td style={{ ...td, textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <input type="number" min={0} value={p.crecimientoMensual} onChange={e => updatePronostico(p.id, 'crecimientoMensual', +e.target.value)} style={{ width: 60, padding: '5px 6px', textAlign: 'center' }} disabled={isProfesor} />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>%</span>
                        </div>
                      </td>
                      <td style={{ ...numTd, fontWeight: 700, color: '#7c6af7', fontSize: '0.95rem' }}>
                        {totalU} u.
                      </td>
                      <td style={td}>{!isProfesor && <IconBtn variant="del" onClick={() => removePronostico(p.id)} />}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!isProfesor && <AddBtn onClick={addPronostico} label="+ Agregar producto o servicio" />}
      </Bloque>

      {/* ══ PASO 2: COSTOS ══════════════════════════════════════════ */}
      <Bloque>
        <StepHeader num={2} title="Presupuesto de Costos" subtitle="¿Cuánto te cuesta producir y mantener tu estructura?" />

        <InfoBox titulo="La diferencia entre costos variables y fijos">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 10 }}>
              <p style={{ fontWeight: 700, color: '#ef4444', margin: '0 0 4px' }}>📦 Costos Variables</p>
              <p style={{ margin: 0, fontSize: '0.82rem' }}>Cambian según cuánto producís. Si hacés el doble, gastás el doble en materiales.<br /><b>Ejemplos:</b> harina, azúcar, envases, embalaje.</p>
            </div>
            <div style={{ background: 'rgba(247,162,106,0.07)', border: '1px solid rgba(247,162,106,0.2)', borderRadius: 8, padding: 10 }}>
              <p style={{ fontWeight: 700, color: 'var(--accent2)', margin: '0 0 4px' }}>🏢 Costos Fijos</p>
              <p style={{ margin: 0, fontSize: '0.82rem' }}>Los pagás aunque no vendas nada. No cambian con la producción.<br /><b>Ejemplos:</b> alquiler, internet, seguro, sueldos fijos.</p>
            </div>
          </div>
        </InfoBox>

        {/* Materia Prima */}
        <SubBloque icon="📦" title="Materia Prima / Insumos" subtitle="Todo material que se consume directamente al fabricar cada unidad del producto.">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Insumo / Material</th>
                  <th style={{ ...th, width: 100 }}>Cantidad</th>
                  <th style={{ ...th, width: 130 }}>Precio unit. ($)</th>
                  <th style={{ ...th, textAlign: 'right', width: 120 }}>Total ($)</th>
                  <th style={{ ...th, width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {(estado.materiaPrima || []).map(m => (
                  <tr key={m.id}>
                    <td style={td}><input value={m.concepto} onChange={e => updateMP(m.id, 'concepto', e.target.value)} placeholder="Ej: Harina 000" style={{ width: '100%', padding: '5px 8px' }} disabled={isProfesor} /></td>
                    <td style={td}><input type="number" min={0} value={m.cantidad} onChange={e => updateMP(m.id, 'cantidad', +e.target.value)} style={{ width: '100%', padding: '5px 8px' }} disabled={isProfesor} /></td>
                    <td style={td}><input type="number" min={0} value={m.precio} onChange={e => updateMP(m.id, 'precio', +e.target.value)} style={{ width: '100%', padding: '5px 8px' }} disabled={isProfesor} /></td>
                    <td style={{ ...numTd, color: '#ef4444', fontWeight: 600 }}>${fmt(m.cantidad * m.precio)}</td>
                    <td style={td}>{!isProfesor && <IconBtn variant="del" onClick={() => removeMP(m.id)} />}</td>
                  </tr>
                ))}
                {(estado.materiaPrima || []).length > 0 && (
                  <tr style={{ background: 'rgba(239,68,68,0.05)' }}>
                    <td colSpan={3} style={{ ...td, fontWeight: 700, color: 'var(--text2)', fontSize: '0.8rem', borderTop: '2px solid rgba(239,68,68,0.3)' }}>TOTAL MATERIA PRIMA</td>
                    <td style={{ ...numTd, fontWeight: 700, color: '#ef4444', borderTop: '2px solid rgba(239,68,68,0.3)' }}>${fmt(totalMP)}</td>
                    <td style={{ ...td, borderTop: '2px solid rgba(239,68,68,0.3)' }}></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {!isProfesor && <AddBtn onClick={addMP} label="+ Agregar insumo" />}
        </SubBloque>

        {/* Mano de Obra */}
        <SubBloque icon="👷" title="Mano de Obra Directa" subtitle="Personas que trabajan directamente en la fabricación del producto (sueldos o pagos por producción).">
          <InfoBox titulo="¿Qué es la Mano de Obra Directa?">
            <p style={{ margin: 0 }}>Son las horas de trabajo que se necesitan para producir las unidades del mes. Calculá: si una persona trabaja 80 horas por mes haciendo el producto y cobra $500 la hora, el costo es $40.000.</p>
            <p style={{ margin: '6px 0 0', color: 'var(--text3)' }}>No confundir con los sueldos administrativos o de ventas (esos van en Costos Fijos).</p>
          </InfoBox>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Rol / Tarea</th>
                  <th style={{ ...th, width: 120 }}>Horas/mes</th>
                  <th style={{ ...th, width: 140 }}>Valor hora ($)</th>
                  <th style={{ ...th, textAlign: 'right', width: 120 }}>Total ($)</th>
                  <th style={{ ...th, width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {(estado.manoObraDirecta || []).map(m => (
                  <tr key={m.id}>
                    <td style={td}><input value={m.nombre} onChange={e => updateMOD(m.id, 'nombre', e.target.value)} placeholder="Ej: Productor/a" style={{ width: '100%', padding: '5px 8px' }} disabled={isProfesor} /></td>
                    <td style={td}><input type="number" min={0} value={m.horas} onChange={e => updateMOD(m.id, 'horas', +e.target.value)} style={{ width: '100%', padding: '5px 8px' }} disabled={isProfesor} /></td>
                    <td style={td}><input type="number" min={0} value={m.valorHora} onChange={e => updateMOD(m.id, 'valorHora', +e.target.value)} style={{ width: '100%', padding: '5px 8px' }} disabled={isProfesor} /></td>
                    <td style={{ ...numTd, color: '#ef4444', fontWeight: 600 }}>${fmt(m.horas * m.valorHora)}</td>
                    <td style={td}>{!isProfesor && <IconBtn variant="del" onClick={() => removeMOD(m.id)} />}</td>
                  </tr>
                ))}
                {(estado.manoObraDirecta || []).length > 0 && (
                  <tr style={{ background: 'rgba(239,68,68,0.05)' }}>
                    <td colSpan={3} style={{ ...td, fontWeight: 700, color: 'var(--text2)', fontSize: '0.8rem', borderTop: '2px solid rgba(239,68,68,0.3)' }}>TOTAL MANO DE OBRA DIRECTA</td>
                    <td style={{ ...numTd, fontWeight: 700, color: '#ef4444', borderTop: '2px solid rgba(239,68,68,0.3)' }}>${fmt(totalMOD)}</td>
                    <td style={{ ...td, borderTop: '2px solid rgba(239,68,68,0.3)' }}></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {!isProfesor && <AddBtn onClick={addMOD} label="+ Agregar persona / rol" />}
        </SubBloque>

        {/* Costos Fijos */}
        <SubBloque icon="🏢" title="Costos Fijos Mensuales" subtitle="Gastos que pagás todos los meses, vendas o no vendas. La estructura del negocio.">
          <InfoBox titulo="Tipos de costos fijos">
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <li><b>Comercial:</b> publicidad, comisiones de venta, packaging especial.</li>
              <li><b>Administrativo:</b> sueldos de admin, contador, útiles de oficina.</li>
              <li><b>Operativo:</b> alquiler, servicios (luz, agua, gas, internet).</li>
              <li><b>Otros:</b> seguros, cuotas de asociaciones, capacitaciones.</li>
            </ul>
          </InfoBox>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Concepto</th>
                  <th style={{ ...th, width: 160 }}>Categoría</th>
                  <th style={{ ...th, textAlign: 'right', width: 140 }}>Monto mensual ($)</th>
                  <th style={{ ...th, width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {(estado.gastosFijos || []).map(g => (
                  <tr key={g.id}>
                    <td style={td}><input value={g.concepto} onChange={e => updateGasto(g.id, 'concepto', e.target.value)} placeholder="Ej: Alquiler del local" style={{ width: '100%', padding: '5px 8px' }} disabled={isProfesor} /></td>
                    <td style={td}>
                      <select value={g.tipo} onChange={e => updateGasto(g.id, 'tipo', e.target.value)} style={{ width: '100%', padding: '5px 8px' }} disabled={isProfesor}>
                        {['Comercial', 'Administrativo', 'Operativo', 'Otros'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td style={numTd}>
                      <input type="number" min={0} value={g.monto} onChange={e => updateGasto(g.id, 'monto', +e.target.value)} style={{ width: '100%', padding: '5px 8px', textAlign: 'right' }} disabled={isProfesor} />
                    </td>
                    <td style={td}>{!isProfesor && <IconBtn variant="del" onClick={() => removeGasto(g.id)} />}</td>
                  </tr>
                ))}
                {(estado.gastosFijos || []).length > 0 && (
                  <tr style={{ background: 'rgba(247,162,106,0.06)' }}>
                    <td colSpan={2} style={{ ...td, fontWeight: 700, color: 'var(--text2)', fontSize: '0.8rem', borderTop: '2px solid rgba(247,162,106,0.4)' }}>TOTAL COSTOS FIJOS MENSUALES</td>
                    <td style={{ ...numTd, fontWeight: 700, color: 'var(--accent2)', borderTop: '2px solid rgba(247,162,106,0.4)' }}>${fmt(totalGastosFijos)}</td>
                    <td style={{ ...td, borderTop: '2px solid rgba(247,162,106,0.4)' }}></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {!isProfesor && <AddBtn onClick={addGasto} label="+ Agregar gasto fijo" />}
        </SubBloque>

        {/* Costo unitario calculado */}
        {calc.cvuPromedio > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12, marginTop: 6 }}>
            {[
              { label: 'CVU — Costo Variable Unitario', value: `$${fmt(calc.cvuPromedio)}`, color: '#ef4444', help: '¿Cuánto te cuesta fabricar 1 unidad? (MP + MOD ÷ unidades)' },
              { label: 'CFU — Costo Fijo Unitario', value: `$${fmt(calc.cfuPromedio)}`, color: 'var(--accent2)', help: 'La parte de los gastos fijos que le toca a cada unidad' },
              { label: 'Costo Total Unitario', value: `$${fmt(costoBase)}`, color: '#7c6af7', help: 'CVU + CFU = base para calcular el precio mínimo' },
            ].map(k => (
              <div key={k.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text3)', fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{k.label}</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 800, color: k.color, margin: '0 0 4px' }}>{k.value}</p>
                <p style={{ fontSize: '0.73rem', color: 'var(--text3)', margin: 0 }}>{k.help}</p>
              </div>
            ))}
          </div>
        )}
      </Bloque>

      {/* ══ PASO 3: PRECIO DE VENTA ════════════════════════════════ */}
      <Bloque>
        <StepHeader num={3} title="Fijación de Precio de Venta" subtitle="Definí el margen de ganancia de cada producto sobre el costo calculado" />

        <InfoBox titulo="¿Cómo se calcula el Precio de Venta?">
          <p style={{ margin: 0 }}>
            <b>Precio = Costo Total Unitario × (1 + Margen%)</b><br />
            Ejemplo: si el costo es $320 y el margen es 40%, el precio sería $320 × 1,4 = <b>$448</b>.
          </p>
          <p style={{ margin: '8px 0 0' }}>
            El <b>Margen de Contribución</b> ({calc.margenContribucion}%) indica cuánto de cada venta queda disponible para pagar los costos fijos. Si tu margen es bajo, necesitarás vender muchas más unidades para cubrir la estructura.
          </p>
        </InfoBox>

        {(estado.pronosticoVentas || []).length === 0 ? (
          <p style={{ color: 'var(--text3)', fontSize: '0.88rem', fontStyle: 'italic' }}>Primero agregá productos en el Paso 1.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Producto / Servicio</th>
                <th style={{ ...th, textAlign: 'right' }}>Costo total base ($)</th>
                <th style={{ ...th, textAlign: 'center', width: 160 }}>Margen ganancia (%)</th>
                <th style={{ ...th, textAlign: 'right' }}>Precio de venta ($)</th>
              </tr>
            </thead>
            <tbody>
              {(estado.pronosticoVentas || []).map(p => (
                <tr key={p.id}>
                  <td style={{ ...td, fontWeight: 500 }}>{p.nombre || '(Sin nombre)'}</td>
                  <td style={{ ...numTd, color: 'var(--text2)' }}>${fmt(round2(costoBase))}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <input type="number" min={0} value={p.margen} onChange={e => updatePronostico(p.id, 'margen', +e.target.value)} style={{ width: 70, padding: '5px 8px', textAlign: 'center' }} disabled={isProfesor} />
                      <span style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>%</span>
                    </div>
                  </td>
                  <td style={{ ...numTd, fontWeight: 800, color: '#7c6af7', fontSize: '1.05rem' }}>
                    ${fmt(round2(costoBase * (1 + n(p.margen) / 100)))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Bloque>

      {/* ══ PASO 4: PRESUPUESTO DE VENTAS (auto) ═══════════════════ */}
      <Bloque>
        <StepHeader num={4} title="Presupuesto de Ventas — Mes 1" subtitle="Ingresos totales estimados basados en cantidades × precios definidos arriba" />

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Producto / Servicio</th>
              <th style={{ ...th, textAlign: 'right' }}>Unidades Mes 1</th>
              <th style={{ ...th, textAlign: 'right' }}>Precio unit. ($)</th>
              <th style={{ ...th, textAlign: 'right' }}>Ingresos ($)</th>
            </tr>
          </thead>
          <tbody>
            {(estado.pronosticoVentas || []).length === 0 ? (
              <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: 'var(--text3)', fontStyle: 'italic', padding: 20 }}>Completá el Paso 1 para ver el presupuesto.</td></tr>
            ) : (
              (estado.pronosticoVentas || []).map(p => {
                const totalU = (p.semanas || []).reduce((a, b) => n(a) + n(b), 0)
                const pv     = round2(calc.cvuPromedio * (1 + n(p.margen) / 100))
                return (
                  <tr key={p.id}>
                    <td style={td}>{p.nombre || '(Sin nombre)'}</td>
                    <td style={numTd}>{totalU} u.</td>
                    <td style={numTd}>${fmt(pv)}</td>
                    <td style={{ ...numTd, fontWeight: 700, color: '#22c55e' }}>${fmt(totalU * pv)}</td>
                  </tr>
                )
              })
            )}
            <tr style={{ background: 'rgba(34,197,94,0.08)' }}>
              <td colSpan={3} style={{ ...td, fontWeight: 800, color: '#22c55e', borderTop: '2px solid rgba(34,197,94,0.4)', fontSize: '0.9rem' }}>TOTAL INGRESOS — MES 1</td>
              <td style={{ ...numTd, fontWeight: 800, color: '#22c55e', borderTop: '2px solid rgba(34,197,94,0.4)', fontSize: '1.1rem' }}>${fmt(calc.totalIngresos)}</td>
            </tr>
          </tbody>
        </table>
      </Bloque>

      {/* ══ PASO 5: PUNTO DE EQUILIBRIO ════════════════════════════ */}
      <Bloque>
        <StepHeader num={5} title="Punto de Equilibrio" subtitle="¿Cuánto tenés que vender para no ganar ni perder?" />

        <InfoBox titulo="¿Qué es el Punto de Equilibrio?">
          <p style={{ margin: 0 }}>
            Es la cantidad mínima de ventas para cubrir <b>todos</b> los costos (fijos + variables) sin ganar ni perder.<br />
            <b>Fórmula:</b> PE = Costos Fijos ÷ Margen de Contribución Unitario
          </p>
          <p style={{ margin: '8px 0 0' }}>
            Si vendés <b>menos</b> que el PE → pérdida. Si vendés <b>más</b> → ganancia. El PE divide la zona de pérdida de la zona de ganancia.
          </p>
        </InfoBox>

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, alignItems: 'center', marginBottom: 20 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid rgba(124,106,247,0.3)', borderRadius: 16, padding: '24px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>Necesitás vender</p>
            <p style={{ fontSize: '2.5rem', fontWeight: 800, color: '#7c6af7', margin: 0 }}>{calc.puntoEquilibrioUnidades}</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text3)', margin: '4px 0 0' }}>unidades por mes</p>
            <div style={{ marginTop: 12, padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent2)' }}>
              ${fmt(calc.puntoEquilibrioMonto)} totales
            </div>
          </div>
          <div>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <Line
                data={{
                  labels: Array.from({ length: 11 }, (_, i) => Math.round(i * (calc.puntoEquilibrioUnidades * 2) / 10) + ' u.'),
                  datasets: [
                    {
                      label: 'Ingresos',
                      data: Array.from({ length: 11 }, (_, i) => {
                        const q = Math.round(i * (calc.puntoEquilibrioUnidades * 2) / 10)
                        const pProm = calc.totalIngresos / (calc.semanas.reduce((a, s) => a + s.unidades, 0) || 1)
                        return q * (pProm || 1)
                      }),
                      borderColor: '#22c55e', tension: 0.2, fill: false, pointRadius: 3,
                    },
                    {
                      label: 'Costos Totales',
                      data: Array.from({ length: 11 }, (_, i) => {
                        const q = Math.round(i * (calc.puntoEquilibrioUnidades * 2) / 10)
                        const cmProm = calc.totalCostoVariable / (calc.semanas.reduce((a, s) => a + s.unidades, 0) || 1)
                        return costosFijosEfectivos + (q * (cmProm || 1))
                      }),
                      borderColor: '#ef4444', tension: 0.2, fill: false, pointRadius: 3,
                    },
                  ],
                }}
                options={{ ...CHART_OPTS, plugins: { ...CHART_OPTS.plugins, legend: { ...CHART_OPTS.plugins.legend, position: 'bottom' as const } } }}
              />
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text3)', margin: '8px 0 0', fontStyle: 'italic' }}>
              La intersección de las líneas es el Punto de Equilibrio — donde ingresos = costos totales.
            </p>
          </div>
        </div>
      </Bloque>

      {/* ══ PASO 6: PROYECCIÓN A 6 MESES ══════════════════════════ */}
      <Bloque>
        <StepHeader num={6} title="Proyección a 6 Meses" subtitle="Evolución de ingresos, costos y resultado mes a mes" />

        {/* Alerta de viabilidad */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: `${viabilidadColor}12`, border: `1px solid ${viabilidadColor}30`, borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <span style={{ fontSize: '1.2rem' }}>{viabilidadEmoji}</span>
          <div>
            <p style={{ fontWeight: 700, color: viabilidadColor, fontSize: '0.88rem', margin: 0 }}>Análisis de viabilidad</p>
            <p style={{ fontSize: '0.83rem', color: 'var(--text2)', margin: '2px 0 0' }}>{viabilidadTexto}</p>
          </div>
        </div>

        {/* Tabla 6 meses */}
        <div style={{ overflowX: 'auto', marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr style={{ background: 'var(--bg3)' }}>
                <th style={{ ...th, minWidth: 200 }}>Concepto</th>
                {labels6m.map(l => <th key={l} style={{ ...th, textAlign: 'right' }}>{l}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...td, fontWeight: 600 }}>(+) Ingresos por ventas</td>
                {calc.proyeccionMensual.map(m => <td key={m.mes} style={{ ...numTd, color: '#22c55e' }}>${fmt(m.ingresos)}</td>)}
              </tr>
              <tr>
                <td style={{ ...td, fontWeight: 600 }}>(-) Costos variables</td>
                {calc.proyeccionMensual.map(m => <td key={m.mes} style={{ ...numTd, color: '#ef4444' }}>-${fmt(m.costoVariable)}</td>)}
              </tr>
              <tr>
                <td style={{ ...td, fontWeight: 600 }}>(-) Costos fijos</td>
                {calc.proyeccionMensual.map(m => <td key={m.mes} style={{ ...numTd, color: 'var(--text3)' }}>-${fmt(m.costoFijo)}</td>)}
              </tr>
              <tr style={{ background: 'rgba(124,106,247,0.06)' }}>
                <td style={{ ...td, fontWeight: 800, color: '#7c6af7', borderTop: '2px solid rgba(124,106,247,0.3)', fontSize: '0.95rem' }}>(=) Resultado</td>
                {calc.proyeccionMensual.map(m => (
                  <td key={m.mes} style={{ ...numTd, fontWeight: 800, borderTop: '2px solid rgba(124,106,247,0.3)', color: m.resultado >= 0 ? '#22c55e' : '#ef4444' }}>
                    {m.resultado >= 0 ? '+' : ''}${fmt(m.resultado)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Gráfico */}
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text2)', margin: '0 0 12px' }}>Gráfico de rentabilidad a 6 meses</p>
          <Line data={{
            labels: labels6m,
            datasets: [
              { label: 'Ingresos', data: proyIngresos, borderColor: '#22c55e', tension: 0.4, fill: false, pointRadius: 4 },
              { label: 'Egresos totales', data: proyCostos, borderColor: '#ef4444', tension: 0.4, fill: false, pointRadius: 4 },
              {
                label: 'Ganancia / Pérdida',
                data: proyResultados,
                backgroundColor: proyResultados.map(v => v >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'),
                borderColor: '#7c6af7', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 4,
              },
            ],
          }} options={CHART_OPTS} />
        </div>

        <InfoBox titulo="¿Cómo interpretar el gráfico?">
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li><b style={{ color: '#22c55e' }}>Verde (Ingresos):</b> lo que entra por ventas cada mes.</li>
            <li><b style={{ color: '#ef4444' }}>Rojo (Egresos):</b> costos fijos + variables totales.</li>
            <li><b style={{ color: '#7c6af7' }}>Violeta (Resultado):</b> la diferencia. Cuando esté por encima de cero, el negocio es rentable.</li>
          </ul>
          <p style={{ margin: '8px 0 0' }}>Buscá que las líneas de ingresos superen a los egresos lo antes posible. Si no se cruzan, revisá tu estrategia de precios o costos.</p>
        </InfoBox>
      </Bloque>

      <FeedbackPanel section="financiera" />
    </div>
  )
}
