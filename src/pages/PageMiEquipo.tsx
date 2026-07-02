import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { Btn, Card, CardTitle, CardSubtitle, toast } from '../components/ui'
import type { CompaneroDisponible } from '../types'

interface MiembroEquipo {
  id: string // proyecto_participantes.id, o 'lider' para el dueño
  usuario_id: string
  nombre_completo: string
  email: string
  esLider: boolean
}

interface ProyectoBasico {
  id: string
  usuario_id: string
  nombre_emprendimiento: string
  codigo_grupo: string | null
  clase_id: string | null
}

export default function PageMiEquipo() {
  const { user, proyectoId, claseId, setProyectoId, setClaseId, setActivePage } = useStore()
  const [proyecto, setProyecto] = useState<ProyectoBasico | null>(null)
  const [miembros, setMiembros] = useState<MiembroEquipo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [disponibles, setDisponibles] = useState<CompaneroDisponible[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [cargandoDisponibles, setCargandoDisponibles] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const esLider = !!proyecto && !!user && proyecto.usuario_id === user.id

  const fetchEquipo = useCallback(async () => {
    if (!proyectoId || !user) return
    setLoading(true)
    try {
      const { data: proy, error: errProy } = await supabase
        .from('proyectos')
        .select('id, usuario_id, nombre_emprendimiento, codigo_grupo, clase_id')
        .eq('id', proyectoId)
        .maybeSingle()
      if (errProy || !proy) throw errProy || new Error('Proyecto no encontrado')
      setProyecto(proy)

      const { data: lider } = await supabase
        .from('perfiles')
        .select('id, nombre_completo, email')
        .eq('id', proy.usuario_id)
        .maybeSingle()

      const { data: participantes, error: errPart } = await supabase
        .from('proyecto_participantes')
        .select('id, usuario_id, perfiles(nombre_completo, email)')
        .eq('proyecto_id', proyectoId)
      if (errPart) throw errPart

      const lista: MiembroEquipo[] = [
        { id: 'lider', usuario_id: proy.usuario_id, nombre_completo: lider?.nombre_completo || 'Líder', email: lider?.email || '', esLider: true },
        ...(participantes || []).map((p: any) => ({
          id: p.id,
          usuario_id: p.usuario_id,
          nombre_completo: p.perfiles?.nombre_completo || '—',
          email: p.perfiles?.email || '',
          esLider: false,
        })),
      ]
      setMiembros(lista)
    } catch (e) {
      console.error('[MiEquipo] Error:', e)
      toast('Error al cargar el equipo', 'error')
    } finally {
      setLoading(false)
    }
  }, [proyectoId, user])

  useEffect(() => {
    fetchEquipo()
  }, [fetchEquipo])

  async function abrirModalAgregar() {
    if (!claseId) return
    setModalOpen(true)
    setCargandoDisponibles(true)
    setSeleccionados(new Set())
    try {
      const { data, error } = await supabase.rpc('companeros_disponibles', { p_clase_id: claseId })
      if (error) throw error
      setDisponibles(data || [])
    } catch (e) {
      console.error(e)
      toast('Error al cargar compañeros disponibles', 'error')
    } finally {
      setCargandoDisponibles(false)
    }
  }

  function toggleSeleccion(id: string) {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function confirmarAgregar() {
    if (!proyectoId || seleccionados.size === 0) return
    setGuardando(true)
    try {
      const rows = Array.from(seleccionados).map(usuario_id => ({ proyecto_id: proyectoId, usuario_id }))
      const { error } = await supabase.from('proyecto_participantes').insert(rows)
      if (error) throw error
      toast('Compañeros agregados al equipo', 'success')
      setModalOpen(false)
      fetchEquipo()
    } catch (e: any) {
      console.error(e)
      toast(e?.message || 'Error al agregar compañeros', 'error')
    } finally {
      setGuardando(false)
    }
  }

  async function expulsarMiembro(m: MiembroEquipo) {
    if (!confirm(`¿Quitar a ${m.nombre_completo} del equipo?`)) return
    try {
      const { error } = await supabase.from('proyecto_participantes').delete().eq('id', m.id)
      if (error) throw error
      toast('Compañero removido del equipo', 'success')
      fetchEquipo()
    } catch (e) {
      toast('Error al remover al compañero', 'error')
    }
  }

  async function salirDelEquipo() {
    if (!proyectoId || !user) return
    if (!confirm('¿Salir de este equipo? Perderás acceso al proyecto.')) return
    try {
      const { error } = await supabase.from('proyecto_participantes').delete().eq('proyecto_id', proyectoId).eq('usuario_id', user.id)
      if (error) throw error
      toast('Saliste del equipo', 'success')
      setProyectoId(null)
      setClaseId(null)
      setActivePage('mis-clases')
    } catch (e) {
      toast('Error al salir del equipo', 'error')
    }
  }

  async function regenerarCodigo() {
    if (!proyectoId || !proyecto) return
    if (!confirm('¿Generar un nuevo código de equipo? El código anterior dejará de funcionar.')) return
    try {
      const nuevo = Math.random().toString(36).substring(2, 10).toUpperCase()
      const { error } = await supabase.from('proyectos').update({ codigo_grupo: nuevo }).eq('id', proyectoId)
      if (error) throw error
      setProyecto({ ...proyecto, codigo_grupo: nuevo })
      toast('Código regenerado', 'success')
    } catch (e) {
      toast('Error al regenerar el código', 'error')
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Cargando equipo...</div>
  }

  if (!proyecto) {
    return (
      <Card>
        <CardTitle icon="👥">Mi Equipo</CardTitle>
        <CardSubtitle>Todavía no tenés un proyecto activo en esta clase.</CardSubtitle>
      </Card>
    )
  }

  return (
    <div className="animate-in">
      <Card>
        <CardTitle icon="👥">Mi Equipo</CardTitle>
        <CardSubtitle>{proyecto.nombre_emprendimiento}</CardSubtitle>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {miembros.map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {m.nombre_completo}
                  {m.esLider && <span style={{ marginLeft: 8, fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent)' }}>LÍDER</span>}
                  {!m.esLider && m.usuario_id === user?.id && <span style={{ marginLeft: 8, fontSize: '0.65rem', fontWeight: 700, color: 'var(--text3)' }}>VOS</span>}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{m.email}</div>
              </div>
              {esLider && !m.esLider && (
                <button onClick={() => expulsarMiembro(m)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                  Expulsar
                </button>
              )}
            </div>
          ))}
        </div>

        {esLider ? (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Btn variant="primary" onClick={abrirModalAgregar}>＋ Agregar compañeros</Btn>
            <Btn variant="secondary" onClick={regenerarCodigo}>🔄 Regenerar código</Btn>
          </div>
        ) : (
          <Btn variant="danger" onClick={salirDelEquipo}>Salir del equipo</Btn>
        )}

        {proyecto.codigo_grupo && (
          <div style={{ marginTop: 20, padding: 12, background: 'rgba(124,106,247,0.05)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Código de equipo (para sincronizar)</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '1px' }}>{proyecto.codigo_grupo}</div>
          </div>
        )}
      </Card>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 460, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', marginBottom: 8 }}>Agregar compañeros</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text2)', marginBottom: 16 }}>Seleccioná compañeros de tu curso que todavía no tengan equipo.</p>

            {cargandoDisponibles ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3)' }}>Cargando...</div>
            ) : disponibles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3)', fontSize: '0.85rem' }}>No hay compañeros disponibles por ahora.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {disponibles.map(c => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={seleccionados.has(c.id)} onChange={() => toggleSeleccion(c.id)} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.nombre_completo}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{c.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <Btn variant="ghost" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Cancelar</Btn>
              <Btn variant="primary" style={{ flex: 1 }} onClick={confirmarAgregar} disabled={guardando || seleccionados.size === 0}>
                {guardando ? 'Agregando...' : `Agregar (${seleccionados.size})`}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
