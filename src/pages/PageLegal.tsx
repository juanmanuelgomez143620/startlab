import { useState } from 'react'
import { FeedbackPanel } from '../components/FeedbackPanel'
import { useStore } from '../store/useStore'
import { calcCompleteness } from '../lib/calculos'

// ── Data ──────────────────────────────────────────────────────────
const FORMAS_INFO = [
  { id: 'Emprendimiento estudiantil (sin personería aún)', icon: '🎓', desc: 'Ideal para proyectos escolares. Sin obligaciones tributarias formales todavía.', tag: 'Recomendado para escuela', tagColor: '#22c55e' },
  { id: 'Monotributista / Autónomo', icon: '👤', desc: 'Para un solo emprendedor. Fácil de dar de alta con límite de facturación anual.', tag: null, tagColor: '' },
  { id: 'Sociedad de Hecho', icon: '🤝', desc: 'Para 2 o más personas sin contrato formal. Responsabilidad solidaria entre socios.', tag: null, tagColor: '' },
  { id: 'SAS (Sociedad por Acciones Simplificada)', icon: '🏢', desc: 'Sociedad moderna y ágil de crear online. Responsabilidad limitada al capital aportado.', tag: 'Ideal para escalar', tagColor: '#7c6af7' },
  { id: 'SRL (Sociedad de Responsabilidad Limitada)', icon: '⚖️', desc: 'Clásica para pequeñas empresas. Más requisitos formales pero responsabilidad limitada.', tag: null, tagColor: '' },
  { id: 'Cooperativa', icon: '🌱', desc: 'Organización democrática. Los trabajadores son los dueños y deciden en igualdad.', tag: null, tagColor: '' },
]

const IMPOSITIVOS_INFO = [
  { id: 'No aplica (proyecto escolar)', info: 'Para proyectos educativos sin facturación real. No hay obligaciones tributarias.' },
  { id: 'Monotributo Categoría A', info: 'Hasta ~$2.900.000 anuales de ingresos. Cuota fija mensual (~$20.000). Un solo pago unifica Ganancias, IVA y Jubilación.' },
  { id: 'Monotributo Categoría B', info: 'Hasta ~$4.100.000 anuales. Cuota mensual mayor. Incluye cobertura de obra social.' },
  { id: 'Monotributo Categoría C', info: 'Hasta ~$5.700.000 anuales. Para negocios en crecimiento. Límites actualizados por AFIP.' },
  { id: 'Responsable Inscripto', info: 'Sin límite de facturación. Se paga IVA, Ganancias y autónomos por separado. Mayor carga administrativa.' },
]

interface TramiteInfo {
  id: string
  nombre: string
  desc: string
  organismo: string
  tiempo: string
  costo: string
  escolar: boolean // ¿Es relevante para un proyecto escolar real?
  nivel: 'Nacional' | 'Provincial' | 'Municipal'
  nivelColor: string
}

const TRAMITES: TramiteInfo[] = [
  // Nacional
  { id: 'cuit', nombre: 'Obtención de CUIT', desc: 'Clave Única de Identificación Tributaria — necesaria para facturar.', organismo: 'AFIP — afip.gob.ar', tiempo: '1–5 días hábiles', costo: 'Gratuito', escolar: false, nivel: 'Nacional', nivelColor: '#3b82f6' },
  { id: 'mono', nombre: 'Inscripción en Monotributo', desc: 'Alta en el Régimen Simplificado para pequeños contribuyentes.', organismo: 'AFIP — portal Mi AFIP', tiempo: 'Inmediato (online)', costo: 'Gratuito — cuota mensual luego', escolar: false, nivel: 'Nacional', nivelColor: '#3b82f6' },
  { id: 'afip', nombre: 'Alta en portal Mi AFIP', desc: 'Registro digital para gestionar declaraciones, facturas y pagos.', organismo: 'AFIP — afip.gob.ar', tiempo: 'Inmediato', costo: 'Gratuito', escolar: true, nivel: 'Nacional', nivelColor: '#3b82f6' },
  { id: 'banco', nombre: 'Apertura de cuenta / CVU', desc: 'Cuenta para recibir cobros y manejar fondos del emprendimiento.', organismo: 'Banco o Fintech (Mercado Pago, Ualá, etc.)', tiempo: '1 día', costo: 'Gratuito en muchas opciones', escolar: true, nivel: 'Nacional', nivelColor: '#3b82f6' },
  { id: 'marca', nombre: 'Registro de Marca (INPI)', desc: 'Protección del nombre y logo ante el Instituto de la Propiedad Industrial.', organismo: 'INPI — inpi.gob.ar', tiempo: '12–24 meses', costo: '~$60.000 por clase', escolar: false, nivel: 'Nacional', nivelColor: '#3b82f6' },
  // Provincial
  { id: 'ing_brutos', nombre: 'Inscripción en Ingresos Brutos', desc: 'Registro en Rentas de la provincia para tributar sobre los ingresos brutos.', organismo: 'DGR Misiones — dgrmisiones.gob.ar', tiempo: '1–3 días', costo: 'Gratuito', escolar: false, nivel: 'Provincial', nivelColor: '#8b5cf6' },
  { id: 'rentas', nombre: 'Alta en DGR Misiones', desc: 'Tramitar usuario, declarar actividad y conocer las alícuotas aplicables.', organismo: 'Dirección General de Rentas, Misiones', tiempo: '1–5 días', costo: 'Gratuito', escolar: false, nivel: 'Provincial', nivelColor: '#8b5cf6' },
  { id: 'habilitacion_prov', nombre: 'Habilitación Provincial (si aplica)', desc: 'Obligatorio para rubros regulados: alimentos, salud, educación.', organismo: 'Ministerio correspondiente, Misiones', tiempo: '15–60 días', costo: 'Variable según actividad', escolar: false, nivel: 'Provincial', nivelColor: '#8b5cf6' },
  // Municipal
  { id: 'hab_mun', nombre: 'Habilitación Municipal del Local', desc: 'Trámite en la Municipalidad para habilitar el espacio de producción o atención.', organismo: 'Municipalidad local (Ej: Puerto Iguazú, Posadas)', tiempo: '10–30 días', costo: 'Variable por municipio', escolar: false, nivel: 'Municipal', nivelColor: '#f59e0b' },
  { id: 'libre_deuda', nombre: 'Certificado de Libre Deuda', desc: 'Acredita que no hay deudas pendientes con la municipalidad.', organismo: 'Municipalidad local', tiempo: '1–3 días', costo: 'Pequeño arancel', escolar: false, nivel: 'Municipal', nivelColor: '#f59e0b' },
  { id: 'bromatologia', nombre: 'Habilitación Bromatológica', desc: 'Obligatorio para emprendimientos de alimentos y bebidas.', organismo: 'Área de Bromatología Municipal', tiempo: '15–45 días', costo: '~$15.000–$50.000', escolar: true, nivel: 'Municipal', nivelColor: '#f59e0b' },
  { id: 'patente', nombre: 'Patente Comercial', desc: 'Tasa anual por actividad comercial en el municipio.', organismo: 'Municipalidad local', tiempo: '1–5 días', costo: 'Variable por actividad y municipio', escolar: false, nivel: 'Municipal', nivelColor: '#f59e0b' },
]

// ── Sub-components ────────────────────────────────────────────────
function InfoBox({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: 12 }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(124,106,247,0.08)', border: '1px solid rgba(124,106,247,0.2)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: '0.8rem', color: '#7c6af7', fontWeight: 600 }}>
        💡 {titulo} {open ? '▲' : '▼'}
      </button>
      {open && (
        <div style={{ marginTop: 8, background: 'rgba(124,106,247,0.05)', border: '1px solid rgba(124,106,247,0.15)', borderRadius: 10, padding: '14px 16px', fontSize: '0.84rem', color: 'var(--text2)', lineHeight: 1.65 }}>
          {children}
        </div>
      )}
    </div>
  )
}

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

// ── Main ──────────────────────────────────────────────────────────
export default function PageLegal() {
  const { form, setField, estado, setEstado, perfil } = useStore()
  const isProfesor = perfil?.rol === 'profesor'
  const completeness = calcCompleteness(form, estado.secciones_aprobadas ?? [])
  const pct = completeness.legal
  const headerColor = pct >= 80 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#94a3b8'

  const [expandedTramite, setExpandedTramite] = useState<string | null>(null)

  function toggle(id: string) {
    if (isProfesor) return
    setEstado({ tramitesDone: { ...estado.tramitesDone, [id]: !estado.tramitesDone[id] } })
  }

  const doneCount  = TRAMITES.filter(t => estado.tramitesDone[t.id]).length
  const totalCount = TRAMITES.length

  const formaActual    = FORMAS_INFO.find(f => f.id === form.l_forma)
  const impositivoInfo = IMPOSITIVOS_INFO.find(i => i.id === form.l_impositivo)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            ⚖️ Gestión Legal e Impositiva
            <span style={{ background: 'rgba(247,162,106,0.15)', color: 'var(--accent2)', border: '1px solid rgba(247,162,106,0.25)', borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600 }}>Paso 6</span>
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text3)', margin: '6px 0 0' }}>Estructura legal, régimen impositivo y trámites de habilitación.</p>
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

      {/* Resumen actual */}
      {(formaActual || impositivoInfo) && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          {formaActual && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 180 }}>
              <span style={{ fontSize: '1.5rem' }}>{formaActual.icon}</span>
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Forma jurídica</p>
                <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', margin: '2px 0 0' }}>{formaActual.id}</p>
              </div>
            </div>
          )}
          {impositivoInfo && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 180 }}>
              <span style={{ fontSize: '1.5rem' }}>🧾</span>
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Régimen impositivo</p>
                <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', margin: '2px 0 0' }}>{form.l_impositivo}</p>
              </div>
            </div>
          )}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
            <span style={{ fontSize: '1.5rem' }}>✅</span>
            <div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Trámites completados</p>
              <p style={{ fontSize: '0.88rem', fontWeight: 600, color: doneCount > 0 ? '#22c55e' : 'var(--text)', margin: '2px 0 0' }}>{doneCount} de {totalCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Forma jurídica */}
      <Bloque title="🗂️ Forma Jurídica" subtitle="Definí la estructura legal del emprendimiento. Para proyectos escolares, la primera opción es la más común.">
        <InfoBox titulo="¿Qué forma jurídica elegir?">
          <p style={{ margin: 0 }}>La forma jurídica define <b>quiénes son los responsables legales</b> del emprendimiento y cuánto arriesgan. Para un proyecto escolar que aún no factura, la opción «Emprendimiento estudiantil» es siempre la correcta.</p>
          <p style={{ margin: '8px 0 0' }}>Si el proyecto tiene proyección real a futuro, la <b>SAS</b> es la forma más moderna y fácil de crear en Argentina (se hace online en 24 horas).</p>
        </InfoBox>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {FORMAS_INFO.map(f => {
            const sel = form.l_forma === f.id
            return (
              <button
                key={f.id}
                onClick={() => !isProfesor && setField('l_forma', f.id)}
                disabled={isProfesor}
                style={{
                  padding: '14px 12px', borderRadius: 14, cursor: isProfesor ? 'default' : 'pointer',
                  border: sel ? '2px solid #f59e0b' : '1px solid var(--border)',
                  background: sel ? 'rgba(245,158,11,0.08)' : 'var(--bg)',
                  textAlign: 'left', transition: 'all 0.15s', position: 'relative',
                }}
              >
                {f.tag && (
                  <span style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: `${f.tagColor}20`, color: f.tagColor, border: `1px solid ${f.tagColor}40` }}>
                    {f.tag}
                  </span>
                )}
                <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{f.icon}</div>
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: sel ? '#f59e0b' : 'var(--text)', margin: '0 0 4px', paddingRight: f.tag ? 8 : 0 }}>{f.id}</p>
                <p style={{ fontSize: '0.74rem', color: 'var(--text3)', margin: 0, lineHeight: 1.4 }}>{f.desc}</p>
              </button>
            )
          })}
        </div>
      </Bloque>

      {/* Régimen impositivo */}
      <Bloque title="🧾 Régimen Impositivo" subtitle="¿Bajo qué régimen tributario va a operar el emprendimiento?">
        <InfoBox titulo="¿Qué es el régimen impositivo y cuál elegir?">
          <p style={{ margin: '0 0 8px' }}>Define cómo y cuánto va a pagar el emprendimiento en impuestos. Para un proyecto escolar que aún no vende, elegí <b>"No aplica"</b>.</p>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li><b>Monotributo:</b> Un solo pago mensual que unifica IVA, Ganancias y Jubilación. Tiene categorías (A, B, C…) según los ingresos anuales. Fácil y económico para emprendedores.</li>
            <li><b>Responsable Inscripto:</b> Para negocios más grandes. Sin límite de facturación pero con mayor carga administrativa y contable.</li>
          </ul>
        </InfoBox>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {IMPOSITIVOS_INFO.map(imp => {
            const sel = form.l_impositivo === imp.id
            return (
              <button
                key={imp.id}
                onClick={() => !isProfesor && setField('l_impositivo', imp.id)}
                disabled={isProfesor}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 16px', borderRadius: 12, cursor: isProfesor ? 'default' : 'pointer',
                  border: sel ? '2px solid #7c6af7' : '1px solid var(--border)',
                  background: sel ? 'rgba(124,106,247,0.08)' : 'var(--bg)',
                  textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                  border: `2px solid ${sel ? '#7c6af7' : 'var(--border)'}`,
                  background: sel ? '#7c6af7' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {sel && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <div>
                  <p style={{ fontSize: '0.86rem', fontWeight: sel ? 700 : 500, color: sel ? '#7c6af7' : 'var(--text)', margin: 0 }}>{imp.id}</p>
                  <p style={{ fontSize: '0.77rem', color: 'var(--text3)', margin: '2px 0 0', lineHeight: 1.5 }}>{imp.info}</p>
                </div>
              </button>
            )
          })}
        </div>
      </Bloque>

      {/* Trámites */}
      <Bloque title="📋 Trámites de Habilitación" subtitle="Marcá los que ya realizaron o planean realizar. Hacé clic en cada uno para ver los detalles.">
        {/* Progress bar de trámites */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round((doneCount / totalCount) * 100)}%`, background: '#22c55e', borderRadius: 99, transition: 'width 0.4s ease' }} />
          </div>
          <span style={{ fontSize: '0.83rem', fontWeight: 600, color: doneCount > 0 ? '#22c55e' : 'var(--text3)', whiteSpace: 'nowrap' }}>
            {doneCount} / {totalCount} completados
          </span>
        </div>

        <InfoBox titulo="¿Todos estos trámites son obligatorios para mi proyecto?">
          <p style={{ margin: 0 }}>No necesariamente. Depende del tipo de emprendimiento, si tienen local físico, si venden alimentos y si ya están facturando realmente. Para un <b>proyecto escolar sin facturación</b>, los más relevantes son la cuenta bancaria/CVU, el alta en portal AFIP (para conocerlo) y la habilitación bromatológica si trabajan con alimentos.</p>
          <p style={{ margin: '8px 0 0' }}>Los ítem marcados con <b style={{ color: '#22c55e' }}>⭐ Escolar</b> son los más útiles para este tipo de proyecto.</p>
        </InfoBox>

        {/* Grouped by level */}
        {(['Nacional', 'Provincial', 'Municipal'] as const).map(nivel => {
          const nivelTramites = TRAMITES.filter(t => t.nivel === nivel)
          const nivelColor = nivelTramites[0]?.nivelColor || '#888'
          return (
            <div key={nivel} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ height: 1, flex: 1, background: `${nivelColor}30` }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: nivelColor, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  {nivel === 'Nacional' ? '🇦🇷' : nivel === 'Provincial' ? '🏛️' : '🏘️'} {nivel}
                </span>
                <div style={{ height: 1, flex: 1, background: `${nivelColor}30` }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {nivelTramites.map(t => {
                  const done     = !!estado.tramitesDone[t.id]
                  const expanded = expandedTramite === t.id
                  return (
                    <div key={t.id} style={{ background: done ? `${nivelColor}08` : 'var(--bg)', border: `1px solid ${done ? `${nivelColor}30` : 'var(--border)'}`, borderRadius: 12, overflow: 'hidden', transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', cursor: 'pointer' }} onClick={() => setExpandedTramite(expanded ? null : t.id)}>
                        {/* Checkbox */}
                        <div
                          onClick={e => { e.stopPropagation(); toggle(t.id) }}
                          style={{
                            width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: done ? '#22c55e' : 'transparent',
                            border: `2px solid ${done ? '#22c55e' : 'var(--border)'}`,
                            cursor: isProfesor ? 'default' : 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          {done && <span style={{ fontSize: '0.72rem', color: '#fff', fontWeight: 700 }}>✓</span>}
                        </div>
                        {/* Title + badges */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.86rem', fontWeight: done ? 500 : 600, color: done ? '#22c55e' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>
                              {t.nombre}
                            </span>
                            {t.escolar && (
                              <span style={{ fontSize: '0.67rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                                ⭐ Escolar
                              </span>
                            )}
                            <span style={{ fontSize: '0.67rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: `${nivelColor}14`, color: nivelColor, border: `1px solid ${nivelColor}30`, marginLeft: 'auto' }}>
                              {nivel}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text3)', margin: '2px 0 0' }}>{t.desc}</p>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text3)', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
                      </div>
                      {/* Expandable detail */}
                      {expanded && (
                        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px 14px', background: 'var(--bg3)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                          <div>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 3px' }}>Dónde hacerlo</p>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text)', margin: 0 }}>{t.organismo}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 3px' }}>Tiempo estimado</p>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text)', margin: 0 }}>{t.tiempo}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 3px' }}>Costo aproximado</p>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text)', margin: 0 }}>{t.costo}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </Bloque>

      {/* Notas */}
      <Bloque title="📝 Notas Legales" subtitle="Consultas realizadas, contactos de organismos, plazos, observaciones">
        <textarea
          value={form.l_notas}
          onChange={e => setField('l_notas', e.target.value)}
          placeholder="Ej: Consultamos al contador de la escuela sobre el CUIT. Tenemos turno en la municipalidad el 15/07. La habilitación bromatológica requiere análisis de laboratorio..."
          rows={4}
          style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
          disabled={isProfesor}
        />
      </Bloque>

      <FeedbackPanel section="legal" />
    </div>
  )
}
