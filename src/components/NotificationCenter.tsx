import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import type { ComentarioSeccion } from '../types'
import { toast } from './ui'

interface NotificacionFeedback extends ComentarioSeccion {
  proyectos?: {
    id: string
    nombre_emprendimiento: string
    perfiles?: {
      nombre_completo: string
    }
  }
}

export function NotificationCenter() {
  const { user, perfil, proyectoId, setActivePage, setProyectoId, setProyectoContexto } = useStore()
  const [unread, setUnread] = useState<NotificacionFeedback[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isDocente = perfil?.rol === 'profesor'

  useEffect(() => {
    if (!user) return
    fetchUnread()
    
    // Suscripción en tiempo real
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comentarios_secciones' },
        (payload: any) => {
          const nuevo = payload.new as ComentarioSeccion
          // Solo alertar si no es un mensaje propio
          if (nuevo.usuario_id !== user.id) {
             const esParaMi = isDocente ? true : (nuevo.proyecto_id === proyectoId)
             if (esParaMi) {
                toast(`💬 Nuevo feedback: ${nuevo.usuario_nombre} en la sección ${nuevo.seccion}`, 'info')
                fetchUnread()
             }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'comentarios_secciones' },
        () => fetchUnread()
      )
      .subscribe()

    // Polling de respaldo cada 60s
    const interval = setInterval(fetchUnread, 60000)
    
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [user, proyectoId])

  async function fetchUnread() {
    if (!user) return
    
    let query = supabase.from('comentarios_secciones').select('*, proyectos(id, nombre_emprendimiento, perfiles(nombre_completo))')

    if (isDocente) {
      // Un docente ve mensajes que NO leyó el profesor (generalmente escritos por alumnos)
      // Pero solo de sus clases. Para simplificar, obtenemos todos y filtramos por política RLS
      query = query.eq('leido_profesor', false)
    } else {
      // Un alumno ve mensajes que NO leyó el estudiante (escritos por el profesor)
      if (!proyectoId) return
      query = query.eq('proyecto_id', proyectoId).eq('leido_estudiante', false)
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(10)
    
    if (error) {
       // Si es error de tabla o columna no encontrada, no spamear console.error cada 30s
       if (error.code !== '42703' && error.code !== '42P01') {
          console.error('[Notifications] Error:', error)
       }
       return
    }
    
    if (data) setUnread(data as NotificacionFeedback[])
  }

  function handleNotifyClick(notif: any) {
    if (isDocente) {
      // Si el docente hace clic, debe cargar ese proyecto
      setProyectoId(notif.proyectos.id)
      setProyectoContexto({
        alumno: notif.proyectos.perfiles?.nombre_completo || 'Alumno',
        emprendimiento: notif.proyectos.nombre_emprendimiento || 'Emprendimiento'
      })
    }
    setActivePage(notif.seccion)
    setIsOpen(false)
  }

  const badgeCount = unread.length

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          background: 'none', border: 'none', padding: 8, cursor: 'pointer', 
          fontSize: '1.4rem', position: 'relative', display: 'flex', alignItems: 'center' 
        }}
      >
        🔔
        {badgeCount > 0 && (
          <span style={{ 
            position: 'absolute', top: 4, right: 4, background: 'var(--error)', 
            color: '#fff', fontSize: '0.65rem', fontWeight: 800, 
            minWidth: 16, height: 16, borderRadius: 8, 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg)'
          }}>
            {badgeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{ 
          position: 'absolute', top: '100%', right: 0, marginTop: 10,
          width: 320, background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          zIndex: 1000, overflow: 'hidden'
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Notificaciones</span>
            {badgeCount > 0 && <span style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>{badgeCount} nuevas</span>}
          </div>
          
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {unread.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: '0.85rem' }}>
                🎉 No tenés mensajes pendientes
              </div>
            ) : (
              unread.map((n: NotificacionFeedback) => (
                <div 
                  key={n.id} 
                  onClick={() => handleNotifyClick(n)}
                  style={{ 
                    padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,106,247,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                      {n.seccion}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text)', marginBottom: 2, fontWeight: 500 }}>
                    {n.usuario_nombre}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {n.texto}
                  </div>
                  {isDocente && n.proyectos && (
                     <div style={{ fontSize: '0.65rem', color: 'var(--text3)', marginTop: 4, fontStyle: 'italic' }}>
                       Proyecto: {n.proyectos.nombre_emprendimiento}
                     </div>
                  )}
                </div>
              ))
            )}
          </div>
          
          <div 
            onClick={() => { setActivePage(isDocente ? 'admin-seguimiento' : 'institucional'); setIsOpen(false) }}
            style={{ padding: 12, textAlign: 'center', fontSize: '0.75rem', color: 'var(--accent)', cursor: 'pointer', background: 'rgba(124,106,247,0.03)', fontWeight: 600 }}
          >
            Ver todo el feedback
          </div>
        </div>
      )}
    </div>
  )
}
