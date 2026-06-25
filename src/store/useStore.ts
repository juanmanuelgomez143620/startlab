import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DatosForm, ProyectoEstado, Perfil } from '../types'
import { FORM_VACIO, ESTADO_VACIO } from '../lib/calculos'

interface AuthState {
  user: { id: string; email: string } | null
  perfil: Perfil | null
  proyectoId: string | null
  claseId: string | null
  proyectoContexto: { alumno: string; emprendimiento: string } | null
  setUser: (u: { id: string; email: string } | null) => void
  setPerfil: (p: Perfil | null) => void
  setProyectoId: (id: string | null) => void
  setClaseId: (id: string | null) => void
  setProyectoContexto: (ctx: { alumno: string; emprendimiento: string } | null) => void
  logout: () => void
}

interface FormState {
  form: DatosForm
  estado: ProyectoEstado
  setField: (key: keyof DatosForm, value: string) => void
  setEstado: (partial: Partial<ProyectoEstado>) => void
  loadProject: (form: DatosForm, estado: ProyectoEstado) => void
  reset: () => void
}

interface UIState {
  activePage: string
  isSidebarOpen: boolean
  isDirty: boolean
  setActivePage: (p: string) => void
  setSidebarOpen: (v: boolean) => void
  setDirty: (v: boolean) => void
}

type Store = AuthState & FormState & UIState

export const useStore = create<Store>()(
  persist(
    (set) => ({
      // ── Auth ──
      user: null,
      perfil: null,
      proyectoId: null,
      claseId: null,
      proyectoContexto: null,
      setUser: (user: { id: string; email: string } | null) => set({ user }),
      setPerfil: (perfil: Perfil | null) => set({ perfil }),
      setProyectoId: (proyectoId: string | null) => set({ proyectoId }),
      setClaseId: (claseId: string | null) => set({ claseId }),
      setProyectoContexto: (proyectoContexto: { alumno: string; emprendimiento: string } | null) => set({ proyectoContexto }),
      logout: () => set({ user: null, perfil: null, proyectoId: null, claseId: null, proyectoContexto: null }),

      // ── Form ──
      form: { ...FORM_VACIO },
      estado: { ...ESTADO_VACIO },

      setField: (key: keyof DatosForm, value: string) =>
        set((s: Store) => ({
          form: { ...s.form, [key]: value },
          isDirty: true,
        })),

      setEstado: (partial: Partial<ProyectoEstado>) =>
        set((s: Store) => {
          const newState = { ...s.estado, ...partial }
          return {
            estado: newState,
            isDirty: true,
          }
        }),

      loadProject: (formInput: DatosForm, estadoInput: ProyectoEstado) =>
        set({ 
          form: { ...FORM_VACIO, ...formInput }, 
          estado: { ...ESTADO_VACIO, ...estadoInput }, 
          isDirty: false 
        }),

      reset: () =>
        set({ form: { ...FORM_VACIO }, estado: { ...ESTADO_VACIO }, isDirty: false }),

      // ── UI ──
      activePage: 'institucional',
      isSidebarOpen: false,
      isDirty: false,
      setActivePage: (activePage: string) => set({ activePage }),
      setSidebarOpen: (isSidebarOpen: boolean) => set({ isSidebarOpen }),
      setDirty: (isDirty: boolean) => set({ isDirty }),
    }),
    {
      name: 'startlab-v3',
      version: 3,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Partial<Store>
        if (version <= 2) {
          if (state?.estado) state.estado = { ...ESTADO_VACIO, ...state.estado }
          if (state?.form) state.form = { ...FORM_VACIO, ...state.form }
        }
        return state as Store
      },
      partialize: (s) => ({
        form: s.form,
        estado: s.estado,
        proyectoId: s.proyectoId,
        claseId: s.claseId,
        proyectoContexto: s.proyectoContexto,
      }),
    }
  )
)
