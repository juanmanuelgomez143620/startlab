import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { Btn } from '../components/ui'
import { SAMPLE_PROJECT } from '../lib/sampleData'

interface ClaseConConteo {
  id: string
  nombre: string
  codigo: string
  escuela: string
  materia: string
  curso: string
  ciclo_lectivo: string
  profesor_id: string
  alumnos_count: number
}

export default function PageAdminClases() {
  const { user, loadProject, setActivePage } = useStore()
  const [clases, setClases] = useState<ClaseConConteo[]>([])
  const [loading, setLoading] = useState(true)

  const verProyectoModelo = () => {
    loadProject(SAMPLE_PROJECT.form, SAMPLE_PROJECT.estado)
    setActivePage('institucional')
  }
  const [nombre, setNombre] = useState('')
  const [escuela, setEscuela] = useState('')
  const [curso, setCurso] = useState('')
  const [materia, setMateria] = useState('')
  const [ciclo, setCiclo] = useState(new Date().getFullYear().toString())
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => {
    fetchClases()
  }, [])

  async function fetchClases() {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clases')
        .select('*, clase_estudiantes(count)')
        .eq('profesor_id', user.id)

      if (error) throw error
      if (data) {
        setClases(data.map(c => ({
          ...c,
          alumnos_count: c.clase_estudiantes?.[0]?.count || 0
        })))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function eliminarClase(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!confirm('¿Estás seguro de eliminar esta clase? Se borrarán todos los proyectos de los alumnos vinculados.')) return
    try {
      const { error } = await supabase.from('clases').delete().eq('id', id)
      if (error) throw error
      setClases(clases.filter(c => c.id !== id))
    } catch (e) {
      alert('Error al eliminar la clase')
    }
  }

  function startEdit(e: React.MouseEvent, c: any) {
    e.stopPropagation()
    setEditId(c.id)
    setNombre(c.nombre)
    setEscuela(c.escuela)
    setCurso(c.curso)
    setMateria(c.materia)
    setCiclo(c.ciclo_lectivo)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function guardarCambios(e: React.FormEvent) {
    e.preventDefault()
    if (!editId) return
    try {
      const { error } = await supabase
        .from('clases')
        .update({
          nombre,
          escuela,
          curso,
          materia,
          ciclo_lectivo: ciclo
        })
        .eq('id', editId)
      
      if (error) throw error
      
      setEditId(null)
      setNombre('')
      setEscuela('')
      setCurso('')
      setMateria('')
      fetchClases()
    } catch (e) {
      alert('Error al actualizar la clase')
    }
  }

  async function crearClase(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre || !escuela || !user) return
    const { data, error } = await supabase
      .from('clases')
      .insert({
        nombre,
        escuela,
        curso,
        materia,
        ciclo_lectivo: ciclo,
        profesor_id: user.id,
        codigo: Math.random().toString(36).substring(2, 8).toUpperCase()
      })
      .select()
      .single()

    if (error) alert(error.message)
    else {
      setClases([...clases, { ...data, alumnos_count: 0 }])
      setNombre('')
      setEscuela('')
      setCurso('')
      setMateria('')
    }
  }

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', margin: 0 }}>Mis Clases</h2>
        <Btn variant="secondary" onClick={verProyectoModelo}>✨ Ver Proyecto Modelo</Btn>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>
          {editId ? '📝 Editar Escuela / Clase' : '🏫 Crear nueva escuela / clase'}
        </h3>
        <form onSubmit={editId ? guardarCambios : crearClase} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Nombre de la Escuela</label>
            <input type="text" placeholder="Ej: IPET N°45 Gral. Paz" value={escuela} onChange={e => setEscuela(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Materia / Espacio Curricular</label>
            <input type="text" placeholder="Ej: Proyecto Empresarial" value={materia} onChange={e => setMateria(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Curso y Sección</label>
            <input type="text" placeholder="Ej: 6to Año 'A'" value={curso} onChange={e => setCurso(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Nombre Identificador (Interno)</label>
            <input type="text" placeholder="Ej: Turno Mañana - 2026" value={nombre} onChange={e => setNombre(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Ciclo Lectivo</label>
            <input type="text" placeholder="Ej: 2026" value={ciclo} onChange={e => setCiclo(e.target.value)} required />
          </div>
          <div style={{ gridColumn: 'span 2', marginTop: 12, display: 'flex', gap: 10 }}>
            <Btn variant="primary" type="submit" style={{ flex: 1 }}>
              {editId ? 'Guardar Cambios' : 'Crear Escuela y Generar Código'}
            </Btn>
            {editId && (
              <Btn variant="ghost" onClick={() => {
                setEditId(null)
                setNombre('')
                setEscuela('')
                setCurso('')
                setMateria('')
              }}>Cancelar</Btn>
            )}
          </div>
        </form>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 40 }}>Cargando tus clases...</div>
      ) : clases.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg2)', borderRadius: 20, border: '1px dashed var(--border)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏫</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: 8 }}>No tienes clases creadas</h3>
          <p style={{ color: 'var(--text2)', maxWidth: 400, margin: '0 auto' }}>Crea tu primera clase arriba para empezar a recibir proyectos de tus alumnos.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {clases.map((c, idx) => {
            const colors = ['#7c6af7', '#f7a26a', '#4ade80', '#f87171', '#38bdf8']
            const color = colors[idx % colors.length]
            return (
              <div key={c.id} style={{ 
                background: 'var(--card)', 
                border: '1px solid var(--border)', 
                borderRadius: 12, 
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'box-shadow 0.2s',
                cursor: 'pointer'
              }} className="hover:shadow-xl">
                {/* Header Estilo Classroom */}
                <div style={{ 
                  height: 100, 
                  background: `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.3)), ${color}`,
                  padding: '16px 20px',
                  position: 'relative'
                }}>
                  <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
                    <button 
                      onClick={(e) => startEdit(e, c)}
                      style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer' }}
                    >EDITAR</button>
                    <button 
                      onClick={(e) => eliminarClase(e, c.id)}
                      style={{ background: 'rgba(255,0,0,0.3)', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer' }}
                    >BORRAR</button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const msg = `Hola! 👋 Sumate al proyecto de *${c.escuela}* en *EmprendePlan*.\n📚 Materia: ${c.materia}\n🔑 Código: *${c.codigo}*\n🔗 ${window.location.origin}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      style={{ background: 'var(--success)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Compartir por WhatsApp"
                    >
                      <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.06 3.973L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                      </svg>
                    </button>
                  </div>
                  <h4 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700, margin: 0, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{c.materia}</h4>
                  <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', marginTop: 2 }}>{c.curso}</div>
                  
                  {/* Docente Circle Avatar */}
                  <div style={{ 
                    position: 'absolute', bottom: -30, right: 20, 
                    width: 60, height: 60, borderRadius: '50%', 
                    background: 'var(--bg2)', border: '4px solid var(--card)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem', fontWeight: 800, color: color
                  }}>
                    {user?.email?.[0].toUpperCase()}
                  </div>
                </div>

                {/* Body de Tarjeta */}
                <div style={{ padding: '20px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>{c.escuela}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: 16 }}>Código de clase: <strong style={{color: 'var(--text2)'}}>{c.codigo}</strong></div>
                  
                  <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>
                      Ciclo {c.ciclo_lectivo || '2026'} • 👥 {c.alumnos_count} alumnos
                    </div>
                    <Btn 
                      variant="ghost" 
                      onClick={() => setActivePage('admin-seguimiento')}
                      style={{ padding: '6px 0', fontSize: '0.8rem', fontWeight: 700, color: color }}
                    >
                      VER TRABAJOS →
                    </Btn>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
