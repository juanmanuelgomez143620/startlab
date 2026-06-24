import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { calcCompleteness } from '../lib/calculos'
import { Card, CardTitle, CardSubtitle, Btn, toast } from './ui'
import type { ComentarioSeccion } from '../types'

interface Props {
  section: string
}

export function FeedbackPanel({ section }: Props) {
  const { user, perfil, proyectoId, estado, setEstado } = useStore()
  const [comentarios, setComentarios] = useState<ComentarioSeccion[]>([])
  const [nuevo, setNuevo] = useState('')
  const [loading, setLoading] = useState(false)
  
  const isDocente = perfil?.rol === 'profesor'
  const isAprobada = estado.secciones_aprobadas?.includes(section)

  useEffect(() => {
    if (proyectoId) fetchComentarios()
  }, [proyectoId, section])

  async function fetchComentarios() {
    const { data } = await supabase
      .from('comentarios_secciones')
      .select('*')
      .eq('proyecto_id', proyectoId)
      .eq('seccion', section)
      .order('created_at', { ascending: true })
    
    if (data) {
      setComentarios(data)
      // Marcar como leídos para el rol actual
      const idsNoLeidos = data
        .filter(c => isDocente ? !c.leido_profesor : !c.leido_estudiante)
        .map(c => c.id)
      
      if (idsNoLeidos.length > 0) {
        await supabase
          .from('comentarios_secciones')
          .update(isDocente ? { leido_profesor: true } : { leido_estudiante: true })
          .in('id', idsNoLeidos)
      }
    }
  }

  async function enviarComentario() {
    if (!nuevo.trim() || !user || !proyectoId) return
    setLoading(true)
    
    const { error } = await supabase.from('comentarios_secciones').insert({
      proyecto_id: proyectoId,
      seccion: section,
      usuario_id: user.id,
      usuario_nombre: perfil?.nombre_completo || 'Usuario',
      texto: nuevo.trim(),
      leido_estudiante: !isDocente, // Si soy alumno, yo ya lo leí
      leido_profesor: isDocente     // Si soy docente, yo ya lo leí
    })

    if (error) {
      console.error('[Feedback] Insert error:', error)
      if (error.message.includes('column') || error.code === '42703') {
        toast('❌ Errores en la DB. Por favor, ejecuta el script SQL de actualización en Supabase.', 'error')
      } else {
        toast('Error al enviar comentario: ' + error.message, 'error')
      }
    } else {
      setNuevo('')
      fetchComentarios()
    }
    setLoading(false)
  }

  const toggleAprobacion = async () => {
    if (!isDocente || !proyectoId) return
    
    const nuevas = isAprobada 
      ? (estado.secciones_aprobadas || []).filter(s => s !== section)
      : [...(estado.secciones_aprobadas || []), section]
    
    setEstado({ secciones_aprobadas: nuevas })
    toast(isAprobada ? 'Sección desaprobada' : '¡Sección aprobada!', 'info')
    
    // Calcular nueva completitud basada en aprobaciones
    const { form } = useStore.getState()
    const comp = calcCompleteness(form, nuevas)

    // Guardar inmediatamente en la nube si es docente
    await supabase.from('proyectos').update({
        datos_estado: { ...estado, secciones_aprobadas: nuevas },
        completitud: comp.overall
    }).eq('id', proyectoId)
  }

  return (
    <div style={{ marginTop: 40, borderTop: '2px solid var(--border)', paddingTop: 30 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--text)' }}>
             💬 Feedback del Docente
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text2)' }}>Comentarios y observaciones sobre esta sección.</p>
        </div>
        
        {isDocente ? (
          <Btn 
            variant={isAprobada ? 'success' : 'primary'} 
            onClick={toggleAprobacion}
          >
            {isAprobada ? '✅ SECCIÓN APROBADA' : '🏁 APROBAR SECCIÓN'}
          </Btn>
        ) : isAprobada && (
          <div style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--success)', padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(34,197,94,0.2)' }}>
            ✨ SECCIÓN APROBADA POR TU DOCENTE
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 20 }}>
        {comentarios.length === 0 ? (
          <div style={{ color: 'var(--text3)', fontSize: '0.85rem', fontStyle: 'italic', background: 'var(--bg2)', padding: 16, borderRadius: 12, border: '1px dashed var(--border)' }}>
            Sin comentarios en esta sección aún.
          </div>
        ) : (
          comentarios.map(c => (
             <div key={c.id} style={{ 
               background: c.usuario_id === user?.id ? 'rgba(124,106,247,0.05)' : 'var(--bg2)',
               padding: 12, borderRadius: 12, border: '1px solid var(--border)',
               alignSelf: c.usuario_id === user?.id ? 'flex-end' : 'flex-start',
               maxWidth: '85%'
             }}>
               <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                 <span>{c.usuario_nombre.toUpperCase()}</span>
                 <span style={{ fontWeight: 400, color: 'var(--text3)' }}>{new Date(c.created_at).toLocaleDateString()}</span>
               </div>
               <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{c.texto}</div>
             </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <textarea 
          value={nuevo}
          onChange={e => setNuevo(e.target.value)}
          placeholder="Escribí un comentario u observación..."
          style={{ 
            flex: 1, height: 80, borderRadius: 12, padding: 12, fontSize: '0.85rem',
            background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)',
            resize: 'none'
          }}
        />
        <Btn onClick={enviarComentario} disabled={loading || !nuevo.trim()} variant="secondary" style={{ height: 'fit-content' }}>
          Enviar 📤
        </Btn>
      </div>
    </div>
  )
}
