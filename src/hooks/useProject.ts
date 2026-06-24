import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { calcCompleteness, FORM_VACIO, ESTADO_VACIO } from '../lib/calculos'
import type { DatosForm, ProyectoEstado, Proyecto } from '../types'

type ProyectoPayload = Omit<Proyecto, 'id' | 'estado'> & {
  estado: string
  updated_at: string
  codigo_grupo?: string
}

export function useProject() {
  const { user, proyectoId, form, estado, setProyectoId, loadProject, setDirty } = useStore()

  const saveToCloud = useCallback(async () => {
    if (!user) return
    try {
      const comp = calcCompleteness(form, estado.secciones_aprobadas || [])
      const payload: ProyectoPayload = {
        usuario_id: user.id,
        nombre_emprendimiento: form.i_nombre_emp || 'Sin nombre',
        rubro: form.i_rubro || null,
        datos_form: form,
        datos_estado: estado,
        completitud: comp.overall,
        estado: 'en_progreso',
        updated_at: new Date().toISOString(),
      }

      // Vincular a clase - Muy importante extraerlo del store
      const currentClaseId = useStore.getState().claseId
      if (currentClaseId) {
        payload.clase_id = currentClaseId
        console.log('[useProject] Vinculando proyecto a clase:', currentClaseId)
      } else {
        console.warn('[useProject] Guardando proyecto SIN clase vinculada')
      }

      console.log('[useProject] Intentando guardar proyecto con payload:', payload)

      if (proyectoId) {
        const { error } = await supabase.from('proyectos').update(payload).eq('id', proyectoId)
        if (error) {
          console.error('[useProject] Error en UPDATE:', error.code, error.message, error.details)
          throw error
        }
      } else {
        // Al crear uno nuevo, le generamos un código de grupo
        payload.codigo_grupo = Math.random().toString(36).substring(2, 10).toUpperCase()
        const { data, error } = await supabase.from('proyectos').insert(payload).select().single()
        if (error) {
          console.error('[useProject] Error en INSERT:', error.code, error.message, error.details)
          throw error
        }
        if (data) setProyectoId(data.id)
      }
      setDirty(false)
      return true
    } catch (e: unknown) {
      console.error('[useProject] Error fatal en saveToCloud:', e)
      return false
    }
  }, [user, proyectoId, form, estado])

  const loadFromCloud = useCallback(async (specificClaseId?: string) => {
    if (!user) return false
    try {
      // 1. Reset
      setProyectoId(null)
      loadProject({ ...FORM_VACIO }, { ...ESTADO_VACIO })

      const targetClaseId = specificClaseId || useStore.getState().claseId
      
      // 2. Buscar proyecto (propio o como participante)
      let foundProjectId: string | null = null
      let projectData: any = null

      // Intentar buscar como dueño
      const { data: own } = await supabase
        .from('proyectos')
        .select('*')
        .eq('usuario_id', user.id)
        .filter('clase_id', targetClaseId ? 'eq' : 'is', targetClaseId)
        .maybeSingle()
      
      if (own) {
        projectData = own
        foundProjectId = own.id
      } else {
        // Intentar buscar como participante
        const { data: particip } = await supabase
          .from('proyecto_participantes')
          .select('proyecto_id, proyectos(*)')
          .eq('usuario_id', user.id)
          .maybeSingle()
        
        if (particip?.proyectos) {
          // Validar que sea de la clase actual
          if ((particip.proyectos as any).clase_id === targetClaseId) {
            projectData = particip.proyectos
            foundProjectId = (particip.proyectos as any).id
          }
        }
      }

      let f: DatosForm = { ...FORM_VACIO }
      let e: ProyectoEstado = { ...ESTADO_VACIO }

      if (projectData) {
        setProyectoId(foundProjectId)
        f = typeof projectData.datos_form === 'string' ? JSON.parse(projectData.datos_form) : projectData.datos_form
        e = typeof projectData.datos_estado === 'string' ? JSON.parse(projectData.datos_estado) : projectData.datos_estado
      }

      // SIEMPRE inyectar datos de la clase si estamos en un contexto de clase
      if (targetClaseId) {
        const { data: cl } = await supabase.from('clases').select('*').eq('id', targetClaseId).maybeSingle()
        if (cl) {
          f.i_escuela = cl.escuela || f.i_escuela
          f.i_curso = cl.curso || f.i_curso
          f.i_materia = cl.materia || f.i_materia
          f.i_ciclo = cl.ciclo_lectivo || f.i_ciclo
          const { data: prof } = await supabase.from('perfiles').select('nombre_completo').eq('id', cl.profesor_id).maybeSingle()
          if (prof) f.i_docente = prof.nombre_completo || f.i_docente
        }
      }
      
      loadProject(f, e)
      return !!projectData
    } catch (e) {
      console.error('[useProject] loadFromCloud error:', e)
      return false
    }
  }, [user, loadProject, setProyectoId])

  const joinProjectByCode = useCallback(async (code: string) => {
    if (!user) return { ok: false, msg: 'No hay usuario' }
    try {
      const { data: proj, error } = await supabase
        .from('proyectos')
        .select('id, clase_id')
        .eq('codigo_grupo', code.toUpperCase())
        .maybeSingle()
      
      if (error || !proj) return { ok: false, msg: 'Código de grupo no encontrado' }

      // Unirse como participante
      const { error: errJoin } = await supabase
        .from('proyecto_participantes')
        .insert({
          proyecto_id: proj.id,
          usuario_id: user.id
        })
      
      if (errJoin) {
        if (errJoin.code === '23505') return { ok: true, id: proj.id } // Ya estaba unido
        throw errJoin
      }

      return { ok: true, id: proj.id, claseId: proj.clase_id }
    } catch (e) {
      console.error(e)
      return { ok: false, msg: 'Error al unirse al equipo' }
    }
  }, [user])

  return { saveToCloud, loadFromCloud, joinProjectByCode }
}
