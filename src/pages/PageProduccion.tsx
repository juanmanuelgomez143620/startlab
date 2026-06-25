import { useState } from 'react'
import { useStore } from '../store/useStore'
import { FeedbackPanel } from '../components/FeedbackPanel'
import { fmt, calcTotalEquipamiento, calcInversionTotal, n, calcCompleteness } from '../lib/calculos'
import type { Equipo } from '../types'

// ── data ─────────────────────────────────────────────────────────
const INSTALACIONES = [
  { id: 'Domicilio / Garaje',       icon: '🏠', desc: 'Casa o garage propio' },
  { id: 'Local alquilado',           icon: '🏪', desc: 'Espacio rentado' },
  { id: 'Local propio',              icon: '🏢', desc: 'Inmueble propio' },
  { id: 'Cowork / Incubadora',       icon: '🤝', desc: 'Espacio compartido' },
  { id: 'Campo / Predio agrícola',   icon: '🌾', desc: 'Espacio rural' },
  { id: 'Sin espacio físico',        icon: '💻', desc: 'Servicio digital / remoto' },
]

const PERIODOS = ['por día', 'por semana', 'por quincena', 'por mes']

// ── helpers ───────────────────────────────────────────────────────
function Bloque({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: '1.25rem 1.5rem', marginBottom: 20 }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, margin: '0 0 2px', color: 'var(--text)' }}>{title}</p>
      {subtitle && <p style={{ fontSize: '0.83rem', color: 'var(--text3)', margin: '0 0 18px' }}>{subtitle}</p>}
      {!subtitle && <div style={{ marginBottom: 16 }} />}
      {children}
    </div>
  )
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
      {text}{required && <span style={{ color: '#ef4444' }}> *</span>}
    </label>
  )
}

// ── Pasos del proceso ─────────────────────────────────────────────
function PasosList({ pasos, onAdd, onRemove, disabled }: {
  pasos: string[]
  onAdd: (v: string) => void
  onRemove: (i: number) => void
  disabled: boolean
}) {
  const [draft, setDraft] = useState('')

  function commit() {
    const v = draft.trim()
    if (!v) return
    onAdd(v)
    setDraft('')
  }

  return (
    <div>
      {pasos.length === 0 && (
        <p style={{ fontSize: '0.83rem', color: 'var(--text3)', margin: '0 0 12px' }}>
          Todavía no hay pasos cargados. Agregá el primer paso del proceso.
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: pasos.length ? 12 : 0 }}>
        {pasos.map((paso, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
            <span style={{ minWidth: 26, height: 26, borderRadius: '50%', background: 'rgba(247,106,138,0.15)', border: '1px solid rgba(247,106,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent4)', flexShrink: 0 }}>
              {i + 1}
            </span>
            <span style={{ flex: 1, fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.5 }}>{paso}</span>
            {!disabled && (
              <button
                onClick={() => onRemove(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '1rem', padding: '0 2px', flexShrink: 0 }}
                title="Eliminar paso"
              >×</button>
            )}
          </div>
        ))}
      </div>
      {!disabled && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
            placeholder="Ej: Mezclamos los ingredientes durante 10 minutos... (Enter para agregar)"
            style={{ flex: 1 }}
          />
          <button
            onClick={commit}
            style={{ background: 'rgba(247,106,138,0.15)', border: '1px solid rgba(247,106,138,0.3)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent4)', whiteSpace: 'nowrap' }}
          >
            + Agregar paso
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function PageProduccion() {
  const { form, setField, estado, setEstado, perfil } = useStore()
  const isProfesor = perfil?.rol === 'profesor'
  const completeness = calcCompleteness(form, estado.secciones_aprobadas ?? [])
  const pct = completeness.produccion
  const headerColor = pct >= 80 ? '#22c55e' : pct >= 40 ? '#f87171' : '#94a3b8'

  // Proceso por pasos
  const pasos = estado.pasos_proceso ?? []
  function addPaso(v: string) {
    const next = [...pasos, v]
    setEstado({ pasos_proceso: next })
    setField('p_proceso', next.map((p, i) => `${i + 1}. ${p}`).join('\n'))
  }
  function removePaso(i: number) {
    const next = pasos.filter((_, idx) => idx !== i)
    setEstado({ pasos_proceso: next })
    setField('p_proceso', next.map((p, idx) => `${idx + 1}. ${p}`).join('\n'))
  }

  // Equipos
  const totalEquip = calcTotalEquipamiento(estado.equipos)

  function addEquipo() {
    if (isProfesor) return
    setEstado({ equipos: [...estado.equipos, { id: Date.now(), nombre: '', cantidad: 1, precio: 0, tiene: 'No' }] })
  }
  function removeEquipo(id: number) {
    if (isProfesor) return
    const updated = estado.equipos.filter(e => e.id !== id)
    setEstado({ equipos: updated })
    const tot = calcTotalEquipamiento(updated)
    setField('p_inv_equip', String(tot))
    recalcTotal(String(tot), form.p_inv_mp, form.p_inv_otros)
  }
  function updateEquipo(id: number, field: keyof Equipo, value: string | number) {
    if (isProfesor) return
    const updated = estado.equipos.map(e => e.id === id ? { ...e, [field]: value } : e)
    setEstado({ equipos: updated })
    const tot = calcTotalEquipamiento(updated)
    setField('p_inv_equip', String(tot))
    recalcTotal(String(tot), form.p_inv_mp, form.p_inv_otros)
  }

  function recalcTotal(eq: string, mp: string, otros: string) {
    setField('p_inv_total', String(calcInversionTotal(n(eq), n(mp), n(otros))))
  }

  // Inversión visual
  const invEquip  = n(form.p_inv_equip) || totalEquip
  const invMP     = n(form.p_inv_mp)
  const invOtros  = n(form.p_inv_otros)
  const invTotal  = n(form.p_inv_total) || invEquip + invMP + invOtros
  const pEquip    = invTotal > 0 ? Math.round((invEquip / invTotal) * 100) : 0
  const pMP       = invTotal > 0 ? Math.round((invMP / invTotal) * 100) : 0
  const pOtros    = invTotal > 0 ? 100 - pEquip - pMP : 0

  const TIENE_CONFIG: Record<string, { color: string; bg: string }> = {
    'Sí':      { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    'Parcial': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    'No':      { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            🏭 Gestión de Producción
            <span style={{ background: 'rgba(247,106,138,0.15)', color: 'var(--accent4)', border: '1px solid rgba(247,106,138,0.25)', borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600 }}>Paso 4</span>
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text3)', margin: '6px 0 0' }}>Proceso, equipamiento, instalaciones e inversión inicial.</p>
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

      {/* Proceso productivo */}
      <Bloque title="✅ Proceso Productivo" subtitle="Describí paso a paso cómo se produce tu producto o se presta tu servicio">
        <PasosList
          pasos={pasos}
          onAdd={addPaso}
          onRemove={removePaso}
          disabled={isProfesor}
        />
        {pasos.length > 0 && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text3)', margin: '10px 0 0' }}>
            {pasos.length} paso{pasos.length !== 1 ? 's' : ''} cargado{pasos.length !== 1 ? 's' : ''}.
          </p>
        )}
      </Bloque>

      {/* Capacidad */}
      <Bloque title="⚙️ Capacidad de Producción" subtitle="¿Cuánto podés producir con los recursos actuales?">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
          <div>
            <Label text="Cantidad de unidades que pueden producir" required />
            <input
              value={form.p_capacidad}
              onChange={e => setField('p_capacidad', e.target.value)}
              placeholder="Ej: 50"
              className={form.p_capacidad ? 'filled' : ''}
              disabled={isProfesor}
            />
          </div>
          <div>
            <Label text="Período" />
            <select
              value={form.p_capacidad.includes('por') ? '' : ''}
              onChange={() => {}}
              disabled={isProfesor}
              style={{ minWidth: 130 }}
            >
              {PERIODOS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text3)', margin: '6px 0 0' }}>
          Ej: «50 unidades por semana», «200 kg por mes», «10 clientes por día».
        </p>
      </Bloque>

      {/* Instalación */}
      <Bloque title="🏢 Tipo de Instalación" subtitle="¿Dónde se produce o se presta el servicio?">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
          {INSTALACIONES.map(inst => {
            const selected = form.p_instalacion === inst.id
            return (
              <button
                key={inst.id}
                onClick={() => !isProfesor && setField('p_instalacion', inst.id)}
                disabled={isProfesor}
                style={{
                  padding: '12px 10px', borderRadius: 12, cursor: isProfesor ? 'default' : 'pointer',
                  border: selected ? '2px solid var(--accent4)' : '1px solid var(--border)',
                  background: selected ? 'rgba(247,106,138,0.1)' : 'var(--bg)',
                  textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{inst.icon}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: selected ? 'var(--accent4)' : 'var(--text)', marginBottom: 2 }}>{inst.id}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text3)' }}>{inst.desc}</div>
              </button>
            )
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <Label text="Ubicación" />
            <input value={form.p_ubicacion} onChange={e => setField('p_ubicacion', e.target.value)} placeholder="Ej: Colonia Wanda, Misiones" disabled={isProfesor} />
          </div>
          <div>
            <Label text="Superficie aprox." />
            <input value={form.p_superficie} onChange={e => setField('p_superficie', e.target.value)} placeholder="Ej: 25 m²" disabled={isProfesor} />
          </div>
          <div>
            <Label text="Costo mensual del espacio ($)" />
            <input type="number" value={form.p_costo_local} onChange={e => setField('p_costo_local', e.target.value)} placeholder="0" disabled={isProfesor} />
          </div>
          <div>
            <Label text="Descripción del espacio" />
            <input value={form.p_desc_local} onChange={e => setField('p_desc_local', e.target.value)} placeholder="Servicios, condiciones, m²..." disabled={isProfesor} />
          </div>
        </div>
      </Bloque>

      {/* Equipamiento */}
      <Bloque title="🔧 Equipamiento Necesario" subtitle="Listá máquinas, herramientas y equipos. Indicá si ya los tienen o necesitan comprarlos.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {estado.equipos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: '0.88rem' }}>
              No hay equipos cargados todavía.
            </div>
          )}
          {estado.equipos.map((eq, idx) => {
            const tconf = TIENE_CONFIG[eq.tiene] ?? TIENE_CONFIG['No']
            const subtotal = eq.cantidad * eq.precio
            return (
              <div key={eq.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text3)' }}>Equipo {idx + 1}</span>
                  <span style={{
                    marginLeft: 'auto', padding: '3px 10px', borderRadius: 99, fontSize: '0.76rem', fontWeight: 600,
                    background: tconf.bg, color: tconf.color, border: `1px solid ${tconf.color}40`,
                  }}>
                    {eq.tiene === 'Sí' ? '✓ Disponible' : eq.tiene === 'Parcial' ? '⚠ Parcial' : '✗ Falta comprar'}
                  </span>
                  {!isProfesor && (
                    <button
                      onClick={() => removeEquipo(eq.id)}
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '3px 10px', cursor: 'pointer', fontSize: '0.78rem', color: '#ef4444' }}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 120px 80px 120px', gap: 10, alignItems: 'end' }}>
                  <div>
                    <Label text="Nombre del equipo" />
                    <input value={eq.nombre} onChange={e => updateEquipo(eq.id, 'nombre', e.target.value)} placeholder="Ej: Horno industrial" disabled={isProfesor} />
                  </div>
                  <div>
                    <Label text="Cant." />
                    <input type="number" min={1} value={eq.cantidad} onChange={e => updateEquipo(eq.id, 'cantidad', +e.target.value)} disabled={isProfesor} />
                  </div>
                  <div>
                    <Label text="Precio unit. ($)" />
                    <input type="number" value={eq.precio} onChange={e => updateEquipo(eq.id, 'precio', +e.target.value)} placeholder="0" disabled={isProfesor} />
                  </div>
                  <div>
                    <Label text="Total" />
                    <input value={`$${fmt(subtotal)}`} readOnly style={{ fontWeight: 700, color: 'var(--accent)', cursor: 'not-allowed', background: 'var(--bg3)' }} disabled />
                  </div>
                  <div>
                    <Label text="¿Lo tienen?" />
                    <select value={eq.tiene} onChange={e => updateEquipo(eq.id, 'tiene', e.target.value)} disabled={isProfesor} style={{ borderColor: `${tconf.color}50` }}>
                      <option>No</option>
                      <option>Sí</option>
                      <option>Parcial</option>
                    </select>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {estado.equipos.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, padding: '10px 16px', background: 'rgba(124,106,247,0.06)', border: '1px solid rgba(124,106,247,0.15)', borderRadius: 10 }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text2)' }}>Total equipamiento:&nbsp;</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent)' }}>${fmt(totalEquip)}</span>
          </div>
        )}

        {!isProfesor && (
          <button
            onClick={addEquipo}
            style={{ marginTop: 12, background: 'var(--bg)', border: '1px dashed var(--border)', borderRadius: 10, padding: '8px 18px', color: 'var(--text2)', fontSize: '0.85rem', cursor: 'pointer', width: '100%' }}
          >
            + Agregar equipo / herramienta
          </button>
        )}
      </Bloque>

      {/* Inversión inicial */}
      <Bloque title="💰 Inversión Inicial" subtitle="Cuánto dinero necesitás para arrancar el emprendimiento">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 18 }}>
          <div>
            <Label text="Equipamiento ($)" required />
            <input
              type="number"
              value={form.p_inv_equip || (totalEquip > 0 ? totalEquip : '')}
              onChange={e => { setField('p_inv_equip', e.target.value); recalcTotal(e.target.value, form.p_inv_mp, form.p_inv_otros) }}
              placeholder={String(totalEquip || 0)}
              disabled={isProfesor}
            />
            {totalEquip > 0 && <p style={{ fontSize: '0.72rem', color: 'var(--accent3)', margin: '4px 0 0' }}>✓ Desde tabla: ${fmt(totalEquip)}</p>}
          </div>
          <div>
            <Label text="Materia prima inicial ($)" />
            <input
              type="number"
              value={form.p_inv_mp}
              onChange={e => { setField('p_inv_mp', e.target.value); recalcTotal(form.p_inv_equip, e.target.value, form.p_inv_otros) }}
              placeholder="0"
              disabled={isProfesor}
            />
          </div>
          <div>
            <Label text="Otros gastos iniciales ($)" />
            <input
              type="number"
              value={form.p_inv_otros}
              onChange={e => { setField('p_inv_otros', e.target.value); recalcTotal(form.p_inv_equip, form.p_inv_mp, e.target.value) }}
              placeholder="Ej: habilitación, publicidad"
              disabled={isProfesor}
            />
          </div>
        </div>

        {/* Visual bar */}
        {invTotal > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
              {pEquip > 0 && (
                <div style={{ width: `${pEquip}%`, background: '#7c6af7', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 24 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>{pEquip}%</span>
                </div>
              )}
              {pMP > 0 && (
                <div style={{ width: `${pMP}%`, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 24 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>{pMP}%</span>
                </div>
              )}
              {pOtros > 0 && (
                <div style={{ flex: 1, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 24 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>{pOtros}%</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#7c6af7', display: 'inline-block' }} />
                Equipos: <strong>${fmt(invEquip)}</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e', display: 'inline-block' }} />
                Mat. prima: <strong>${fmt(invMP)}</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b', display: 'inline-block' }} />
                Otros: <strong>${fmt(invOtros)}</strong>
              </span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(247,162,106,0.08)', border: '1px solid rgba(247,162,106,0.25)', borderRadius: 10, padding: '12px 16px' }}>
          <span style={{ fontSize: '0.88rem', color: 'var(--text2)' }}>INVERSIÓN TOTAL INICIAL</span>
          <input
            type="number"
            value={form.p_inv_total}
            readOnly
            disabled={isProfesor}
            style={{ maxWidth: 160, fontWeight: 700, fontSize: '1rem', color: 'var(--accent2)', borderColor: 'rgba(247,162,106,0.4)', cursor: 'not-allowed', marginLeft: 'auto' }}
          />
        </div>
      </Bloque>

      <FeedbackPanel section="produccion" />
    </div>
  )
}
