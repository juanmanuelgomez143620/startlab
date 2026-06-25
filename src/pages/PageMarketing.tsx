import { useStore } from '../store/useStore'
import { FeedbackPanel } from '../components/FeedbackPanel'
import { calcCompleteness, calcPrecioVenta, fmt, n } from '../lib/calculos'
import type { Competidor } from '../types'

// ── data ─────────────────────────────────────────────────────────
const CANALES_OPCIONES = [
  { id: 'Venta directa', icon: '🤝', desc: 'Puerta a puerta, cara a cara' },
  { id: 'Local físico', icon: '🏪', desc: 'Tienda, kiosco o stand' },
  { id: 'WhatsApp', icon: '💬', desc: 'Pedidos por mensaje' },
  { id: 'Instagram / Facebook', icon: '📱', desc: 'Ventas por redes sociales' },
  { id: 'Ferias y mercados', icon: '🏕️', desc: 'Eventos y puestos temporales' },
  { id: 'Tienda online', icon: '🛒', desc: 'Web, Mercado Libre, TiendaNube…' },
  { id: 'Boca en boca', icon: '👥', desc: 'Referidos y recomendaciones' },
]

const REDES_OPCIONES = [
  { id: 'Instagram', icon: '📸' },
  { id: 'Facebook', icon: '🔵' },
  { id: 'TikTok', icon: '🎵' },
  { id: 'WhatsApp Business', icon: '💬' },
  { id: 'YouTube', icon: '▶️' },
  { id: 'Twitter / X', icon: '🐦' },
  { id: 'LinkedIn', icon: '💼' },
]

const CUATRO_P = [
  {
    id: 'm_producto' as const, icon: '📦', label: 'Producto',
    ph: '¿Qué ofrecés? ¿Cómo se llama? ¿Qué lo diferencia?\nEj: Alfajores artesanales de chocolate sin TACC, rellenos de dulce de leite casero.',
  },
  {
    id: 'm_precio_mix' as const, icon: '💰', label: 'Precio',
    ph: '¿Cómo definís el precio? ¿Estrategia: bajo, premium, competitivo?\nEj: Precio alineado con el mercado local pero con diferenciación por calidad artesanal.',
  },
  {
    id: 'm_plaza' as const, icon: '🗺️', label: 'Plaza (Distribución)',
    ph: '¿Dónde y cómo llegás al cliente?\nEj: Venta en ferias del barrio, entrega a domicilio por WhatsApp en radio de 5 km.',
  },
  {
    id: 'm_promocion' as const, icon: '📢', label: 'Promoción',
    ph: '¿Cómo comunicás tu producto?\nEj: Instagram con fotos de productos, historias diarias, descuento del 10% al primer pedido.',
  },
]

// ── helpers ───────────────────────────────────────────────────────
function splitCSV(s: string) { return s.split(',').map(v => v.trim()).filter(Boolean) }
function joinCSV(arr: string[]) { return arr.join(', ') }

// ── sub-components ────────────────────────────────────────────────
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
      {text} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
  )
}

export default function PageMarketing() {
  const { form, setField, estado, setEstado, perfil } = useStore()
  const isProfesor = perfil?.rol === 'profesor'
  const completeness = calcCompleteness(form, estado.secciones_aprobadas ?? [])
  const pct = completeness.marketing
  const color = pct >= 80 ? '#22c55e' : pct >= 40 ? '#22a0f7' : '#94a3b8'

  // Canal multi-select
  const selectedCanales = splitCSV(form.m_canal)
  function toggleCanal(canal: string) {
    if (isProfesor) return
    const next = selectedCanales.includes(canal)
      ? selectedCanales.filter(c => c !== canal)
      : [...selectedCanales, canal]
    setField('m_canal', joinCSV(next))
  }

  // Redes sociales multi-select
  const redes = estado.redes_sociales ?? []
  function toggleRed(red: string) {
    if (isProfesor) return
    const next = redes.includes(red) ? redes.filter(r => r !== red) : [...redes, red]
    setEstado({ redes_sociales: next })
  }

  // Competidores
  function addComp() {
    if (isProfesor) return
    setEstado({ competidores: [...estado.competidores, { id: Date.now(), nombre: '', producto: '', precio: '', fortaleza: '', debilidad: '', ventaja: '' }] })
  }
  function removeComp(id: number) {
    if (isProfesor) return
    setEstado({ competidores: estado.competidores.filter(c => c.id !== id) })
  }
  function updateComp(id: number, field: keyof Competidor, value: string) {
    if (isProfesor) return
    setEstado({ competidores: estado.competidores.map(c => c.id === id ? { ...c, [field]: value } : c) })
  }

  // Precio
  function handleCostoChange(v: string) {
    setField('m_costo_unit', v)
    const pv = calcPrecioVenta(n(v), n(form.m_margen))
    if (pv > 0) setField('m_precio_venta', String(pv))
  }
  function handleMargenChange(v: string) {
    setField('m_margen', v)
    const pv = calcPrecioVenta(n(form.m_costo_unit), n(v))
    if (pv > 0) setField('m_precio_venta', String(pv))
  }

  const costo = n(form.m_costo_unit)
  const precioVenta = n(form.m_precio_venta)
  const ganancia = precioVenta - costo
  const costoPct = precioVenta > 0 ? Math.round((costo / precioVenta) * 100) : 0
  const gananciaPct = 100 - costoPct

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            📣 Gestión de Marketing
            <span style={{ background: 'rgba(106,247,184,0.15)', color: 'var(--accent3)', border: '1px solid rgba(106,247,184,0.25)', borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600 }}>Paso 3</span>
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text3)', margin: '6px 0 0' }}>Clientes, canales, competencia, estrategia y precio.</p>
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

      {/* Segmentación */}
      <Bloque title="🎯 Segmentación de Mercado" subtitle="¿Quiénes son tus clientes objetivo?">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <Label text="Segmento principal" required />
            <input
              value={form.m_segmento}
              onChange={e => setField('m_segmento', e.target.value)}
              placeholder="Ej: Mujeres de 25–45 años, clase media, zona urbana"
              className={form.m_segmento ? 'filled' : ''}
              disabled={isProfesor}
            />
            <p style={{ fontSize: '0.78rem', color: 'var(--text3)', margin: '4px 0 0' }}>Edad, género, nivel socioeconómico y zona.</p>
          </div>
          <div>
            <Label text="Tamaño estimado del mercado" />
            <input
              value={form.m_zona}
              onChange={e => setField('m_zona', e.target.value)}
              placeholder="Ej: 5.000 familias en Wanda y alrededores"
              disabled={isProfesor}
            />
            <p style={{ fontSize: '0.78rem', color: 'var(--text3)', margin: '4px 0 0' }}>¿Cuántas personas podrían comprarte?</p>
          </div>
        </div>
        <Label text="Perfil detallado del consumidor" required />
        <textarea
          value={form.m_perfil}
          onChange={e => setField('m_perfil', e.target.value)}
          placeholder="¿Qué necesita tu cliente? ¿Dónde compra? ¿Cuánto puede gastar? ¿Qué valora más? ¿Cuáles son sus hábitos?"
          className={form.m_perfil ? 'filled' : ''}
          disabled={isProfesor}
          rows={3}
        />
      </Bloque>

      {/* Canales de venta */}
      <Bloque title="🛒 Canales de Venta" subtitle="¿Cómo llega tu producto al cliente? Podés seleccionar más de uno.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {CANALES_OPCIONES.map(c => {
            const selected = selectedCanales.includes(c.id)
            return (
              <button
                key={c.id}
                onClick={() => toggleCanal(c.id)}
                disabled={isProfesor}
                style={{
                  padding: '12px 10px', borderRadius: 12, cursor: isProfesor ? 'default' : 'pointer',
                  border: selected ? '2px solid #22a0f7' : '1px solid var(--border)',
                  background: selected ? 'rgba(34,160,247,0.1)' : 'var(--bg)',
                  textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{c.icon}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: selected ? '#22a0f7' : 'var(--text)', marginBottom: 2 }}>{c.id}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text3)' }}>{c.desc}</div>
              </button>
            )
          })}
        </div>
        {selectedCanales.length === 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text3)', margin: '10px 0 0' }}>Seleccioná al menos un canal de venta.</p>
        )}
        {selectedCanales.length > 0 && (
          <p style={{ fontSize: '0.8rem', color: '#22a0f7', margin: '10px 0 0', fontWeight: 500 }}>
            ✓ Canales: {selectedCanales.join(' · ')}
          </p>
        )}
      </Bloque>

      {/* Redes sociales */}
      <Bloque title="📱 Redes Sociales" subtitle="¿En qué plataformas va a estar presente tu emprendimiento?">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          {REDES_OPCIONES.map(r => {
            const selected = redes.includes(r.id)
            return (
              <button
                key={r.id}
                onClick={() => toggleRed(r.id)}
                disabled={isProfesor}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 16px', borderRadius: 99,
                  border: selected ? '2px solid #7c6af7' : '1px solid var(--border)',
                  background: selected ? 'rgba(124,106,247,0.12)' : 'var(--bg)',
                  cursor: isProfesor ? 'default' : 'pointer',
                  fontSize: '0.85rem', fontWeight: selected ? 600 : 400,
                  color: selected ? '#7c6af7' : 'var(--text2)',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '1rem' }}>{r.icon}</span> {r.id}
              </button>
            )
          })}
        </div>
        {redes.length > 0 && (
          <div>
            <Label text="¿Qué tipo de contenido van a publicar?" />
            <textarea
              value={form.m_promocion}
              onChange={e => setField('m_promocion', e.target.value)}
              placeholder={`Ej: En ${redes[0]} publicamos fotos del proceso de producción, recetas, reseñas de clientes y ofertas especiales los viernes.`}
              className={form.m_promocion ? 'filled' : ''}
              disabled={isProfesor}
              rows={3}
            />
          </div>
        )}
      </Bloque>

      {/* Competidores */}
      <Bloque title="🏆 Análisis de Competidores" subtitle="Conocé a tu competencia para diferenciarte mejor">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {estado.competidores.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', fontSize: '0.88rem' }}>
              No hay competidores cargados todavía.{!isProfesor && ' Agregá al menos uno para identificar tu diferencial.'}
            </div>
          )}
          {estado.competidores.map((c, idx) => (
            <div key={c.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text3)' }}>Competidor {idx + 1}</span>
                {!isProfesor && (
                  <button
                    onClick={() => removeComp(c.id)}
                    style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '3px 10px', cursor: 'pointer', fontSize: '0.78rem', color: '#ef4444' }}
                  >
                    Eliminar
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <Label text="Nombre" />
                  <input value={c.nombre} onChange={e => updateComp(c.id, 'nombre', e.target.value)} placeholder="Ej: Alfajores Don Juan" disabled={isProfesor} />
                </div>
                <div>
                  <Label text="Producto / Servicio" />
                  <input value={c.producto} onChange={e => updateComp(c.id, 'producto', e.target.value)} placeholder="Ej: Alfajores de maicena" disabled={isProfesor} />
                </div>
                <div>
                  <Label text="Precio aproximado" />
                  <input value={c.precio} onChange={e => updateComp(c.id, 'precio', e.target.value)} placeholder="Ej: $500 c/u" disabled={isProfesor} />
                </div>
                <div>
                  <Label text="Su fortaleza" />
                  <input value={c.fortaleza} onChange={e => updateComp(c.id, 'fortaleza', e.target.value)} placeholder="Ej: Reconocimiento de marca" disabled={isProfesor} />
                </div>
                <div>
                  <Label text="Su debilidad" />
                  <input value={c.debilidad} onChange={e => updateComp(c.id, 'debilidad', e.target.value)} placeholder="Ej: No tiene opciones sin gluten" disabled={isProfesor} />
                </div>
                <div>
                  <Label text="Nuestra ventaja frente a ellos" />
                  <input
                    value={c.ventaja ?? ''}
                    onChange={e => updateComp(c.id, 'ventaja', e.target.value)}
                    placeholder="Ej: Ofrecemos versión sin TACC y entrega a domicilio"
                    disabled={isProfesor}
                    style={{ borderColor: 'rgba(34,160,247,0.35)' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        {!isProfesor && (
          <button
            onClick={addComp}
            style={{ marginTop: 14, background: 'var(--bg)', border: '1px dashed var(--border)', borderRadius: 10, padding: '8px 18px', color: 'var(--text2)', fontSize: '0.85rem', cursor: 'pointer', width: '100%' }}
          >
            + Agregar competidor
          </button>
        )}
      </Bloque>

      {/* 4P */}
      <Bloque title="🔀 Marketing Mix — Las 4P" subtitle="Definí tu estrategia comercial completa">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {CUATRO_P.map(p => (
            <div key={p.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: '1.4rem' }}>{p.icon}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent2)' }}>{p.label}</span>
              </div>
              <textarea
                value={form[p.id]}
                onChange={e => setField(p.id, e.target.value)}
                placeholder={p.ph}
                className={form[p.id] ? 'filled' : ''}
                disabled={isProfesor}
                rows={4}
              />
            </div>
          ))}
        </div>
      </Bloque>

      {/* Precio */}
      <Bloque title="💲 Precio Estimado" subtitle="Calculá el precio de venta en base al costo y el margen de ganancia deseado">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <Label text="Costo unitario ($)" required />
            <input type="number" value={form.m_costo_unit} onChange={e => handleCostoChange(e.target.value)} placeholder="0.00" disabled={isProfesor} />
            <p style={{ fontSize: '0.78rem', color: 'var(--text3)', margin: '4px 0 0' }}>Materiales + mano de obra por unidad.</p>
          </div>
          <div>
            <Label text="Margen de ganancia (%)" />
            <input type="number" value={form.m_margen} onChange={e => handleMargenChange(e.target.value)} placeholder="30" disabled={isProfesor} />
          </div>
          <div>
            <Label text="Precio de venta sugerido ($)" />
            <input
              type="number"
              value={form.m_precio_venta}
              onChange={e => setField('m_precio_venta', e.target.value)}
              placeholder="Calculado automáticamente"
              readOnly={!!form.m_costo_unit || isProfesor}
              disabled={isProfesor}
              style={{ borderColor: 'rgba(106,247,184,0.4)', color: 'var(--accent3)' }}
            />
          </div>
        </div>

        {/* Visual breakdown bar */}
        {precioVenta > 0 && costo > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: `${costoPct}%`, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 32 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>{costoPct}%</span>
              </div>
              <div style={{ flex: 1, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 32 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>{gananciaPct}%</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20, fontSize: '0.82rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444', display: 'inline-block' }} />
                Costo: <strong>${fmt(costo)}</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e', display: 'inline-block' }} />
                Ganancia: <strong>${fmt(ganancia)}</strong>
              </span>
              <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--accent3)' }}>
                Precio final: ${fmt(precioVenta)}
              </span>
            </div>
          </div>
        )}
      </Bloque>

      <FeedbackPanel section="marketing" />
    </div>
  )
}
