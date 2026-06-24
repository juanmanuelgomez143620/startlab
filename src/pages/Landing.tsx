import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Btn } from '../components/ui'
import { toast } from '../components/ui'
import { supabase } from '../lib/supabase'

const AUTHOR_PHOTO = import.meta.env.VITE_AUTHOR_PHOTO

const FEATURES = [
  { icon: '🎯', title: 'Gestión Estratégica', desc: 'Misión, Visión, Objetivos y análisis FODA con guías para cada campo.' },
  { icon: '📣', title: 'Marketing Completo', desc: 'Segmentación, análisis de competidores y las 4P del marketing mix.' },
  { icon: '🏭', title: 'Plan de Producción', desc: 'Viabilidad técnica, equipamiento, planta productiva e inversión inicial.' },
  { icon: '📊', title: 'Análisis Financiero', desc: 'Presupuestos, punto de equilibrio, margen de ganancia y resultados.' },
  { icon: '⚖️', title: 'Marco Legal', desc: 'Trámites nacionales, provinciales y municipales para operar legalmente.' },
  { icon: '📄', title: 'Exportación PDF', desc: 'Plan completo en PDF institucional listo para presentar y evaluar.' },
]

const RUBROS = [
  '🍕 Alimentos y Bebidas', '🥐 Panadería y Repostería', '🎨 Artesanías y Diseño',
  '💻 Tecnología y Apps', '🏡 Servicios al Hogar', '👗 Moda e Indumentaria',
  '📚 Educación y Tutorías', '💆 Salud y Bienestar', '🌿 Turismo y Recreación',
  '🌾 Agropecuario', '🚗 Automotor y Mecánica', '🐾 Mascotas y Veterinaria',
  '🏗️ Construcción y Reforma', '📸 Fotografía y Video', '🎵 Arte y Espectáculo',
  '🚚 Logística y Transporte', '💰 Finanzas y Seguros', '🛒 Comercio y Retail',
  '⚡ Energía Renovable', '🌍 Medio Ambiente', '🔧 Otro / Sin definir',
]

type ModalRole = 'estudiante' | 'profesor'
type ModalTab = 'login' | 'register'

export default function Landing({ onEnter }: { onEnter: () => void }) {
  const { signIn, signUp } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRole, setModalRole] = useState<ModalRole>('estudiante')
  const [tab, setTab] = useState<ModalTab>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')

  function openModal(role: ModalRole) {
    setModalRole(role)
    setError('')
    setModalOpen(true)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !pass) { setError('Completá email y contraseña.'); return }
    setLoading(true); setError('')
    try {
      await signIn(email, pass)
      setModalOpen(false)
      onEnter()
      toast('¡Bienvenido! Sesión iniciada.', 'success')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión.')
    } finally { setLoading(false) }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre || !email || !pass) { setError('Completá todos los campos.'); return }
    if (pass.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    setLoading(true); setError('')
    try {
      // Validar código si es estudiante antes de registrar
      if (modalRole === 'estudiante') {
        if (!codigo) { setError('Debes ingresar el código de clase proporcionado por tu docente.'); setLoading(false); return; }
        const { data: cl, error: clErr } = await supabase.from('clases').select('id').eq('codigo', codigo.toUpperCase()).maybeSingle()
        if (clErr || !cl) { setError('El código de clase no es válido.'); setLoading(false); return; }
      }

      await signUp(email, pass, nombre, modalRole, codigo || undefined)
      setModalOpen(false)
      onEnter()
      toast('¡Cuenta creada con éxito!', 'success')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrarse.')
    } finally { setLoading(false) }
  }

  const tagColors = ['rgba(124,106,247,0.1)', 'rgba(106,247,184,0.1)', 'rgba(247,162,106,0.1)', 'rgba(247,106,138,0.1)']
  const textColors = ['var(--accent)', 'var(--accent3)', 'var(--accent2)', 'var(--accent4)']
  const borderColors = ['rgba(124,106,247,0.25)', 'rgba(106,247,184,0.25)', 'rgba(247,162,106,0.25)', 'rgba(247,106,138,0.25)']

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', overflowY: 'auto' }}>
      {/* TOPBAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.5px' }}>
          Start<span style={{ color: 'var(--accent)' }}>lab</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Btn variant="secondary" size="sm" onClick={() => openModal('estudiante')}>🎓 Ingresar como Alumno</Btn>
          <Btn variant="primary" size="sm" onClick={() => openModal('profesor')}>👨‍🏫 Ingresar como Docente</Btn>
        </div>
      </div>

      {/* HERO */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 32px 40px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,106,247,0.12)', border: '1px solid rgba(124,106,247,0.25)', borderRadius: 99, padding: '6px 16px', marginBottom: 24 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Herramienta Pedagógica Gratuita</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem,5vw,3.8rem)', fontWeight: 800, letterSpacing: -2, lineHeight: 1.1, marginBottom: 20 }}>
          Tu Plan de Negocios<br />
          <span style={{ color: 'var(--accent)' }}>Estudiantil</span> Completo
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text2)', maxWidth: 620, margin: '0 auto 36px', lineHeight: 1.7 }}>
          Guiá a tus alumnos paso a paso en la creación de un emprendimiento real. Desde la idea hasta el plan económico-financiero completo, con exportación en PDF institucional.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 60 }}>
          <Btn variant="primary" onClick={() => openModal('estudiante')} style={{ padding: '14px 32px', fontSize: '1rem' }}>
            🚀 Comenzar mi proyecto
          </Btn>
          <Btn variant="secondary" onClick={onEnter} style={{ padding: '14px 32px', fontSize: '1rem' }}>
            Continuar sin cuenta →
          </Btn>
        </div>

        {/* FEATURES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, textAlign: 'left', marginBottom: 60 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 6, fontSize: '0.95rem' }}>{f.title}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* HOW IT WORKS */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, marginBottom: 48, textAlign: 'left' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', marginBottom: 20, textAlign: 'center' }}>¿Cómo funciona?</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 20 }}>
            {[
              { n: 1, title: 'El docente crea la clase', desc: 'Configura la materia, curso y ciclo lectivo', c: 'var(--accent)' },
              { n: 2, title: 'Los alumnos ingresan', desc: 'Con código de clase o creando su cuenta', c: 'var(--accent3)' },
              { n: 3, title: 'Desarrollan el plan', desc: 'Completan cada sección con ayudas guía', c: 'var(--accent2)' },
              { n: 4, title: 'El docente evalúa', desc: 'Monitorea avance y descarga el PDF final', c: 'var(--accent4)' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${s.c}22`, border: `2px solid ${s.c}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, color: s.c }}>{s.n}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RUBROS */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', marginBottom: 16, textAlign: 'center' }}>Rubros disponibles para trabajar</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {RUBROS.map((r, i) => (
              <span key={r} style={{ padding: '6px 14px', background: tagColors[i % 4], border: `1px solid ${borderColors[i % 4]}`, borderRadius: 99, fontSize: '0.78rem', color: textColors[i % 4] }}>{r}</span>
            ))}
          </div>
        </div>

        {/* AUTHOR */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32, textAlign: 'left' }}>
          <img src={AUTHOR_PHOTO} alt="Juan Manuel Gómez" style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(124,106,247,0.4)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Desarrollado por</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', marginBottom: 4 }}>Juan Manuel Gómez</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text2)', lineHeight: 1.5 }}>Profesor en Ciencias Económicas · Licenciado en Educación<br />Experto en Tecnología Educativa</div>
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text3)', textAlign: 'center', paddingBottom: 40 }}>© 2026 Startlab · Herramienta pedagógica de uso libre para instituciones educativas</div>
      </div>

      {/* LOGIN MODAL */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setModalOpen(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, padding: 36, width: '100%', maxWidth: 400, margin: 20, position: 'relative' }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalOpen(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text2)', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>

            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{modalRole === 'profesor' ? '👨‍🏫' : '🎓'}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', marginBottom: 4 }}>
              {modalRole === 'profesor' ? 'Acceso Docente' : 'Acceso Estudiante'}
            </div>
            <div style={{ color: 'var(--text2)', fontSize: '0.85rem', marginBottom: 24 }}>
              {modalRole === 'profesor' ? 'Gestioná clases y seguí el avance de tus alumnos' : 'Ingresá con tu cuenta para guardar tu progreso'}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', background: 'var(--card)', borderRadius: 10, padding: 4, marginBottom: 20, gap: 4 }}>
              {(['login', 'register'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, padding: '8px', border: 'none', borderRadius: 7, cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-body)',
                  background: tab === t ? 'var(--accent)' : 'transparent',
                  color: tab === t ? '#fff' : 'var(--text2)',
                  transition: 'all 0.2s',
                }}>
                  {t === 'login' ? 'Iniciar sesión' : 'Registrarse'}
                </button>
              ))}
            </div>

            {tab === 'login' ? (
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Contraseña</label>
                  <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" />
                </div>
                <Btn variant="primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }} disabled={loading}>
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </Btn>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Nombre completo</label>
                  <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />
                </div>
                {modalRole === 'estudiante' && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Código de clase (opcional)</label>
                    <input type="text" value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} placeholder="Ej: ABC123" />
                    <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 4 }}>Tu docente te compartirá este código</div>
                  </div>
                )}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Contraseña</label>
                  <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Mínimo 6 caracteres" />
                </div>
                <Btn variant="primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }} disabled={loading}>
                  {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                </Btn>
              </form>
            )}

            {error && (
              <div style={{ marginTop: 12, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: 'var(--error)' }}>
                {error}
              </div>
            )}
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button onClick={onEnter} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
                Continuar sin cuenta (datos solo locales)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
