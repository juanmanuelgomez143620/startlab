import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import type { Perfil } from '../types'

export function useAuth() {
  const { user, perfil, setUser, setPerfil, setProyectoId, logout } = useStore()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? '' })
        fetchPerfil(session.user.id)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? '' })
        fetchPerfil(session.user.id)
      } else {
        logout()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchPerfil(uid: string) {
    const { data } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle()
    if (data) setPerfil(data as Perfil)
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signUp(email: string, password: string, nombre: string, rol: 'profesor' | 'estudiante', codigoClase?: string) {
    let claseId = null
    
    // Validar código si es estudiante
    if (rol === 'estudiante') {
      if (!codigoClase) throw new Error('Debes ingresar un código de clase para registrarte como alumno.')
      
      const { data: clase, error: errClase } = await supabase
        .from('clases')
        .select('id')
        .eq('codigo', codigoClase.toUpperCase())
        .maybeSingle()
      
      if (!clase || errClase) throw new Error('El código de clase ingresado no es válido o la clase ya no existe.')
      claseId = clase.id
    }

    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nombre_completo: nombre, rol } },
    })
    
    if (error) throw error
    if (!data.user) throw new Error('No se pudo crear el usuario')

    // Crear el perfil con el código
    const { error: errPerfil } = await supabase.from('perfiles').upsert({
      id: data.user.id,
      nombre_completo: nombre,
      email,
      rol,
      codigo_clase: codigoClase?.toUpperCase() || null,
    }, { onConflict: 'id' })

    if (errPerfil) console.error("Error upserting perfil:", errPerfil)

    // Unirse formalmente a la clase
    if (claseId) {
      await supabase.from('clase_estudiantes').upsert({
        clase_id: claseId,
        estudiante_id: data.user.id,
      }, { onConflict: 'clase_id,estudiante_id' })
    }
    
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProyectoId(null)
    logout()
  }

  return { user, perfil, signIn, signUp, signOut, isLoggedIn: !!user }
}
