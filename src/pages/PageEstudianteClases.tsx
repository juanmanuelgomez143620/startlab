import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { Btn, Card, CardTitle, CardSubtitle, toast } from '../components/ui'
import { useProject } from '../hooks/useProject'

export default function PageEstudianteClases() {
  const { user, setClaseId, setActivePage } = useStore()
  const { loadFromCloud, joinProjectByCode, saveToCloud } = useProject()
  const [clases, setClases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [codigo, setCodigo] = useState('')
  const [unirseOpen, setUnirseOpen] = useState(false)

  // Estados para equipo
  const [selectedClase, setSelectedClase] = useState<any | null>(null)
  const [codigoGrupo, setCodigoGrupo] = useState('')
  const [joiningProject, setJoiningProject] = useState(false)

  useEffect(() => {
    fetchClases()
  }, [user])

  async function fetchClases() {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clase_estudiantes')
        .select(`
          clase_id,
          clases (*)
        `)
        .eq('estudiante_id', user.id)
      
      if (error) throw error
      const items = data?.map(x => x.clases) || []
      
      const enriched = await Promise.all(items.map(async (c: any) => {
        const { data: p } = await supabase.from('perfiles').select('nombre_completo').eq('id', c.profesor_id).maybeSingle()
        
        // Ver si ya tiene proyecto (propio o participando)
        const { data: projOwn } = await supabase.from('proyectos').select('id, codigo_grupo').eq('usuario_id', user.id).eq('clase_id', c.id).maybeSingle()
        let projId = projOwn?.id
        let groupCode = projOwn?.codigo_grupo

        if (!projId) {
          const { data: particip } = await supabase.from('proyecto_participantes').select('proyecto_id, proyectos(codigo_grupo, clase_id)').eq('usuario_id', user.id).maybeSingle()
          if (particip && (particip.proyectos as any)?.clase_id === c.id) {
            projId = particip.proyecto_id
            groupCode = (particip.proyectos as any).codigo_grupo
          }
        }

        return { 
          ...c, 
          docente_nombre: p?.nombre_completo || 'Docente', 
          hasProject: !!projId, 
          groupCode 
        }
      }))

      setClases(enriched)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoinClass() {
    const clean = codigo.trim().toUpperCase()
    if (!clean || !user) return
    try {
      const { data: cl } = await supabase.from('clases').select('id').eq('codigo', clean).maybeSingle()
      if (!cl) { toast('Código de clase no encontrado', 'error'); return }

      const { error } = await supabase.from('clase_estudiantes').upsert({ clase_id: cl.id, estudiante_id: user.id })
      if (error) throw error

      toast('¡Te uniste a la clase!', 'success')
      setCodigo('')
      setUnirseOpen(false)
      fetchClases()
    } catch (e) {
      toast('Error al unirse', 'error')
    }
  }

  async function handleJoinProject() {
    const clean = codigoGrupo.trim().toUpperCase()
    if (!clean) return
    setJoiningProject(true)
    const res = await joinProjectByCode(clean)
    if (res.ok) {
      toast('¡Te uniste al equipo!', 'success')
      await loadFromCloud(selectedClase.id)
      setActivePage('institucional')
    } else {
      toast(res.msg || 'Error', 'error')
    }
    setJoiningProject(false)
  }

  async function enterClass(c: any) {
    setClaseId(c.id)
    const active = await loadFromCloud(c.id)
    if (active) {
      setActivePage('institucional')
    } else {
      setSelectedClase(c)
    }
  }

  async function leaveClass(e: React.MouseEvent, cId: string) {
    e.stopPropagation()
    if (!confirm('¿Abandonar esta clase?')) return
    await supabase.from('clase_estudiantes').delete().eq('clase_id', cId).eq('estudiante_id', user?.id)
    fetchClases()
  }

  async function handleCreateProject() {
    if (!user || !selectedClase) return
    setJoiningProject(true)
    try {
      // Forzamos el guardado inicial para que el docente lo vea ya
      const ok = await saveToCloud()
      if (ok) {
        toast('¡Proyecto iniciado!', 'success')
        setActivePage('institucional')
      } else {
        toast('Error al iniciar proyecto', 'error')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setJoiningProject(false)
    }
  }

  if (selectedClase) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', padding: '20px' }}>
        <Btn variant="ghost" onClick={() => setSelectedClase(null)} style={{ marginBottom: 20 }}>← Volver</Btn>
        <Card>
          <CardTitle icon="🚀">{selectedClase.materia}</CardTitle>
          <CardSubtitle>No tienes un proyecto aquí. ¿Cómo deseas empezar?</CardSubtitle>
          <div style={{ display: 'grid', gap: 20, marginTop: 24 }}>
            <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 12 }}>
              <h4 style={{ fontWeight: 700, marginBottom: 8 }}>🆕 Crear un nuevo proyecto</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text2)', marginBottom: 16 }}>Serás el responsable del grupo.</p>
              <Btn variant="primary" style={{ width: '100%' }} onClick={handleCreateProject} disabled={joiningProject}>
                {joiningProject ? 'Iniciando...' : 'Crear Proyecto'}
              </Btn>
            </div>
            <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 12 }}>
              <h4 style={{ fontWeight: 700, marginBottom: 8 }}>👥 Unirme a un equipo</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text2)', marginBottom: 16 }}>Pide el Código de Grupo a tus compañeros.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="text" placeholder="Código" value={codigoGrupo} onChange={e => setCodigoGrupo(e.target.value.toUpperCase())} style={{ flex: 1 }} />
                <Btn onClick={handleJoinProject} disabled={joiningProject}>Unirme</Btn>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800 }}>Mis Clases</h2>
          <p style={{ color: 'var(--text2)' }}>Seleccioná una materia para trabajar</p>
        </div>
        <Btn variant="primary" onClick={() => setUnirseOpen(true)}>＋ Unirse a una clase</Btn>
      </div>

      {unirseOpen && (
        <div style={{ marginBottom: 32 }}><Card>
          <CardTitle icon="🔑">Unirse a clase</CardTitle>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input type="text" value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} placeholder="Código Clase" style={{ flex: 1 }} />
            <Btn onClick={handleJoinClass}>Unirse</Btn>
            <Btn variant="ghost" onClick={() => setUnirseOpen(false)}>Cancelar</Btn>
          </div>
        </Card></div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Cargando...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {clases.map((c, idx) => {
            const colors = ['#7c6af7', '#f7a26a', '#4ade80', '#f87171', '#38bdf8']
            const color = colors[idx % colors.length]
            return (
              <div key={c.id} onClick={() => enterClass(c)} className="group" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ height: 100, background: `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.3)), ${color}`, padding: 16, position: 'relative' }}>
                  <button onClick={(e) => leaveClass(e, c.id)} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.2)', color: '#fff', border: 'none', borderRadius: 4, fontSize: '0.6rem', padding: '2px 6px', opacity: 0 }} className="group-hover:opacity-100">ABANDONAR</button>
                  <h4 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700 }}>{c.materia}</h4>
                  <div style={{ color: '#fff', opacity: 0.8, fontSize: '0.8rem' }}>{c.curso}</div>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{c.escuela}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>Prof. {c.docente_nombre}</div>
                  {c.groupCode && (
                    <div style={{ marginTop: 12, padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Código de Equipo (Grupo)</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px' }}>{c.groupCode}</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const msg = `¡Hola! 👋 Sumate a mi equipo para el proyecto de *${c.materia}* en *Startlab*.\n🔑 Código de Equipo: *${c.groupCode}*\n🔗 ${window.location.origin}`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                            }}
                            style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}
                          >WhatsApp</button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const subject = `Invitación al equipo: ${c.materia}`;
                              const body = `¡Hola!\n\nTe invito a sumarte a mi equipo en Startlab para la materia ${c.materia}.\n\nCódigo de Equipo: ${c.groupCode}\nEnlace: ${window.location.origin}`;
                              window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                            }}
                            style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}
                          >Email</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ padding: 12, borderTop: '1px solid var(--border)', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: color }}>
                  {c.hasProject ? 'ABRIR PROYECTO →' : 'EMPEZAR →'}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
