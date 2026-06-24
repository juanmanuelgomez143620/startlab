import { useStore } from '../store/useStore'
import { Card, CardTitle, CardSubtitle, FormGroup, IconBtn, Btn, toast } from '../components/ui'
import { FeedbackPanel } from '../components/FeedbackPanel'
import { useProject } from '../hooks/useProject'
import { supabase } from '../lib/supabase'
import type { Miembro } from '../types'

const MODALIDADES = ['Economía y Gestión','Agro y Ambiente','Ciencias Naturales','Arte y Diseño','Turismo','Técnica Profesional','Comunicación','Informática','Otra']
const RUBROS_OPTIONS = ['Alimentos y Bebidas','Panadería y Repostería','Catering y Eventos','Artesanías y Diseño','Fotografía y Video','Arte y Espectáculo','Diseño Gráfico','Tecnología y Apps','Desarrollo Web','Soporte Informático','E-commerce','Redes Sociales y Marketing','Servicios al Hogar','Construcción y Reformas','Jardinería','Limpieza','Decoración','Moda e Indumentaria','Salud y Bienestar','Cosméticos y Estética','Peluquería','Educación y Tutorías','Idiomas','Capacitación Profesional','Agropecuario','Apicultura','Madera y Carpintería','Medio Ambiente','Energía Renovable','Logística y Transporte','Automotor y Mecánica','Turismo y Recreación','Mascotas y Veterinaria','Comercio y Retail','Finanzas y Seguros','Gastronomía Regional','Otro / Sin definir']

export default function PageInstitucional() {
  const { form, setField, estado, setEstado, perfil, claseId, proyectoId } = useStore()
  const { saveToCloud } = useProject()
  const isProfesor = perfil?.rol === 'profesor'
  const inClass = !!claseId

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
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.8rem", letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 10 }}>
          🏫 Datos Institucionales
          {isProfesor && <span style={{ background: "rgba(250,204,21,0.15)", color: "var(--warn)", border: "1px solid rgba(250,204,21,0.25)", borderRadius: 99, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700 }}>MODO VISTA</span>}
        </h1>
        <p style={{ color: "var(--text2)", marginTop: 4, fontSize: "0.9rem" }}>
          {isProfesor ? 'Estás visualizando los datos de este proyecto. No puedes realizar cambios.' : 'Completá los datos de tu escuela, docente y equipo emprendedor.'}
        </p>
      </div>

      <Card>
        <CardTitle icon="📚">Datos de la Escuela</CardTitle>
        <CardSubtitle>
          {inClass ? 'Información institucional heredada de la clase' : 'Información institucional y académica del proyecto'}
        </CardSubtitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {inp("i_escuela", "Nombre de la Escuela", "Ej: IPET N°45 Gral. Paz", true, inClass)}
          <FormGroup label="Modalidad / Orientación" required>
            <select 
              value={form.i_modalidad} 
              onChange={e => setField("i_modalidad", e.target.value)} 
              className={form.i_modalidad ? "filled" : ""}
              disabled={isProfesor || inClass}
            >
              <option value="">Seleccioná...</option>
              {MODALIDADES.map(m => <option key={m}>{m}</option>)}
            </select>
          </FormGroup>
          {inp("i_curso", "Curso / División", "Ej: 6° Año A", true, inClass)}
          {inp("i_materia", "Materia / Espacio Curricular", "Ej: Proyecto Empresarial", true, inClass)}
          {inp("i_docente", "Docente Responsable", "Ej: Prof. García, María", true, inClass)}
          {inp("i_ciclo", "Ciclo Lectivo", "Ej: 2026", true, inClass)}
        </div>
      </Card>

      <Card>
        <CardTitle icon="💡">Nombre del Proyecto</CardTitle>
        <CardSubtitle>Elegí un nombre atractivo para tu emprendimiento</CardSubtitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FormGroup label="Nombre del Emprendimiento" required helper="El nombre debe ser memorable, original y representar lo que ofrecés.">
            <input 
              value={form.i_nombre_emp} 
              onChange={e => setField("i_nombre_emp", e.target.value)} 
              placeholder="Ej: EcoVerde Artesanías" 
              className={form.i_nombre_emp ? "filled" : ""} 
              disabled={isProfesor}
            />
          </FormGroup>
          <FormGroup label="Rubro / Sector">
            <select 
              value={form.i_rubro} 
              onChange={e => setField("i_rubro", e.target.value)} 
              className={form.i_rubro ? "filled" : ""}
              disabled={isProfesor}
            >
              <option value="">Seleccioná el rubro...</option>
              {RUBROS_OPTIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </FormGroup>
        </div>
      </Card>

      <Card>
        <CardTitle icon="👥">Equipo Emprendedor</CardTitle>
        <CardSubtitle>Agregá todos los integrantes del grupo</CardSubtitle>
        {estado.members.length === 0 ? (
          <div style={{ color: "var(--text3)", fontSize: "0.85rem", padding: "12px 0" }}>Aún no hay integrantes. Agregá uno con el botón de abajo.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              {["#","Nombre Completo","Rol","DNI",""].map(h => <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: "0.75rem", fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--border)" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {estado.members.map((m, i) => (
                <tr key={m.id}>
                  <td style={{ padding: "10px 12px", fontSize: "0.875rem", borderBottom: "1px solid rgba(42,42,56,0.5)" }}>{i+1}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(42,42,56,0.5)" }}>
                    <input 
                      value={m.nombre} 
                      onChange={e => updateMember(m.id, "nombre", e.target.value)} 
                      placeholder="Nombre y Apellido" 
                      style={{ padding: "6px 10px" }} 
                      disabled={isProfesor}
                    />
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(42,42,56,0.5)" }}>
                    <select 
                      value={m.rol} 
                      onChange={e => updateMember(m.id, "rol", e.target.value)} 
                      style={{ padding: "6px 10px", width: "auto" }}
                      disabled={isProfesor}
                    >
                      {["Líder / CEO","Marketing","Finanzas","Producción","RRHH","Logística","Diseño","Integrante"].map(r => <option key={r}>{r}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(42,42,56,0.5)" }}>
                    <input 
                      value={m.dni} 
                      onChange={e => updateMember(m.id, "dni", e.target.value)} 
                      placeholder="Opcional" 
                      style={{ padding: "6px 10px", width: 120 }} 
                      disabled={isProfesor}
                    />
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(42,42,56,0.5)" }}>
                    {!isProfesor && <IconBtn variant="del" onClick={() => removeMember(m.id)} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!isProfesor && (
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={addMember} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 16px", color: "var(--text)", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>➕ Agregar integrante</button>
            
            {!proyectoId ? (
              <Btn variant="primary" onClick={async () => {
                if (!form.i_nombre_emp) { toast('Por favor, ingresá el nombre del emprendimiento', 'error'); return; }
                const ok = await saveToCloud()
                if (ok) {
                  toast('¡Proyecto creado con éxito!', 'success')
                } else {
                  toast('Error al crear el proyecto. Verifica los datos o contacta al docente.', 'error')
                }
              }}>🚀 CREAR PROYECTO OFICIAL</Btn>
            ) : (
              <Btn variant="success" onClick={async () => {
                const ok = await saveToCloud()
                if (ok) toast('¡Equipo guardado!', 'success')
              }}>💾 Guardar Integrantes</Btn>
            )}
          </div>
        )}
      </Card>

      {!isProfesor && proyectoId && (
        <div style={{ marginTop: 40, padding: 20, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Btn variant="ghost" onClick={async () => {
             if (confirm('¿Estás seguro de ELIMINAR permanentemente tu proyecto? No podrás recuperarlo.')) {
               const { error } = await supabase.from('proyectos').delete().eq('id', proyectoId)
               if (!error) window.location.reload()
             }
          }} style={{ color: 'var(--error)' }}>🗑️ Borrar Proyecto</Btn>
        </div>
      )}

      <FeedbackPanel section="institucional" />
    </div>
  )
}
