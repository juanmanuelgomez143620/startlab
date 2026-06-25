import { useState, useMemo, type ReactNode, type CSSProperties } from 'react'
import { useStore } from '../store/useStore'
import { Btn, toast } from '../components/ui'
import { exportarPDF } from '../lib/pdfExport'
import { fmt, calcFinanciero } from '../lib/calculos'

interface Section {
  id: string
  emoji: string
  title: string
  pct: number
  content: ReactNode
}

export default function PageReporte() {
  const { form, estado, loadProject, reset } = useStore()
  const [expanded, setExpanded] = useState<string | null>('institucional')

  const calc = useMemo(() => calcFinanciero(form, estado), [form, estado])

  function handleExport() {
    exportarPDF(form, estado)
    toast('📄 PDF generado correctamente.', 'success')
  }

  function handleExportJSON() {
    const data = { form, estado, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `plan_${(form.i_nombre_emp || 'mi_proyecto').replace(/\s+/g, '_')}.json`
    a.click()
    toast('Datos exportados como JSON.', 'success')
  }

  function handleImportJSON() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string)
          loadProject(data.form, data.estado)
          toast('Proyecto importado exitosamente.', 'success')
        } catch {
          toast('Archivo inválido o corrupto.', 'error')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  // Per-section completeness (0-100)
  const secPct = {
    institucional: [form.i_nombre_emp, form.i_escuela, form.i_rubro, form.i_materia, form.i_docente].filter(v => v?.trim()).length * 20,
    estrategica:   [form.e_mision, form.e_vision, form.e_objetivos, form.e_propuesta_valor, form.e_fortalezas].filter(v => v?.trim()).length * 20,
    marketing:     [form.m_segmento, form.m_perfil, form.m_canal, form.m_producto, form.m_precio_venta].filter(v => v?.trim()).length * 20,
    produccion:    [form.p_proceso || estado.pasos_proceso?.length, form.p_capacidad, form.p_instalacion, form.p_inv_total].filter(Boolean).length * 25,
    financiero:    calc.totalIngresos > 0 ? Math.min(100, 40 + estado.pronosticoVentas.length * 15 + (estado.gastosFijos.length > 0 ? 25 : 0)) : 0,
    legal:         [form.l_forma, form.l_impositivo].filter(v => v?.trim()).length * 50,
  }

  const avgPct = Math.round(Object.values(secPct).reduce((a, b) => a + b, 0) / 6)

  const pctColor = (n: number) => n >= 80 ? '#22c55e' : n >= 40 ? '#f59e0b' : '#ef4444'

  // Helper: label-value row
  const fld = (label: string, value: string | undefined | null) =>
    value?.trim() ? (
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <span style={{ color: 'var(--text3)', minWidth: 160, fontSize: '0.8rem', flexShrink: 0 }}>{label}</span>
        <span style={{ color: 'var(--text)', fontSize: '0.85rem', fontWeight: 500 }}>{value}</span>
      </div>
    ) : null

  const divider: CSSProperties = { height: 1, background: 'var(--border)', margin: '12px 0' }
  const chip = (txt: string, color: string, bg: string) => (
    <span key={txt} style={{ background: bg, color, borderRadius: 99, padding: '2px 10px', fontSize: '0.76rem', fontWeight: 600 }}>{txt}</span>
  )

  // FODA data
  const fodaItems = {
    F: (form.e_fortalezas    || '').split('\n').filter(Boolean),
    O: (form.e_oportunidades || '').split('\n').filter(Boolean),
    D: (form.e_debilidades   || '').split('\n').filter(Boolean),
    A: (form.e_amenazas      || '').split('\n').filter(Boolean),
  }

  const sections: Section[] = [
    {
      id: 'institucional',
      emoji: '🏫',
      title: 'Datos Institucionales',
      pct: secPct.institucional,
      content: (
        <div>
          {fld('Emprendimiento', form.i_nombre_emp)}
          {fld('Tipo de negocio', form.i_tipo_negocio)}
          {fld('Rubro', form.i_rubro)}
          {form.i_slogan && fld('Slogan', `"${form.i_slogan}"`)}
          {form.i_desc_breve && (
            <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px 12px', fontSize: '0.84rem', color: 'var(--text2)', marginBottom: 10, fontStyle: 'italic' }}>
              {form.i_desc_breve}
            </div>
          )}
          <div style={divider} />
          {fld('Escuela', form.i_escuela)}
          {fld('Modalidad', form.i_modalidad)}
          {fld('Curso', form.i_curso)}
          {fld('Materia', form.i_materia)}
          {fld('Docente', form.i_docente ? `Prof. ${form.i_docente}` : undefined)}
          {fld('Ciclo lectivo', form.i_ciclo)}
          {estado.members.length > 0 && (
            <>
              <div style={divider} />
              <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginBottom: 8 }}>Equipo emprendedor</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {estado.members.map((m, i) => (
                  <span key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 99, padding: '4px 12px', fontSize: '0.8rem' }}>
                    {m.nombre} · <span style={{ color: 'var(--accent)' }}>{m.rol}</span>
                  </span>
                ))}
              </div>
            </>
          )}
          {!form.i_nombre_emp && <div style={{ color: 'var(--text3)', fontSize: '0.84rem' }}>Sin datos aún. Completá el módulo Institucional.</div>}
        </div>
      ),
    },
    {
      id: 'estrategica',
      emoji: '🎯',
      title: 'Gestión Estratégica',
      pct: secPct.estrategica,
      content: (
        <div>
          {form.e_propuesta_valor && (
            <div style={{ background: 'rgba(124,106,247,0.07)', border: '1px solid rgba(124,106,247,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700, marginBottom: 4 }}>PROPUESTA DE VALOR</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.6 }}>{form.e_propuesta_valor}</div>
            </div>
          )}
          {fld('Misión', form.e_mision)}
          {fld('Visión', form.e_vision)}
          {(estado.valores || []).length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginBottom: 6 }}>Valores del emprendimiento</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {estado.valores.map((v, i) => chip(v, 'var(--accent)', 'rgba(124,106,247,0.1)'))}
              </div>
            </div>
          )}
          {form.e_objetivos?.trim() && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginBottom: 6 }}>Objetivos</div>
              {form.e_objetivos.split('\n').filter(Boolean).map((o, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700, minWidth: 18 }}>{i + 1}.</span>
                  <span style={{ color: 'var(--text)' }}>{o}</span>
                </div>
              ))}
            </div>
          )}
          {(fodaItems.F.length + fodaItems.O.length + fodaItems.D.length + fodaItems.A.length) > 0 && (
            <>
              <div style={divider} />
              <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginBottom: 8 }}>
                Análisis FODA — {fodaItems.F.length + fodaItems.O.length + fodaItems.D.length + fodaItems.A.length} ítems
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  { label: 'Fortalezas',    items: fodaItems.F, color: '#22c55e',       bg: 'rgba(34,197,94,0.07)'   },
                  { label: 'Oportunidades', items: fodaItems.O, color: 'var(--accent)', bg: 'rgba(124,106,247,0.07)' },
                  { label: 'Debilidades',   items: fodaItems.D, color: '#f59e0b',       bg: 'rgba(245,158,11,0.07)'  },
                  { label: 'Amenazas',      items: fodaItems.A, color: '#ef4444',       bg: 'rgba(239,68,68,0.07)'   },
                ].map(f => (
                  <div key={f.label} style={{ background: f.bg, borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: f.color, marginBottom: 4 }}>{f.label} ({f.items.length})</div>
                    {f.items.slice(0, 3).map((item, j) => (
                      <div key={j} style={{ fontSize: '0.76rem', color: 'var(--text2)', marginBottom: 2 }}>· {item}</div>
                    ))}
                    {f.items.length > 3 && <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>+{f.items.length - 3} más</div>}
                  </div>
                ))}
              </div>
            </>
          )}
          {!form.e_mision && !form.e_propuesta_valor && <div style={{ color: 'var(--text3)', fontSize: '0.84rem' }}>Sin datos aún. Completá el módulo Estratégica.</div>}
        </div>
      ),
    },
    {
      id: 'marketing',
      emoji: '📣',
      title: 'Gestión de Marketing',
      pct: secPct.marketing,
      content: (
        <div>
          {fld('Segmento objetivo', form.m_segmento)}
          {fld('Perfil del consumidor', form.m_perfil)}
          {fld('Mercado / Zona', form.m_zona)}
          {form.m_canal?.trim() && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginBottom: 5 }}>Canales de venta</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {form.m_canal.split(',').map((c) => chip(c.trim(), '#16a34a', 'rgba(22,163,74,0.1)'))}
              </div>
            </div>
          )}
          {(estado.redes_sociales || []).length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginBottom: 5 }}>Redes sociales</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {estado.redes_sociales.map((r) => chip(r, 'var(--text2)', 'var(--surface)'))}
              </div>
            </div>
          )}
          {estado.competidores.length > 0 && (
            <>
              <div style={divider} />
              <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginBottom: 6 }}>Competidores ({estado.competidores.length})</div>
              {estado.competidores.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '5px 8px', background: i % 2 === 0 ? 'var(--surface)' : 'transparent', borderRadius: 6, marginBottom: 3, fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 600, minWidth: 90 }}>{c.nombre}</span>
                  <span style={{ color: 'var(--text2)', flex: 1 }}>{c.producto}</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{c.precio}</span>
                  {c.ventaja && <span style={{ color: '#22c55e', fontSize: '0.74rem' }}>✓ {c.ventaja}</span>}
                </div>
              ))}
            </>
          )}
          {(form.m_producto || form.m_precio_mix || form.m_plaza || form.m_promocion) && (
            <>
              <div style={divider} />
              <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginBottom: 6 }}>Marketing Mix — 4P</div>
              {fld('Producto', form.m_producto)}
              {fld('Precio', form.m_precio_mix)}
              {fld('Plaza', form.m_plaza)}
              {fld('Promoción', form.m_promocion)}
            </>
          )}
          {form.m_precio_venta && (
            <div style={{ marginTop: 10, background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 8, padding: '8px 14px', display: 'flex', justifyContent: 'space-around', fontSize: '0.85rem' }}>
              <div><span style={{ color: 'var(--text3)' }}>Costo </span><b>${fmt(parseFloat(form.m_costo_unit) || 0)}</b></div>
              <div><span style={{ color: 'var(--text3)' }}>Margen </span><b>{form.m_margen}%</b></div>
              <div><span style={{ color: 'var(--text3)' }}>Precio </span><b style={{ color: '#22c55e' }}>${fmt(parseFloat(form.m_precio_venta) || 0)}</b></div>
            </div>
          )}
          {!form.m_segmento && <div style={{ color: 'var(--text3)', fontSize: '0.84rem' }}>Sin datos aún. Completá el módulo Marketing.</div>}
        </div>
      ),
    },
    {
      id: 'produccion',
      emoji: '🏭',
      title: 'Gestión de Producción',
      pct: secPct.produccion,
      content: (
        <div>
          {(estado.pasos_proceso || []).length > 0 ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginBottom: 6 }}>Proceso productivo</div>
              {estado.pasos_proceso.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
                  <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 99, minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: '0.84rem', color: 'var(--text)', paddingTop: 1 }}>{p}</span>
                </div>
              ))}
            </div>
          ) : form.p_proceso ? fld('Proceso', form.p_proceso) : null}
          {fld('Capacidad', form.p_capacidad)}
          {fld('Tipo de instalación', form.p_instalacion)}
          {fld('Ubicación', form.p_ubicacion)}
          {estado.equipos.length > 0 && (
            <>
              <div style={divider} />
              <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginBottom: 6 }}>Equipamiento ({estado.equipos.length} ítems)</div>
              {estado.equipos.slice(0, 5).map((eq, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 8px', background: i % 2 === 0 ? 'var(--surface)' : 'transparent', borderRadius: 6, marginBottom: 2, fontSize: '0.82rem' }}>
                  <span style={{ flex: 1 }}>{eq.nombre}</span>
                  <span style={{ color: 'var(--text2)' }}>x{eq.cantidad}</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>${fmt(eq.cantidad * eq.precio)}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: eq.tiene === 'Sí' ? '#22c55e' : eq.tiene === 'Parcial' ? '#f59e0b' : '#ef4444' }}>{eq.tiene}</span>
                </div>
              ))}
              {estado.equipos.length > 5 && <div style={{ fontSize: '0.73rem', color: 'var(--text3)', marginTop: 3 }}>+{estado.equipos.length - 5} más</div>}
            </>
          )}
          {(parseFloat(form.p_inv_total) > 0 || parseFloat(form.p_inv_equip) > 0) && (
            <div style={{ marginTop: 10, background: 'rgba(124,106,247,0.07)', border: '1px solid rgba(124,106,247,0.15)', borderRadius: 8, padding: '8px 14px', display: 'flex', justifyContent: 'space-around', fontSize: '0.85rem' }}>
              <div><span style={{ color: 'var(--text3)' }}>Equipamiento </span><b>${fmt(parseFloat(form.p_inv_equip) || 0)}</b></div>
              <div><span style={{ color: 'var(--text3)' }}>MP </span><b>${fmt(parseFloat(form.p_inv_mp) || 0)}</b></div>
              <div><span style={{ color: 'var(--text3)' }}>Otros </span><b>${fmt(parseFloat(form.p_inv_otros) || 0)}</b></div>
              <div><span style={{ color: 'var(--text3)' }}>Total </span><b style={{ color: 'var(--accent)' }}>${fmt(parseFloat(form.p_inv_total) || (parseFloat(form.p_inv_equip) || 0) + (parseFloat(form.p_inv_mp) || 0) + (parseFloat(form.p_inv_otros) || 0))}</b></div>
            </div>
          )}
          {!form.p_proceso && !estado.pasos_proceso?.length && <div style={{ color: 'var(--text3)', fontSize: '0.84rem' }}>Sin datos aún. Completá el módulo Producción.</div>}
        </div>
      ),
    },
    {
      id: 'financiero',
      emoji: '💰',
      title: 'Gestión Económica-Financiera',
      pct: secPct.financiero,
      content: calc.totalIngresos > 0 ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Ingresos (mes 1)', value: `$${fmt(calc.totalIngresos)}`, color: '#22c55e' },
              { label: 'Costos totales', value: `$${fmt(calc.totalCostoVariable + calc.totalCostoFijo)}`, color: '#ef4444' },
              { label: 'Resultado', value: `${calc.totalResultado >= 0 ? '+' : ''}$${fmt(calc.totalResultado)}`, color: calc.totalResultado >= 0 ? '#22c55e' : '#ef4444' },
              { label: 'Punto de equilibrio', value: `${calc.puntoEquilibrioUnidades} u.`, color: 'var(--accent)' },
              { label: 'PE en pesos', value: `$${fmt(calc.puntoEquilibrioMonto)}`, color: 'var(--accent)' },
              { label: 'Margen contribución', value: `${calc.margenContribucion.toFixed(1)}%`, color: 'var(--text)' },
            ].map(k => (
              <div key={k.label} style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginBottom: 3 }}>{k.label}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>
          {/* Mini bar chart — proyección 6 meses */}
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginBottom: 8 }}>Proyección a 6 meses</div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', height: 64 }}>
              {calc.proyeccionMensual.map((m, i) => {
                const isPos = m.resultado >= 0
                const maxAbs = Math.max(...calc.proyeccionMensual.map(x => Math.abs(x.resultado)), 1)
                const barH = Math.round((Math.abs(m.resultado) / maxAbs) * 48) + 4
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: isPos ? '#22c55e' : '#ef4444' }}>
                      {isPos ? '+' : '-'}${fmt(Math.abs(m.resultado)).split('.')[0]}
                    </div>
                    <div style={{ width: '72%', height: barH, background: isPos ? '#22c55e' : '#ef4444', borderRadius: '3px 3px 0 0', opacity: 0.8 }} />
                    <div style={{ fontSize: '0.62rem', color: 'var(--text3)' }}>M{i + 1}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ color: 'var(--text3)', fontSize: '0.84rem' }}>Sin datos financieros aún. Completá el módulo Financiero.</div>
      ),
    },
    {
      id: 'legal',
      emoji: '⚖️',
      title: 'Gestión Legal e Impositiva',
      pct: secPct.legal,
      content: (
        <div>
          {fld('Forma jurídica', form.l_forma)}
          {fld('Régimen impositivo', form.l_impositivo)}
          {form.l_notas && fld('Notas', form.l_notas)}
          {Object.keys(estado.tramitesDone || {}).length > 0 && (
            <>
              <div style={divider} />
              {(() => {
                const vals = Object.values(estado.tramitesDone)
                const done = vals.filter(Boolean).length
                const total = vals.length
                const pct = Math.round((done / Math.max(total, 1)) * 100)
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text2)' }}>Trámites completados</span>
                      <span style={{ fontWeight: 700, color: pctColor(pct) }}>{done} / {total}</span>
                    </div>
                    <div style={{ height: 7, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pctColor(pct), borderRadius: 99, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                )
              })()}
            </>
          )}
          {!form.l_forma && !form.l_impositivo && <div style={{ color: 'var(--text3)', fontSize: '0.84rem' }}>Sin datos aún. Completá el módulo Legal.</div>}
        </div>
      ),
    },
  ]

  const progressColor = pctColor(avgPct)

  const cardBase: CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.5px' }}>📄 Reporte Final</h1>
        <p style={{ color: 'var(--text2)', marginTop: 4 }}>Revisá el plan completo y exportalo en PDF institucional.</p>
      </div>

      {/* ── Export card ────────────────────────────────────── */}
      <div style={{ ...cardBase, padding: '24px 24px 20px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', marginBottom: 3 }}>
              {form.i_nombre_emp || 'Mi Emprendimiento'}
            </div>
            <div style={{ color: 'var(--text2)', fontSize: '0.84rem' }}>
              {[form.i_escuela, form.i_curso, form.i_ciclo, form.i_docente ? `Prof. ${form.i_docente}` : ''].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: `${progressColor}15`, border: `1px solid ${progressColor}35`, borderRadius: 99, padding: '6px 14px' }}>
            <div style={{ width: 8, height: 8, borderRadius: 99, background: progressColor }} />
            <span style={{ fontWeight: 700, fontSize: '0.84rem', color: progressColor }}>{avgPct}% completado</span>
          </div>
        </div>

        {/* Mini per-section progress bars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5, marginBottom: 18 }}>
          {sections.map(s => (
            <div key={s.id} style={{ textAlign: 'center' }}>
              <div style={{ height: 4, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ height: '100%', width: `${s.pct}%`, background: pctColor(s.pct), borderRadius: 99 }} />
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>{s.emoji} {s.pct}%</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Btn variant="primary" onClick={handleExport} style={{ padding: '10px 22px' }}>
            📄 Exportar PDF
          </Btn>
          <Btn variant="secondary" onClick={() => window.print()}>🖨️ Imprimir</Btn>
          <Btn variant="secondary" onClick={handleExportJSON}>💾 Guardar JSON</Btn>
          <Btn variant="secondary" onClick={handleImportJSON}>📂 Cargar JSON</Btn>
        </div>
      </div>

      {/* ── PDF content info ────────────────────────────────── */}
      <div style={{ background: 'rgba(124,106,247,0.05)', border: '1px solid rgba(124,106,247,0.15)', borderRadius: 14, padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)', marginBottom: 10 }}>📋 El PDF incluirá:</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 5 }}>
          {[
            'Portada institucional',
            'Datos del equipo',
            'Misión, Visión y Valores',
            'Propuesta de valor',
            'Objetivos estratégicos',
            'Análisis FODA (tabla 2×2)',
            'Segmento y perfil',
            'Canales y redes sociales',
            'Análisis de competidores',
            'Marketing Mix 4P',
            'Proceso productivo',
            'Lista de equipamiento',
            'Inversión inicial',
            'Presupuesto de costos',
            'Punto de equilibrio',
            'Proyección a 6 meses',
            'Trámites de habilitación',
          ].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--text2)' }}>
              <span style={{ color: '#22c55e', flexShrink: 0 }}>✓</span> {item}
            </div>
          ))}
        </div>
      </div>

      {/* ── Section previews (accordion) ─────────────────────── */}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text2)', marginBottom: 10 }}>
        Vista previa del plan
      </div>

      {sections.map(s => {
        const isOpen = expanded === s.id
        return (
          <div key={s.id} style={cardBase}>
            <div
              style={{ display: 'flex', alignItems: 'center', padding: '13px 18px', cursor: 'pointer', gap: 10, userSelect: 'none' }}
              onClick={() => setExpanded(isOpen ? null : s.id)}
            >
              <span style={{ fontSize: '1.05rem' }}>{s.emoji}</span>
              <span style={{ fontWeight: 700, flex: 1, fontSize: '0.95rem' }}>{s.title}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 52, height: 5, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.pct}%`, background: pctColor(s.pct), borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: '0.73rem', fontWeight: 700, color: pctColor(s.pct), minWidth: 26 }}>{s.pct}%</span>
                <span style={{ color: 'var(--text3)', fontSize: '0.85rem', marginLeft: 2 }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>
            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px 18px' }}>
                {s.content}
              </div>
            )}
          </div>
        )
      })}

      {/* ── Danger zone ─────────────────────────────────────── */}
      <div style={{ background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 16, padding: '20px 22px', marginTop: 6 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 6, color: 'var(--error)' }}>⚠️ Zona peligrosa</div>
        <p style={{ fontSize: '0.84rem', color: 'var(--text2)', marginBottom: 14 }}>
          Reiniciar el plan borrará todos los datos ingresados. Esta acción no se puede deshacer.
        </p>
        <Btn variant="danger" onClick={() => {
          if (confirm('¿Seguro? Se borrarán TODOS los datos del plan.')) {
            reset()
            toast('Plan reiniciado.', 'warn')
          }
        }}>
          🗑️ Reiniciar plan
        </Btn>
      </div>
    </div>
  )
}
