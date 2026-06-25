import { useStore } from '../store/useStore'
import { Card, CardTitle, CardSubtitle, FormGroup, IconBtn, Btn, toast } from '../components/ui'
import { FeedbackPanel } from '../components/FeedbackPanel'
import { useProject } from '../hooks/useProject'
import { calcCompleteness } from '../lib/calculos'
import { supabase } from '../lib/supabase'
import type { Miembro } from '../types'

const MODALIDADES = ['Economía y Gestión','Agro y Ambiente','Ciencias Naturales','Arte y Diseño','Turismo','Técnica Profesional','Comunicación','Informática','Otra']
const RUBROS_OPTIONS = ['Alimentos y Bebidas','Panadería y Repostería','Catering y Eventos','Artesanías y Diseño','Fotografía y Video','Arte y Espectáculo','Diseño Gráfico','Tecnología y Apps','Desarrollo Web','Soporte Informático','E-commerce','Redes Sociales y Marketing','Servicios al Hogar','Construcción y Reformas','Jardinería','Limpieza','Decoración','Moda e Indumentaria','Salud y Bienestar','Cosméticos y Estética','Peluquería','Educación y Tutorías','Idiomas','Capacitación Profesional','Agropecuario','Apicultura','Madera y Carpintería','Medio Ambiente','Energía Renovable','Logística y Transporte','Automotor y Mecánica','Turismo y Recreación','Mascotas y Veterinaria','Comercio y Retail','Finanzas y Seguros','Gastronomía Regional','Otro / Sin definir']

const ROLES = ['Líder / CEO','Marketing','Finanzas','Producción','RRHH','Logística','Diseño','Integrante']

const ROLE_COLORS: Record<string, string> = {
  'Líder / CEO': '#7c6af7',
  'Marketing': '#f7a26a',
  'Finanzas': '#4ade80',
  'Producción': '#38bdf8',
  'RRHH': '#f87171',
  'Logística': '#fb923c',
  'Diseño': '#c084fc',
  'Integrante': '#94a3b8',
}

const TIPOS_NEGOCIO = [
  { valor: 'Producto', icon: '📦', desc: 'Fabricás o vendés objetos' },
  { valor: 'Servicio', icon: '🤝', desc: 'Ofrecés una habilidad o trabajo' },
  { valor: 'Producto + Servicio', icon: '⚡', desc: 'Combinás ambas opciones' },
]

function getInitials(nombre: string): string {
  return nombre.trim().split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() || '?').join('') || '?'
}

export default function PageInstitucional() {
  const { form, setField, estado, setEstado, perfil, claseId, proyectoId } = useStore()
  const { saveToCloud } = useProject()
  const isProfesor = perfil?.rol === 'profesor'
  const inClass = !!claseId

  const comp = calcCompleteness(form, [])
  const pctSeccion = comp.institucional

  function addMember() {
    if (isProfesor) return
    setEstado({ members: [...estado.members, { id: Date.now(), nombre: '', rol: 'Integrante', dni: '' }] })
  }
  function removeMember(id: number) {
    if (isProfesor) return
    setEstado({ members: estado.members.filter(m => m.id !== id) })
  }
  function updateMember(id: number, field: keyof Miembro, value: string) {
    if (isProfesor) return
    setEstado({ members: estado.members.map(m => m.id === id ? { ...m, [field]: value } : m) })
  }

  const inp = (id: keyof typeof form, label: string, placeholder: string, required?: boolean, disabled?: boolean) => (
    <FormGroup label={label} required={required}>
      <input
        value={form[id]}
        onChange={e => setField(id, e.target.value)}
        placeholder={placeholder}
        className={form[id] ? 'filled' : ''}
        disabled={disabled || isProfesor}
      />
    </FormGroup>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 10 }}>
            🏫 Datos Institucionales
            {isProfesor && <span style={{ background: 'rgba(250,204,21,0.15)', color: 'var(--warn)', border: '1px solid rgba(250,204,21,0.25)', borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>MODO VISTA</span>}
          </h1>
          <p style={{ color: 'var(--text2)', marginTop: 4, fontSize: '0.9rem' }}>
            {isProfesor ? 'Estás visualizando los datos de este proyecto. No podés realizar cambios.' : 'Completá los datos de tu escuela, equipo y tu emprendimiento.'}
          </p>
        </div>

        {/* Barra de progreso de sección */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 16px', minWidth: 180 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Completitud</div>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pctSeccion}%`, background: pctSeccion === 100 ? 'var(--success)' : 'linear-gradient(90deg, var(--accent), var(--accent2))', borderRadius: 99, transition: 'width 0.4s ease' }} />
            </div>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: pctSeccion === 100 ? 'var(--success)' : 'var(--accent)', minWidth: 38, textAlign: 'right' }}>{pctSeccion}%</span>
        </div>
      </div>

      {/* Card: Escuela */}
      <Card>
        <CardTitle icon="📚">Datos de la Escuela</CardTitle>
        <CardSubtitle>
          {inClass ? 'Información institucional heredada de la clase' : 'Información institucional y académica del proyecto'}
        </CardSubtitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {inp('i_escuela', 'Nombre de la Escuela', 'Ej: IPET N°45 Gral. Paz', true, inClass)}
          <FormGroup label="Modalidad / Orientación" required>
            <select
              value={form.i_modalidad}
              onChange={e => setField('i_modalidad', e.target.value)}
              className={form.i_modalidad ? 'filled' : ''}
              disabled={isProfesor || inClass}
            >
              <option value="">Seleccioná...</option>
              {MODALIDADES.map(m => <option key={m}>{m}</option>)}
            </select>
          </FormGroup>
          {inp('i_curso', 'Curso / División', 'Ej: 6° Año A', true, inClass)}
          {inp('i_materia', 'Materia / Espacio Curricular', 'Ej: Proyecto Empresarial', true, inClass)}
          {inp('i_docente', 'Docente Responsable', 'Ej: Prof. García, María', true, inClass)}
          {inp('i_ciclo', 'Ciclo Lectivo', 'Ej: 2026', true, inClass)}
        </div>
      </Card>

      {/* Card: Identidad del Emprendimiento */}
      <Card>
        <CardTitle icon="💡">Identidad del Emprendimiento</CardTitle>
        <CardSubtitle>Definí el nombre, tipo y propuesta de valor de tu negocio</CardSubtitle>

        {/* Nombre + Rubro */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <FormGroup label="Nombre del Emprendimiento" required helper="El nombre debe ser memorable, original y representar lo que ofrecés.">
            <input
              value={form.i_nombre_emp}
              onChange={e => setField('i_nombre_emp', e.target.value)}
              placeholder="Ej: EcoVerde Artesanías"
              className={form.i_nombre_emp ? 'filled' : ''}
              disabled={isProfesor}
            />
          </FormGroup>
          <FormGroup label="Rubro / Sector">
            <select
              value={form.i_rubro}
              onChange={e => setField('i_rubro', e.target.value)}
              className={form.i_rubro ? 'filled' : ''}
              disabled={isProfesor}
            >
              <option value="">Seleccioná el rubro...</option>
              {RUBROS_OPTIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </FormGroup>
        </div>

        {/* Tipo de Negocio */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text2)', marginBottom: 10 }}>
            Tipo de Negocio <span style={{ color: 'var(--error)' }}>*</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {TIPOS_NEGOCIO.map(({ valor, icon, desc }) => {
              const selected = form.i_tipo_negocio === valor
              return (
                <div
                  key={valor}
                  onClick={() => !isProfesor && setField('i_tipo_negocio', valor)}
                  style={{
                    padding: '16px 12px',
                    border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 12,
                    cursor: isProfesor ? 'default' : 'pointer',
                    background: selected ? 'rgba(124,106,247,0.12)' : 'var(--bg3)',
                    textAlign: 'center',
                    transition: 'all 0.18s',
                  }}
                >
                  <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: selected ? 'var(--accent)' : 'var(--text)' }}>{valor}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 4 }}>{desc}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Slogan */}
        <FormGroup label="Lema / Slogan" helper="Una frase corta y memorable que defina tu emprendimiento.">
          <div style={{ position: 'relative' }}>
            <input
              value={form.i_slogan}
              onChange={e => setField('i_slogan', e.target.value.slice(0, 80))}
              placeholder="Ej: «Sabor artesanal, hecho con amor»"
              className={form.i_slogan ? 'filled' : ''}
              disabled={isProfesor}
              style={{ paddingRight: 56 }}
            />
            <span style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              fontSize: '0.7rem', fontWeight: 600,
              color: form.i_slogan.length > 70 ? 'var(--warn)' : 'var(--text3)'
            }}>
              {form.i_slogan.length}/80
            </span>
          </div>
        </FormGroup>

        {/* Descripción breve */}
        <FormGroup
          label="Descripción breve del emprendimiento"
          required
          helper="¿Qué producís o vendés? ¿A quién va dirigido? ¿Cuál es tu diferencial? (2-4 oraciones)"
        >
          <textarea
            value={form.i_desc_breve}
            onChange={e => setField('i_desc_breve', e.target.value)}
            placeholder="Ej: Fabricamos bijouterie artesanal con materiales reciclados, dirigida a jóvenes de 15 a 30 años. Nos diferenciamos por el diseño único y el precio accesible. Vendemos en ferias y redes sociales."
            rows={3}
            className={form.i_desc_breve ? 'filled' : ''}
            disabled={isProfesor}
          />
        </FormGroup>
      </Card>

      {/* Card: Equipo */}
      <Card>
        <CardTitle icon="👥">Equipo Emprendedor</CardTitle>
        <CardSubtitle>Integrantes del grupo y sus roles dentro del proyecto</CardSubtitle>

        {estado.members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text3)', border: '1px dashed var(--border)', borderRadius: 12 }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>👤</div>
            <div style={{ fontSize: '0.9rem' }}>Aún no hay integrantes. Agregá uno con el botón de abajo.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {estado.members.map((m, i) => {
              const roleColor = ROLE_COLORS[m.rol] || '#94a3b8'
              const initials = getInitials(m.nombre)
              return (
                <div key={m.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '44px 1fr 1fr 120px 36px',
                  gap: 12,
                  alignItems: 'center',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 14px',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: `${roleColor}22`,
                    border: `2px solid ${roleColor}66`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.75rem', color: roleColor,
                    flexShrink: 0,
                  }}>
                    {initials}
                  </div>

                  {/* Nombre */}
                  <input
                    value={m.nombre}
                    onChange={e => updateMember(m.id, 'nombre', e.target.value)}
                    placeholder={`Integrante ${i + 1} — Nombre y Apellido`}
                    style={{ padding: '6px 10px', fontSize: '0.875rem' }}
                    disabled={isProfesor}
                  />

                  {/* Rol */}
                  <div style={{ position: 'relative' }}>
                    <select
                      value={m.rol}
                      onChange={e => updateMember(m.id, 'rol', e.target.value)}
                      style={{ padding: '6px 10px', paddingLeft: 10, width: '100%', fontSize: '0.875rem' }}
                      disabled={isProfesor}
                    >
                      {ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                    <span style={{
                      position: 'absolute', right: 28, top: '50%', transform: 'translateY(-50%)',
                      width: 8, height: 8, borderRadius: '50%', background: roleColor,
                      pointerEvents: 'none',
                    }} />
                  </div>

                  {/* DNI */}
                  <input
                    value={m.dni}
                    onChange={e => updateMember(m.id, 'dni', e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="DNI (opt.)"
                    style={{ padding: '6px 10px', fontSize: '0.875rem' }}
                    disabled={isProfesor}
                  />

                  {/* Eliminar */}
                  {!isProfesor && <IconBtn variant="del" onClick={() => removeMember(m.id)} />}
                </div>
              )
            })}
          </div>
        )}

        {!isProfesor && (
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <button
              onClick={addMember}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
            >
              ➕ Agregar integrante
            </button>

            {!proyectoId ? (
              <Btn variant="primary" onClick={async () => {
                if (!form.i_nombre_emp) { toast('Ingresá el nombre del emprendimiento', 'error'); return }
                if (!form.i_tipo_negocio) { toast('Seleccioná el tipo de negocio', 'error'); return }
                const ok = await saveToCloud()
                if (ok) toast('¡Proyecto creado con éxito!', 'success')
                else toast('Error al crear el proyecto. Verificá los datos.', 'error')
              }}>🚀 CREAR PROYECTO OFICIAL</Btn>
            ) : (
              <Btn variant="success" onClick={async () => {
                const ok = await saveToCloud()
                if (ok) toast('¡Guardado!', 'success')
              }}>💾 Guardar Cambios</Btn>
            )}
          </div>
        )}
      </Card>

      {/* Sección aprobada o borrar proyecto */}
      {!isProfesor && proyectoId && (
        <div style={{ marginTop: 40, padding: '16px 0', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={async () => {
            if (confirm('¿Estás seguro de ELIMINAR permanentemente tu proyecto? No podrás recuperarlo.')) {
              const { error } = await supabase.from('proyectos').delete().eq('id', proyectoId)
              if (!error) window.location.reload()
            }
          }} style={{ color: 'var(--error)', fontSize: '0.8rem' }}>🗑️ Eliminar Proyecto</Btn>
        </div>
      )}

      <FeedbackPanel section="institucional" />
    </div>
  )
}
