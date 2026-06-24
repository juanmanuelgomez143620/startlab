import { useMemo } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { useStore } from '../store/useStore'
import { calcFinanciero, calcTotalGastosFijos, fmt, n } from '../lib/calculos'
import { FeedbackPanel } from '../components/FeedbackPanel'
import { Card, CardTitle, CardSubtitle, IconBtn, Divider } from '../components/ui'
import type { GastoFijo, ManoObra, LineaPresupuesto } from '../types'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler)

const CHART_OPTS = {
  responsive: true,
  plugins: { legend: { labels: { color: '#9090b0', font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: '#9090b0' }, grid: { color: 'rgba(42,42,56,0.8)' } },
    y: { ticks: { color: '#9090b0', callback: (v: number | string) => '$' + fmt(Number(v)) }, grid: { color: 'rgba(42,42,56,0.8)' } },
  },
}

export default function PageFinanciera() {
  const { form, estado, setEstado, perfil } = useStore()
  const isProfesor = perfil?.rol === 'profesor'

  // ── Computed financials (memoized, recalculates on any change) ──
  const calc = useMemo(() => calcFinanciero(form, estado), [
    form.f_costos_fijos, form.f_pvu, form.f_cvu,
    estado.gastosFijos, estado.pronosticoVentas, estado.materiaPrima, estado.manoObraDirecta
  ])

  const totalGastosFijos = useMemo(() => calcTotalGastosFijos(estado.gastosFijos || []), [estado.gastosFijos])

  // Auto-sync costos fijos con la tabla de gastos
  const costosFijosEfectivos = n(form.f_costos_fijos) > 0 ? n(form.f_costos_fijos) : totalGastosFijos

  // ── Pronóstico de ventas multi-producto ──
  function addPronostico() {
    if (isProfesor) return
    setEstado({ 
      pronosticoVentas: [
        ...(estado.pronosticoVentas || []), 
        { id: Date.now(), nombre: '', precio: 0, costo: 0, margen: 30, crecimientoMensual: 5, semanas: [0, 0, 0, 0] }
      ] 
    })
  }
  function removePronostico(id: number) {
    if (isProfesor) return
    setEstado({ pronosticoVentas: (estado.pronosticoVentas || []).filter(p => p.id !== id) })
  }
  function updatePronostico(id: number, field: string, value: string | number | number[]) {
    if (isProfesor) return
    setEstado({
      pronosticoVentas: (estado.pronosticoVentas || []).map(p => 
        p.id === id ? { ...p, [field]: value } : p
      )
    })
  }

  // ── MP ──
  function addMP() { 
    if (isProfesor) return
    setEstado({ materiaPrima: [...(estado.materiaPrima || []), { id: Date.now(), concepto: '', cantidad: 0, precio: 0 }] }) 
  }
  function removeMP(id: number) { 
    if (isProfesor) return
    setEstado({ materiaPrima: (estado.materiaPrima || []).filter(m => m.id !== id) }) 
  }
  function updateMP(id: number, field: keyof LineaPresupuesto, value: string | number) {
    if (isProfesor) return
    setEstado({ materiaPrima: (estado.materiaPrima || []).map(m => m.id === id ? { ...m, [field]: value } : m) })
  }

  // ── MOD ──
  function addMOD() { 
    if (isProfesor) return
    setEstado({ manoObraDirecta: [...(estado.manoObraDirecta || []), { id: Date.now(), nombre: '', horas: 0, valorHora: 0 }] }) 
  }
  function removeMOD(id: number) { 
    if (isProfesor) return
    setEstado({ manoObraDirecta: (estado.manoObraDirecta || []).filter(m => m.id !== id) }) 
  }
  function updateMOD(id: number, field: keyof ManoObra, value: string | number) {
    if (isProfesor) return
    setEstado({ manoObraDirecta: (estado.manoObraDirecta || []).map(m => m.id === id ? { ...m, [field]: value } : m) })
  }

  // ── Gastos fijos ──
  function addGasto() { 
    if (isProfesor) return
    setEstado({ gastosFijos: [...(estado.gastosFijos || []), { id: Date.now(), concepto: '', tipo: 'Comercial', monto: 0 }] }) 
  }
  function removeGasto(id: number) { 
    if (isProfesor) return
    setEstado({ gastosFijos: (estado.gastosFijos || []).filter(g => g.id !== id) }) 
  }
  function updateGasto(id: number, field: keyof GastoFijo, value: string | number) {
    if (isProfesor) return
    setEstado({ gastosFijos: (estado.gastosFijos || []).map(g => g.id === id ? { ...g, [field]: value } : g) })
  }

  const labels6m = ['Mes 1', 'Mes 2', 'Mes 3', 'Mes 4', 'Mes 5', 'Mes 6']
  
  const proyUnidades = calc.proyeccionMensual.map(m => m.unidades)
  const proyIngresos = calc.proyeccionMensual.map(m => m.ingresos)
  const proyCostos = calc.proyeccionMensual.map(m => m.costoVariable + m.costoFijo)
  const proyResultados = calc.proyeccionMensual.map(m => m.resultado)

  const tdStyle = { padding: '9px 14px', borderTop: '1px solid var(--border)', fontSize: '0.875rem' }
  const thStyle = { background: 'var(--bg3)', padding: '10px 14px', textAlign: 'left' as const, fontSize: '0.75rem', color: 'var(--text2)', fontWeight: 600 }
  const numStyle = { ...tdStyle, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 10 }}>
          📊 Gestión Económica-Financiera
          <span style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(124,106,247,0.15)', color: 'var(--accent)', border: '1px solid rgba(124,106,247,0.25)', borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.3px' }}>Paso Final</span>
        </h1>
        <p style={{ color: 'var(--text2)', marginTop: 4, fontSize: '0.9rem' }}>Presupuestos, punto de equilibrio y resultados económicos del emprendimiento.</p>
      </div>

      {/* PASO 1: PRONÓSTICO DE CANTIDADES */}
      <Card>
        <CardTitle icon="🔢">1. Pronóstico de Ventas (Cantidades)</CardTitle>
        <CardSubtitle>¿Cuántas unidades estimás vender por semana en el primer mes y cuál será el crecimiento mensual?</CardSubtitle>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr>
                <th style={thStyle}>Producto / Servicio</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>S1</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>S2</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>S3</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>S4</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Crecimiento (%)</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total Mes 1</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {(!estado.pronosticoVentas || estado.pronosticoVentas.length === 0) ? (
                <tr>
                  <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text3)', padding: 30 }}>
                    Hacé clic en "Agregar Producto" para empezar su pronóstico.
                  </td>
                </tr>
              ) : (
                (estado.pronosticoVentas || []).map(p => {
                  const totalUnidades = (p.semanas || []).reduce((a, b) => n(a) + n(b), 0)
                  return (
                    <tr key={p.id}>
                      <td style={tdStyle}>
                        <input value={p.nombre} onChange={e => updatePronostico(p.id, 'nombre', e.target.value)} placeholder="Ej: Café con leche" style={{ width: '100%', padding: '4px 8px' }} disabled={isProfesor} />
                      </td>
                      {[0, 1, 2, 3].map(idx => (
                        <td key={idx} style={{ ...tdStyle, textAlign: 'center' }}>
                          <input type="number" value={p.semanas?.[idx] || 0} 
                            onChange={e => {
                              const newS = [...(p.semanas || [0,0,0,0])]
                              newS[idx] = +e.target.value
                              updatePronostico(p.id, 'semanas', newS)
                            }} 
                            style={{ width: 45, padding: '4px 4px', textAlign: 'center' }} disabled={isProfesor} />
                        </td>
                      ))}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                         <input type="number" value={p.crecimientoMensual} onChange={e => updatePronostico(p.id, 'crecimientoMensual', +e.target.value)} style={{ width: 60, padding: '4px 8px', textAlign: 'center' }} disabled={isProfesor} />
                      </td>
                      <td style={{ ...numStyle, fontWeight: 700, color: 'var(--text2)' }}>
                        {totalUnidades} u.
                      </td>
                      <td style={tdStyle}>
                        {!isProfesor && <IconBtn variant="del" onClick={() => removePronostico(p.id)} />}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!isProfesor && (
          <button onClick={addPronostico} style={{ marginTop: 16, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
             ➕ Agregar Producto al Listado
          </button>
        )}
      </Card>

      {/* PASO 2: PROYECCIÓN A 6 MESES (UNIDADES) */}
      <Card>
        <CardTitle icon="📈">2. Proyección de Ventas a 6 Meses</CardTitle>
        <CardSubtitle>Curva de crecimiento esperada en unidades según el porcentaje del Paso 1</CardSubtitle>
        
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginTop: 10 }}>
          <Line data={{
            labels: labels6m,
            datasets: [{
              label: 'Unidades Proyectadas',
              data: proyUnidades,
              borderColor: 'rgb(124,106,247)',
              backgroundColor: 'rgba(124,106,247,0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 5
            }]
          }} options={CHART_OPTS} />
        </div>
        <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text3)', fontStyle: 'italic' }}>
          * Esta proyección es la base para calcular tus futuros ingresos y necesidades de producción.
        </div>
      </Card>

      <Divider />

      {/* PASO 3: PRESUPUESTOS DE COSTOS */}
      <Card>
        <CardTitle icon="🧱">3. Presupuesto de Costos Desglosado</CardTitle>
        <CardSubtitle>Determiná cuánto te cuesta producir y mantener tu estructura</CardSubtitle>

        {/* MP */}
        <div style={{ background: 'var(--bg2)', borderRadius: 12, padding: 18, border: '1px solid var(--border)', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>📦 Materia Prima / Insumos</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text2)', marginBottom: 16 }}>Incluye todos los materiales que se consumen directamente al fabricar tu producto.</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
            <thead><tr><th style={thStyle}>Insumo</th><th style={thStyle}>Cantidad</th><th style={thStyle}>Precio unit. ($)</th><th style={{ ...thStyle, textAlign: 'right' }}>Total ($)</th><th style={thStyle}></th></tr></thead>
            <tbody>
              {(estado.materiaPrima || []).map(m => (
                <tr key={m.id}>
                  <td style={tdStyle}><input value={m.concepto} onChange={e => updateMP(m.id, 'concepto', e.target.value)} placeholder="Insumo" style={{ width: '100%', padding: '4px 8px' }} disabled={isProfesor} /></td>
                  <td style={tdStyle}><input type="number" value={m.cantidad} onChange={e => updateMP(m.id, 'cantidad', +e.target.value)} style={{ width: 70, padding: '4px 8px' }} disabled={isProfesor} /></td>
                  <td style={tdStyle}><input type="number" value={m.precio} onChange={e => updateMP(m.id, 'precio', +e.target.value)} style={{ width: 90, padding: '4px 8px' }} disabled={isProfesor} /></td>
                  <td style={{ ...numStyle, color: 'var(--accent4)' }}>${fmt(m.cantidad * m.precio)}</td>
                  <td style={tdStyle}>{!isProfesor && <IconBtn variant="del" onClick={() => removeMP(m.id)} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isProfesor && <button onClick={addMP} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', color: 'var(--text)', fontSize: '0.8rem', cursor: 'pointer' }}>➕ Agregar Insumo</button>}
        </div>

        {/* MOD */}
        <div style={{ background: 'var(--bg2)', borderRadius: 12, padding: 18, border: '1px solid var(--border)', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>👷 Mano de Obra Directa</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text2)', marginBottom: 16 }}>Sueldos o pagos por producción de las personas que fabrican el producto.</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
            <thead><tr><th style={thStyle}>Rol / Tarea</th><th style={thStyle}>Horas/mes</th><th style={thStyle}>Valor hora ($)</th><th style={{ ...thStyle, textAlign: 'right' }}>Total ($)</th><th style={thStyle}></th></tr></thead>
            <tbody>
              {(estado.manoObraDirecta || []).map(m => (
                <tr key={m.id}>
                  <td style={tdStyle}><input value={m.nombre} onChange={e => updateMOD(m.id, 'nombre', e.target.value)} placeholder="Rol" style={{ width: '100%', padding: '4px 8px' }} disabled={isProfesor} /></td>
                  <td style={tdStyle}><input type="number" value={m.horas} onChange={e => updateMOD(m.id, 'horas', +e.target.value)} style={{ width: 70, padding: '4px 8px' }} disabled={isProfesor} /></td>
                  <td style={tdStyle}><input type="number" value={m.valorHora} onChange={e => updateMOD(m.id, 'valorHora', +e.target.value)} style={{ width: 90, padding: '4px 8px' }} disabled={isProfesor} /></td>
                  <td style={{ ...numStyle, color: 'var(--accent4)' }}>${fmt(m.horas * m.valorHora)}</td>
                  <td style={tdStyle}>{!isProfesor && <IconBtn variant="del" onClick={() => removeMOD(m.id)} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isProfesor && <button onClick={addMOD} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', color: 'var(--text)', fontSize: '0.8rem', cursor: 'pointer' }}>➕ Agregar Persona</button>}
        </div>

        {/* COSTOS FIJOS */}
        <div style={{ background: 'var(--bg2)', borderRadius: 12, padding: 18, border: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>🏢 Costos Fijos Mensuales</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text2)', marginBottom: 16 }}>Gastos necesarios para existir (alquiler, luz, wifi, etc), vendas o no.</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
            <thead><tr><th style={thStyle}>Concepto</th><th style={thStyle}>Tipo</th><th style={{ ...thStyle, textAlign: 'right' }}>Monto ($)</th><th style={thStyle}></th></tr></thead>
            <tbody>
              {(estado.gastosFijos || []).map(g => (
                <tr key={g.id}>
                  <td style={tdStyle}><input value={g.concepto} onChange={e => updateGasto(g.id, 'concepto', e.target.value)} placeholder="Concepto" style={{ width: '100%', padding: '4px 8px' }} disabled={isProfesor} /></td>
                  <td style={tdStyle}>
                    <select value={g.tipo} onChange={e => updateGasto(g.id, 'tipo', e.target.value)} style={{ padding: '4px 8px' }} disabled={isProfesor}>
                      {['Comercial', 'Administrativo', 'Operativo', 'Otros'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </td>
                  <td style={numStyle}><input type="number" value={g.monto} onChange={e => updateGasto(g.id, 'monto', +e.target.value)} style={{ width: 100, padding: '4px 8px', textAlign: 'right' }} disabled={isProfesor} /></td>
                  <td style={tdStyle}>{!isProfesor && <IconBtn variant="del" onClick={() => removeGasto(g.id)} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isProfesor && <button onClick={addGasto} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', color: 'var(--text)', fontSize: '0.8rem', cursor: 'pointer' }}>➕ Agregar Gasto Fijo</button>}
        </div>

        <div style={{ marginTop: 20, padding: 16, background: 'rgba(124,106,247,0.05)', borderRadius: 12, border: '1px solid rgba(124,106,247,0.1)', fontSize: '0.85rem', color: 'var(--text2)' }}>
          💡 <b>Dato clave:</b> El sistema suma tus presupuestos de materia prima y mano de obra para calcular lo que te cuesta producir <i>en promedio</i> cada unidad.
        </div>
      </Card>

      <Divider />

      {/* PASO 4: MARGEN Y PRECIO */}
      <Card>
        <CardTitle icon="🏷️">4. Estrategia de Margen y Fijación de Precio</CardTitle>
        <CardSubtitle>Definí cuánto querés ganar por cada unidad vendida sobre tus costos base</CardSubtitle>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
            <div style={{ color: 'var(--text3)', fontSize: '0.75rem', marginBottom: 4 }}>Costo Variable Unitario (Promedio)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent4)' }}>${fmt(calc.cvuPromedio)}</div>
          </div>
          <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
            <div style={{ color: 'var(--text3)', fontSize: '0.75rem', marginBottom: 4 }}>Costo Fijo Unitario (Reparto)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent2)' }}>${fmt(calc.cfuPromedio)}</div>
          </div>
          <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 16, border: '1px solid var(--accent)', boxShadow: '0 0 10px rgba(124,106,247,0.1)' }}>
            <div style={{ color: 'var(--text3)', fontSize: '0.75rem', marginBottom: 4 }}>Costo Total Unitario (Base)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent)' }}>${fmt(calc.cvuPromedio + calc.cfuPromedio)}</div>
          </div>
        </div>

        <div style={{ background: 'rgba(124,106,247,0.06)', borderLeft: '4px solid var(--accent)', padding: 14, marginBottom: 20, fontSize: '0.85rem' }}>
          <b>Sugerencia de Precios:</b> Basado en tus presupuestos, el costo total por unidad (incluyendo fijos y variables) es de <b>${fmt(calc.cvuPromedio + calc.cfuPromedio)}</b>. 
          Ajustá el margen de ganancia (%) para cada producto para obtener el Precio Final.
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Producto / Servicio</th>
              <th style={thStyle}>Costo Total Base ($)</th>
              <th style={thStyle}>Margen de Ganancia (%)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Precio de Venta Calculado ($)</th>
            </tr>
          </thead>
          <tbody>
            {(estado.pronosticoVentas || []).map(p => {
              const costoBase = calc.cvuPromedio + calc.cfuPromedio
              return (
                <tr key={p.id}>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>{p.nombre || '(Sin nombre)'}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text3)' }}>$</span>
                      <input type="number" value={round2(costoBase)} readOnly style={{ width: 100, padding: '4px 8px', background: 'var(--bg2)', opacity: 0.8, cursor: 'not-allowed' }} />
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <input type="number" value={p.margen} onChange={e => updatePronostico(p.id, 'margen', +e.target.value)} style={{ width: 80, padding: '4px 8px' }} disabled={isProfesor} />
                  </td>
                  <td style={{ ...numStyle, fontWeight: 700, color: 'var(--accent)', fontSize: '1.1rem' }}>
                    ${fmt(round2(costoBase * (1 + n(p.margen) / 100)))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <Divider />

      {/* PASO 5: PRESUPUESTO DE VENTAS AUTOMÁTICO */}
      <Card>
        <CardTitle icon="💵">5. Presupuesto de Ventas Automático</CardTitle>
        <CardSubtitle>Cálculo total de ingresos basado en cantidades y precios definidos</CardSubtitle>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Producto / Servicio</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Cant. Mes 1 (u.)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Precio Unit. ($)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Total Ingresos Mensuales ($)</th>
            </tr>
          </thead>
          <tbody>
            {(estado.pronosticoVentas || []).map(p => {
              const totalUnidades = (p.semanas || []).reduce((a, b) => n(a) + n(b), 0)
              const precioCalculado = round2(calc.cvuPromedio * (1 + n(p.margen) / 100))
              return (
                <tr key={p.id}>
                  <td style={tdStyle}>{p.nombre || '(Sin nombre)'}</td>
                  <td style={numStyle}>{totalUnidades} u.</td>
                  <td style={numStyle}>${fmt(precioCalculado)}</td>
                  <td style={{ ...numStyle, fontWeight: 700, color: 'rgb(74,222,128)' }}>
                    ${fmt(totalUnidades * precioCalculado)}
                  </td>
                </tr>
              )
            })}
            <tr style={{ background: 'rgba(74,222,128,0.1)' }}>
              <td colSpan={3} style={{ ...tdStyle, fontWeight: 700, color: 'rgb(34,197,94)', borderTop: '2px solid rgb(74,222,128)' }}>TOTAL INGRESOS (MES 1)</td>
              <td style={{ ...numStyle, fontWeight: 800, color: 'rgb(34,197,94)', borderTop: '2px solid rgb(74,222,128)', fontSize: '1.1rem' }}>
                ${fmt(calc.totalIngresos)}
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Divider />

      {/* PASO 6: PUNTO DE EQUILIBRIO */}
      <Card>
        <CardTitle icon="⚖️">6. Punto de Equilibrio</CardTitle>
        <CardSubtitle>¿Cuánto tengo que vender para cubrir todos mis gastos?</CardSubtitle>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, alignItems: 'center' }}>
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 20, padding: 30, textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent)' }}>{calc.puntoEquilibrioUnidades}</div>
            <div style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>unidades mensuales</div>
            <div style={{ marginTop: 16, fontWeight: 600, color: 'var(--accent2)' }}>${fmt(calc.puntoEquilibrioMonto)} totales</div>
          </div>
          <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
            <p>El punto de equilibrio indica el nivel de actividad donde no hay ganancias ni pérdidas.</p>
            <ul style={{ paddingLeft: 20, marginTop: 10, color: 'var(--text2)' }}>
              <li>Si vendés <b>más</b> de {calc.puntoEquilibrioUnidades} u., tendrás ganancia.</li>
              <li>Si vendés <b>menos</b>, el proyecto tendrá pérdidas.</li>
            </ul>
          </div>
        </div>

        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginTop: 24 }}>
          <Line data={{
            labels: Array.from({ length: 11 }, (_, i) => Math.round(i * (calc.puntoEquilibrioUnidades * 2) / 10) + ' u.'),
            datasets: [
              {
                label: 'Ingresos',
                data: Array.from({ length: 11 }, (_, i) => {
                  const q = Math.round(i * (calc.puntoEquilibrioUnidades * 2) / 10)
                  const pProm = calc.totalIngresos / (calc.semanas.reduce((a,s)=>a+s.unidades,0)||1)
                  return q * (pProm || 1)
                }),
                borderColor: 'rgb(74,222,128)', tension: 0.1, fill: false
              },
              {
                label: 'Costos Totales',
                data: Array.from({ length: 11 }, (_, i) => {
                  const q = Math.round(i * (calc.puntoEquilibrioUnidades * 2) / 10)
                  const cmProm = calc.totalCostoVariable / (calc.semanas.reduce((a,s)=>a+s.unidades,0)||1)
                  return costosFijosEfectivos + (q * (cmProm || 1))
                }),
                borderColor: 'rgb(247,106,138)', tension: 0.1, fill: false
              }
            ]
          }} options={CHART_OPTS} />
        </div>
      </Card>

      <Divider />

      {/* PASO 7: RESULTADO ECONÓMICO FINAL */}
      <Card>
        <CardTitle icon="🏁">7. Resultado Económico Final</CardTitle>
        <CardSubtitle>El "Cuadro de Resultados" que resume la salud financiera de tu emprendimiento</CardSubtitle>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg3)' }}>
                <th style={{ ...thStyle, padding: '16px 14px' }}>Concepto Principal</th>
                {labels6m.map(l => <th key={l} style={{ ...thStyle, textAlign: 'right' }}>{l}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...tdStyle, fontWeight: 600 }}>(+) Ingresos por Ventas</td>
                {(calc.proyeccionMensual || []).map(m => <td key={m.mes} style={{ ...numStyle, color: 'var(--success)' }}>${fmt(m.ingresos)}</td>)}
              </tr>
              <tr>
                <td style={{ ...tdStyle, fontWeight: 600 }}>(-) Costos Variables (Producción)</td>
                {(calc.proyeccionMensual || []).map(m => <td key={m.mes} style={{ ...numStyle, color: 'var(--error)' }}>-${fmt(m.costoVariable)}</td>)}
              </tr>
              <tr>
                <td style={{ ...tdStyle, fontWeight: 600 }}>(-) Costos Fijos (Estructura)</td>
                {(calc.proyeccionMensual || []).map(m => <td key={m.mes} style={{ ...numStyle, color: 'var(--text3)' }}>-${fmt(m.costoFijo)}</td>)}
              </tr>
              <tr style={{ background: 'rgba(124,106,247,0.06)' }}>
                <td style={{ ...tdStyle, fontWeight: 800, color: 'var(--accent)', fontSize: '1rem', borderTop: '2px solid var(--accent)' }}>(=) RESULTADO DEL EJERCICIO</td>
                {(calc.proyeccionMensual || []).map(m => (
                  <td key={m.mes} style={{ ...numStyle, fontWeight: 800, fontSize: '1rem', borderTop: '2px solid var(--accent)', color: m.resultado >= 0 ? 'var(--success)' : 'var(--error)' }}>
                    {m.resultado >= 0 ? '+' : ''}${fmt(m.resultado)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginTop: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Gráfico de Rentabilidad a 6 Meses</div>
          <Line data={{
            labels: labels6m,
            datasets: [
              { label: 'Ingresos', data: proyIngresos, borderColor: 'rgb(74,222,128)', tension: 0.4, fill: false },
              { label: 'Egresos Totales', data: proyCostos, borderColor: 'rgb(247,106,138)', tension: 0.4, fill: false },
              { 
                label: 'Ganancia/Pérdida', 
                data: proyResultados, 
                backgroundColor: proyResultados.map(v => v >= 0 ? 'rgba(74,222,128,0.2)' : 'rgba(247,106,138,0.2)'),
                borderColor: 'rgb(247,162,106)',
                borderWidth: 2,
                fill: true,
                tension: 0.4 
              }
            ]
          }} options={CHART_OPTS} />
        </div>

        <div style={{ marginTop: 20, padding: 16, background: 'var(--bg2)', borderRadius: 12, border: '1px solid var(--border)', fontSize: '0.85rem' }}>
          <p><b>Análisis Final:</b></p>
          <p style={{ color: 'var(--text2)', marginTop: 4 }}>
            Este cuadro muestra la viabilidad de tu negocio en el tiempo. Buscá que la línea de resultados sea siempre ascendente y que supere pronto el área de costos para ser rentable.
          </p>
        </div>
      </Card>

      <FeedbackPanel section="financiera" />
    </div>
  )
}
