import { useState, useCallback } from 'react'
import { useStore } from '../store/useStore'
import { FeedbackPanel } from '../components/FeedbackPanel'
import { calcCompleteness } from '../lib/calculos'
import type { DatosForm } from '../types'

// ── helpers ──────────────────────────────────────────────────────
const toItems = (s: string) => s.split('\n').map(i => i.trim()).filter(Boolean)
const fromItems = (items: string[]) => items.join('\n')

const MISION_MAX = 320
const VISION_MAX = 320

const VALORES_SUGERIDOS = [
  'Calidad', 'Honestidad', 'Innovación', 'Sustentabilidad', 'Responsabilidad',
  'Creatividad', 'Compromiso', 'Trabajo en equipo', 'Respeto', 'Excelencia',
  'Confianza', 'Solidaridad',
]

const FODA = [
  {
    id: 'e_fortalezas' as const,
    label: 'Fortalezas',
    icon: '💪',
    color: '#22c55e',
    ph: 'Ej: Buen precio, producto artesanal, equipo comprometido…',
    tip: '¿Qué hacemos bien? ¿Qué recursos tenemos? ¿Qué nos diferencia?',
  },
  {
    id: 'e_oportunidades' as const,
    label: 'Oportunidades',
    icon: '🌟',
    color: '#7c6af7',
    ph: 'Ej: Alta demanda en la zona, poca competencia, tendencia en redes…',
    tip: '¿Qué tendencias nos favorecen? ¿Qué necesidades podemos cubrir?',
  },
  {
    id: 'e_debilidades' as const,
    label: 'Debilidades',
    icon: '⚠️',
    color: '#f59e0b',
    ph: 'Ej: Poca experiencia, capital limitado, sin local propio…',
    tip: '¿Qué debemos mejorar? ¿Qué nos falta actualmente?',
  },
  {
    id: 'e_amenazas' as const,
    label: 'Amenazas',
    icon: '🔴',
    color: '#ef4444',
    ph: 'Ej: Competidores grandes, suba de precios de insumos…',
    tip: '¿Qué puede perjudicarnos? ¿Qué riesgos existen en el mercado?',
  },
]

// ── Tag chip input ────────────────────────────────────────────────
function TagInput({
  items, onAdd, onRemove, placeholder, color, disabled, maxItems = 8,
}: {
  items: string[]
  onAdd: (v: string) => void
  onRemove: (i: number) => void
  placeholder: string
  color: string
  disabled: boolean
  maxItems?: number
}) {
  const [draft, setDraft] = useState('')

  function commit() {
    const v = draft.trim()
    if (!v || items.includes(v) || items.length >= maxItems) return
    onAdd(v)
    setDraft('')
  }

  return (
    <div>
      {items.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {items.map((item, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 99,
                background: `${color}18`, border: `1px solid ${color}35`,
                fontSize: '0.82rem', color: 'var(--text)',
              }}
            >
              {item}
              {!disabled && (
                <button
                  onClick={() => onRemove(i)}
                  title="Eliminar"
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 16, height: 16, borderRadius: '50%',
                    background: `${color}30`, border: 'none', cursor: 'pointer',
                    color, fontSize: '0.75rem', fontWeight: 700, lineHeight: 1, padding: 0,
                  }}
                >×</button>
              )}
            </span>
          ))}
        </div>
      )}
      {!disabled && items.length < maxItems && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
            placeholder={placeholder}
            style={{
              flex: 1, padding: '7px 12px', fontSize: '0.85rem',
              background: `${color}08`, border: `1px dashed ${color}50`,
              borderRadius: 8, outline: 'none', color: 'var(--text)',
            }}
          />
          <button
            onClick={commit}
            style={{
              background: `${color}20`, border: `1px solid ${color}40`,
              borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 600, color,
            }}
          >
            + Agregar
          </button>
        </div>
      )}
      {!disabled && items.length >= maxItems && (
        <p style={{ fontSize: '0.78rem', color: 'var(--text3)', margin: 0 }}>
          Máximo {maxItems} ítems alcanzado.
        </p>
      )}
    </div>
  )
}

// ── Char-counter textarea ─────────────────────────────────────────
function TextAreaCounter({
  value, onChange, placeholder, helper, max, disabled, rows = 3,
}: {
  value: string; onChange: (v: string) => void; placeholder: string
  helper?: string; max: number; disabled: boolean; rows?: number
}) {
  const len = value.length
  const pct = len / max
  const counterColor = pct > 0.9 ? '#ef4444' : pct > 0.75 ? '#f59e0b' : 'var(--text3)'
  return (
    <div>
      <div style={{ position: 'relative' }}>
        <textarea
          value={value}
          onChange={e => onChange(e.target.value.slice(0, max))}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={value ? 'filled' : ''}
          style={{ width: '100%', boxSizing: 'border-box', paddingBottom: 28, resize: 'vertical' }}
        />
        <span style={{ position: 'absolute', bottom: 8, right: 12, fontSize: '0.73rem', color: counterColor, pointerEvents: 'none', fontWeight: 500 }}>
          {len}/{max}
        </span>
      </div>
      {helper && <p style={{ fontSize: '0.78rem', color: 'var(--text3)', margin: '4px 0 0' }}>{helper}</p>}
    </div>
  )
}

// ── Progress header ───────────────────────────────────────────────
function SectionHeader({ pct }: { pct: number }) {
  const color = pct >= 80 ? '#22c55e' : pct >= 40 ? '#7c6af7' : '#94a3b8'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
          🎯 Gestión Estratégica
          <span style={{ background: 'rgba(247,162,106,0.15)', color: 'var(--accent2)', border: '1px solid rgba(247,162,106,0.25)', borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600 }}>
            Paso 2
          </span>
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text3)', margin: '6px 0 0' }}>
          Misión, visión, propuesta de valor, objetivos y análisis FODA.
        </p>
      </div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 18px', minWidth: 180, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>Completitud</p>
          <div style={{ height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
          </div>
        </div>
        <span style={{ fontSize: '1.15rem', fontWeight: 700, color }}>{pct}%</span>
      </div>
    </div>
  )
}

// ── Block card wrapper ────────────────────────────────────────────
function Bloque({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: '1.25rem 1.5rem', marginBottom: 20 }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, margin: '0 0 2px', color: 'var(--text)' }}>{title}</p>
      {subtitle && <p style={{ fontSize: '0.83rem', color: 'var(--text3)', margin: '0 0 18px' }}>{subtitle}</p>}
      {!subtitle && <div style={{ marginBottom: 18 }} />}
      {children}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function PageEstrategica() {
  const { form, setField, estado, setEstado, perfil } = useStore()
  const isProfesor = perfil?.rol === 'profesor'
  const completeness = calcCompleteness(form, estado.secciones_aprobadas ?? [])
  const pct = completeness.estrategica

  const addToField = useCallback((id: keyof DatosForm, value: string) => {
    const current = toItems(form[id] as string)
    if (!current.includes(value)) setField(id, fromItems([...current, value]))
  }, [form, setField])

  const removeFromField = useCallback((id: keyof DatosForm, index: number) => {
    const current = toItems(form[id] as string)
    setField(id, fromItems(current.filter((_, i) => i !== index)))
  }, [form, setField])

  const valores = estado.valores ?? []

  const addValor = useCallback((v: string) => {
    if (valores.length >= 6 || valores.includes(v)) return
    setEstado({ valores: [...valores, v] })
  }, [valores, setEstado])

  const removeValor = useCallback((i: number) => {
    setEstado({ valores: valores.filter((_, idx) => idx !== i) })
  }, [valores, setEstado])

  const sugeridosDisponibles = VALORES_SUGERIDOS.filter(v => !valores.includes(v))

  return (
    <div>
      <SectionHeader pct={pct} />

      {/* Misión y Visión */}
      <Bloque title="🧭 Misión y Visión" subtitle="La base filosófica del emprendimiento">
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
            Misión <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <TextAreaCounter
            value={form.e_mision}
            onChange={v => setField('e_mision', v)}
            placeholder="¿Qué hacemos, para quién y cómo lo hacemos?"
            helper="Describí el propósito actual: qué ofrecés, a quién va dirigido y qué los hace únicos."
            max={MISION_MAX}
            disabled={isProfesor}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
            Visión <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <TextAreaCounter
            value={form.e_vision}
            onChange={v => setField('e_vision', v)}
            placeholder="¿Dónde queremos estar en 3 a 5 años?"
            helper="Describí el futuro deseado del emprendimiento. Debe ser ambiciosa pero alcanzable."
            max={VISION_MAX}
            disabled={isProfesor}
          />
        </div>
      </Bloque>

      {/* Propuesta de valor */}
      <Bloque title="💡 Propuesta de Valor" subtitle="¿Por qué te van a elegir a vos y no a la competencia?">
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
          Propuesta de valor <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <TextAreaCounter
          value={form.e_propuesta_valor}
          onChange={v => setField('e_propuesta_valor', v)}
          placeholder="Ej: Ofrecemos desayunos veganos a domicilio en menos de 30 min, con ingredientes locales, para personas que cuidan su alimentación y no tienen tiempo de cocinar."
          helper="Combiná: quién sos + qué problema resolvés + para quién + qué te diferencia de la competencia."
          max={400}
          disabled={isProfesor}
          rows={4}
        />
      </Bloque>

      {/* Objetivos */}
      <Bloque title="🎯 Objetivos" subtitle="Metas concretas para los primeros 6–12 meses — agregá cada objetivo por separado">
        <TagInput
          items={toItems(form.e_objetivos)}
          onAdd={v => addToField('e_objetivos', v)}
          onRemove={i => removeFromField('e_objetivos', i)}
          placeholder="Ej: Lograr 50 ventas en el primer mes (Enter para agregar)"
          color="#7c6af7"
          disabled={isProfesor}
          maxItems={8}
        />
        <p style={{ fontSize: '0.78rem', color: 'var(--text3)', margin: '10px 0 0' }}>
          Los objetivos deben ser <strong>SMART</strong>: Específicos, Medibles, Alcanzables, Relevantes y con Tiempo definido.
        </p>
      </Bloque>

      {/* Valores */}
      <Bloque title="⭐ Valores del emprendimiento" subtitle="Elegí hasta 6 valores que guíen las decisiones del equipo">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: valores.length > 0 ? 14 : 6 }}>
          {valores.map((v, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 14px', borderRadius: 99,
              background: 'rgba(124,106,247,0.15)', border: '1px solid rgba(124,106,247,0.35)',
              fontSize: '0.83rem', fontWeight: 600, color: '#7c6af7',
            }}>
              {v}
              {!isProfesor && (
                <button
                  onClick={() => removeValor(i)}
                  style={{
                    background: 'rgba(124,106,247,0.25)', border: 'none', borderRadius: '50%',
                    width: 16, height: 16, cursor: 'pointer', color: '#7c6af7',
                    fontSize: '0.75rem', fontWeight: 700, padding: 0,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >×</button>
              )}
            </span>
          ))}
          {valores.length === 0 && (
            <p style={{ fontSize: '0.83rem', color: 'var(--text3)', margin: 0 }}>Ningún valor seleccionado todavía.</p>
          )}
        </div>
        {!isProfesor && valores.length < 6 && (
          <>
            <p style={{ fontSize: '0.78rem', color: 'var(--text3)', margin: '0 0 8px' }}>Hacé clic para agregar:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {sugeridosDisponibles.map(v => (
                <button
                  key={v}
                  onClick={() => addValor(v)}
                  style={{
                    padding: '4px 12px', borderRadius: 99, cursor: 'pointer',
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    fontSize: '0.8rem', color: 'var(--text2)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,106,247,0.5)'; (e.currentTarget as HTMLButtonElement).style.color = '#7c6af7' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text2)' }}
                >
                  {v}
                </button>
              ))}
            </div>
          </>
        )}
      </Bloque>

      {/* FODA */}
      <Bloque title="⚡ Análisis FODA" subtitle="Agregá cada ítem por separado para visualizarlos como lista organizada">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {FODA.map(f => (
            <div
              key={f.id}
              style={{
                background: `${f.color}08`, border: `1px solid ${f.color}25`,
                borderRadius: 14, padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: '1rem' }}>{f.icon}</span>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: f.color }}>{f.label}</span>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text3)', margin: '0 0 10px' }}>{f.tip}</p>
              <TagInput
                items={toItems(form[f.id])}
                onAdd={v => addToField(f.id, v)}
                onRemove={i => removeFromField(f.id, i)}
                placeholder={f.ph}
                color={f.color}
                disabled={isProfesor}
              />
            </div>
          ))}
        </div>
      </Bloque>

      <FeedbackPanel section="estrategica" />
    </div>
  )
}
