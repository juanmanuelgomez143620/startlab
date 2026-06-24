import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import type { DatosForm, ProyectoEstado } from '../types'

interface PerfilBasico {
  nombre_completo: string
  email: string
}

interface ClaseBasica {
  id: string
  nombre: string
  codigo: string
  escuela: string
  materia: string
  ciclo_lectivo: string
  profesor_id: string
}

interface ProyectoSeguimiento {
  id: string
  usuario_id: string
  clase_id: string | null
  nombre_emprendimiento: string
  completitud: number
  estado: string
  nota?: number | null
  feedback_docente?: string | null
  codigo_grupo?: string | null
  datos_form?: DatosForm | string
  datos_estado?: ProyectoEstado | string
  tieneProyecto: boolean
  perfiles: PerfilBasico
  clases: { nombre: string }
  proyecto_participantes?: Array<{ perfiles?: PerfilBasico }>
}

export default function PageAdminSeguimiento() {
  const { user, perfil, loadProject, setActivePage, setProyectoContexto } = useStore()
  const [proyectos, setProyectos] = useState<ProyectoSeguimiento[]>([])
  const [misClases, setMisClases] = useState<ClaseBasica[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProy, setSelectedProy] = useState<ProyectoSeguimiento | null>(null)
  const [nota, setNota] = useState('')
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProyectos()
  }, [user])

  async function fetchProyectos() {
    if (!user) return
    setLoading(true)
    console.log('[Seguimiento] Iniciando diagnótico profundo para docente:', user.id)
    
    try {
      // 1. Obtener Clases
      const { data: clasesData } = await supabase.from('clases').select('*').eq('profesor_id', user.id)
      setMisClases(clasesData || [])
      const idsClas = clasesData?.map(c => c.id) || []
      
      if (idsClas.length === 0) {
        setProyectos([])
        setLoading(false)
        return
      }

      // 2. Obtener Proyectos (Consulta simple sin Joins que fallen)
      const { data: rawProjs, error: errP } = await supabase
        .from('proyectos')
        .select('*')
        .in('clase_id', idsClas)
      
      if (errP) console.error('[Seguimiento] ERROR PROYECTOS:', errP)

      // 3. Obtener Alumnos Inscritos
      const { data: rawInsc, error: errI } = await supabase
        .from('clase_estudiantes')
        .select('*')
        .in('clase_id', idsClas)
      
      if (errI) console.error('[Seguimiento] ERROR INSCRITOS:', errI)

      // 4. Recolectar todos los IDs de usuarios involucrados para pedir sus nombres una sola vez
      const userIds = new Set<string>()
      rawProjs?.forEach(p => userIds.add(p.usuario_id))
      rawInsc?.forEach(i => userIds.add(i.estudiante_id))

      const { data: rawPerfiles } = await supabase
        .from('perfiles')
        .select('id, nombre_completo, email')
        .in('id', Array.from(userIds))
      
      const perfilesMap = new Map(rawPerfiles?.map(p => [p.id, p]))

      // 5. Unir todo en el Listado Final
      const listadoFinal: ProyectoSeguimiento[] = []
      const procesados = new Set()

      // Mapear proyectos existentes
      rawProjs?.forEach(p => {
        const perf = perfilesMap.get(p.usuario_id)
        const cla = clasesData?.find(c => c.id === p.clase_id)
        listadoFinal.push({
          ...p,
          tieneProyecto: true,
          perfiles: perf || { nombre_completo: 'Usuario Desconocido', email: '-' },
          clases: cla || { nombre: 'Clase' }
        })
        procesados.add(p.usuario_id)
      })

      // Mapear inscritos sin proyecto
      rawInsc?.forEach(ins => {
        if (!procesados.has(ins.estudiante_id)) {
          const perf = perfilesMap.get(ins.estudiante_id)
          const cla = clasesData?.find(c => c.id === ins.clase_id)
          listadoFinal.push({
            id: `temp-${ins.estudiante_id}`,
            usuario_id: ins.estudiante_id,
            nombre_emprendimiento: '(Sin Proyecto)',
            completitud: 0,
            estado: 'esperando',
            tieneProyecto: false,
            perfiles: perf || { nombre_completo: 'Alumno esperando', email: '-' },
            clases: cla || { nombre: 'En clase' }
          })
          procesados.add(ins.estudiante_id)
        }
      })

      console.log('[Seguimiento] Listado reconstruido:', listadoFinal.length)
      setProyectos(listadoFinal)
    } catch (e) {
      console.error('[Seguimiento] Error fatal:', e)
    } finally {
      setLoading(false)
    }
  }

  async function verProyecto(p: ProyectoSeguimiento) {
    // Cargamos los datos del proyecto del alumno en el store global
    const f = typeof p.datos_form === 'string' ? JSON.parse(p.datos_form) : p.datos_form
    const e = typeof p.datos_estado === 'string' ? JSON.parse(p.datos_estado) : p.datos_estado
    
    useStore.getState().setProyectoId(p.id)
    useStore.getState().setClaseId(p.clase_id)
    setProyectoContexto({
      alumno: p.perfiles?.nombre_completo || 'Alumno',
      emprendimiento: p.nombre_emprendimiento || 'Sin nombre'
    })
    loadProject(f, e)
    setActivePage('institucional')
  }

  async function guardarCalificacion(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProy || !user) return
    setSaving(true)

    const { error } = await supabase
      .from('proyectos')
      .update({
        nota: parseFloat(nota),
        feedback_docente: feedback,
        estado: 'calificado'
      })
      .eq('id', selectedProy.id)

    if (error) {
      alert('Error al calificar: ' + error.message)
    } else {
      setProyectos(proyectos.map(p => p.id === selectedProy.id ? { ...p, nota, feedback_docente: feedback, estado: 'calificado' } : p))
      setSelectedProy(null)
    }
    setSaving(false)
  }

  function abrirCalificador(p: ProyectoSeguimiento) {
    setSelectedProy(p)
    setNota(p.nota?.toString() || '')
    setFeedback(p.feedback_docente || '')
  }

  return (
    <div className="animate-in">
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', marginBottom: 8 }}>Seguimiento de Alumnos</h2>
      <div style={{ marginBottom: 20, padding: 12, background: 'rgba(124,106,247,0.05)', borderRadius: 10, border: '1px solid var(--border)', fontSize: '0.8rem' }}>
        <div>👤 Docente: <b>{perfil?.nombre_completo}</b> | Rol: <b>{perfil?.rol}</b></div>
        <div style={{ color: 'var(--text3)', marginTop: 4 }}>Tus clases activas: {misClases.length > 0 ? misClases.map(c => c.nombre).join(', ') : 'No se detectan clases activas'}</div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)' }}>Cargando datos...</div>
      ) : proyectos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg2)', borderRadius: 16, border: '1px dashed var(--border)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>📈</div>
          <p style={{ color: 'var(--text2)', marginBottom: 8 }}>No hay proyectos ni alumnos registrados en tus clases.</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Asegurate de haber creado al menos una clase y que los alumnos hayan ingresado tu código.</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16, fontSize: '0.85rem', color: 'var(--text2)', display: 'flex', gap: 10 }}>
            <span>📍 Monitoreando <b>{proyectos.length}</b> alumnos / equipos en tus clases activas.</span>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'rgba(124,106,247,0.05)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '12px 20px', fontWeight: 600 }}>Alumno / Grupo</th>
                <th style={{ textAlign: 'left', padding: '12px 20px', fontWeight: 600 }}>Emprendimiento</th>
                <th style={{ textAlign: 'left', padding: '12px 20px', fontWeight: 600 }}>Código</th>
                <th style={{ textAlign: 'left', padding: '12px 20px', fontWeight: 600 }}>Clase</th>
                <th style={{ textAlign: 'center', padding: '12px 20px', fontWeight: 600 }}>Progreso</th>
                <th style={{ textAlign: 'center', padding: '12px 20px', fontWeight: 600 }}>Estado</th>
                <th style={{ textAlign: 'right', padding: '12px 20px', fontWeight: 600 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proyectos.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 600 }}>{p.perfiles?.nombre_completo} (Líder)</div>
                    {p.proyecto_participantes?.map((part: any, i: number) => (
                      <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text2)', marginLeft: 4 }}>
                        • {part.perfiles?.nombre_completo}
                      </div>
                    ))}
                    <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginTop: 4 }}>{p.perfiles?.email}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>{p.nombre_emprendimiento}</td>
                  <td style={{ padding: '16px 20px' }}><code style={{ background: 'var(--bg2)', padding: '2px 4px', borderRadius: 4 }}>{p.codigo_grupo || '-'}</code></td>
                  <td style={{ padding: '16px 20px' }}>{p.clases?.nombre || 'Particular'}</td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--bg2)', borderRadius: 99, maxWidth: 60 }}>
                        <div style={{ height: '100%', width: `${p.completitud}%`, background: 'var(--accent)', borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{p.completitud}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span style={{ 
                      fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', padding: '4px 8px', borderRadius: 4,
                      background: p.estado === 'calificado' ? 'rgba(34,197,94,0.1)' : p.estado === 'entregado' ? 'rgba(124,106,247,0.1)' : p.estado === 'no_iniciado' ? 'rgba(156,163,175,0.1)' : 'var(--bg2)',
                      color: p.estado === 'calificado' ? 'rgb(34,197,94)' : p.estado === 'entregado' ? 'var(--accent)' : p.estado === 'no_iniciado' ? 'var(--text3)' : 'var(--text2)'
                    }}>
                      {p.estado.replace('_', ' ')}
                    </span>
                    {p.nota && <div style={{ fontSize: '0.8rem', fontWeight: 700, marginTop: 4 }}>Nota: {p.nota}</div>}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {p.tieneProyecto ? (
                        <>
                          <button 
                            onClick={() => verProyecto(p)}
                            style={{ background: 'var(--accent)', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', color: '#fff', fontWeight: 600 }}
                          >
                            📂 Ver Plan
                          </button>
                          <button 
                            onClick={() => abrirCalificador(p)}
                            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text)' }}
                          >
                            {p.nota ? 'Editar Nota' : 'Calificar'}
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text3)', fontStyle: 'italic' }}>Esperando inicio...</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
      )}

      {/* MODAL DE CALIFICACIÓN */}
      {selectedProy && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 500, boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', marginBottom: 8 }}>Calificar Proyecto</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text2)', marginBottom: 24 }}>
              Alumno: <b>{selectedProy.perfiles?.nombre_completo}</b><br/>
              Proyecto: <b>{selectedProy.nombre_emprendimiento}</b>
            </p>

            <form onSubmit={guardarCalificacion}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Calificación (Nota)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  min="0" 
                  max="10" 
                  value={nota} 
                  onChange={e => setNota(e.target.value)} 
                  placeholder="Ej: 8.5"
                  required
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Feedback / Comentarios</label>
                <textarea 
                  value={feedback} 
                  onChange={e => setFeedback(e.target.value)} 
                  placeholder="Escribí aquí tus observaciones para el alumno..."
                  style={{ minHeight: 120 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  type="button" 
                  onClick={() => setSelectedProy(null)}
                  style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: 12, cursor: 'pointer', color: 'var(--text2)' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  style={{ flex: 1, background: 'var(--accent)', border: 'none', borderRadius: 8, padding: 12, cursor: 'pointer', color: '#fff', fontWeight: 700 }}
                >
                  {saving ? 'Guardando...' : 'Guardar Calificación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
