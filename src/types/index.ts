// ── AUTH ────────────────────────────────────────────────────
export type UserRole = 'profesor' | 'estudiante'

export interface Perfil {
  id: string
  nombre_completo: string
  email: string
  rol: UserRole
  codigo_clase?: string | null
  avatar_url?: string | null
  escuela?: string | null
  nota?: number | null
  feedback_docente?: string | null
  created_at?: string
}

// ── FEEDBACK ─────────────────────────────────────────────────
export interface ComentarioSeccion {
  id: string
  proyecto_id: string
  seccion: string // 'institucional', 'estrategica', etc.
  usuario_id: string
  usuario_nombre: string
  texto: string
  leido_estudiante: boolean
  leido_profesor: boolean
  created_at: string
}

// ── PROYECTO STATE ───────────────────────────────────────────
export interface Miembro {
  id: number
  nombre: string
  rol: string
  dni: string
}

export interface Competidor {
  id: number
  nombre: string
  producto: string
  precio: string
  fortaleza: string
  debilidad: string
}

export interface Equipo {
  id: number
  nombre: string
  cantidad: number
  precio: number
  tiene: 'Sí' | 'No' | 'Parcial'
}

export interface LineaPresupuesto {
  id: number
  concepto: string
  cantidad: number
  precio: number
}

export interface ProductoPronostico {
  id: number
  nombre: string
  precio: number
  costo: number
  margen: number
  crecimientoMensual: number // Porcentaje de crecimiento mensual (ej: 5 para 5%)
  semanas: [number, number, number, number] // [s1, s2, s3, s4] del Mes 1
}

export interface ManoObra {
  id: number
  nombre: string
  horas: number
  valorHora: number
}

export interface GastoFijo {
  id: number
  concepto: string
  tipo: 'Comercial' | 'Administrativo' | 'Operativo' | 'Otros'
  monto: number
}

export interface DatosForm {
  // Institucional
  i_escuela: string
  i_modalidad: string
  i_curso: string
  i_materia: string
  i_docente: string
  i_ciclo: string
  i_nombre_emp: string
  i_rubro: string
  i_tipo_negocio: string   // 'Producto' | 'Servicio' | 'Producto + Servicio'
  i_slogan: string          // Tagline/lema del emprendimiento (max 80 chars)
  i_desc_breve: string      // Descripción breve de qué hace el emprendimiento
  // Estratégica
  e_mision: string
  e_vision: string
  e_objetivos: string
  e_fortalezas: string
  e_oportunidades: string
  e_debilidades: string
  e_amenazas: string
  e_propuesta_valor: string  // ¿Qué problema resolvés y para quién?
  // Marketing
  m_segmento: string
  m_perfil: string
  m_zona: string
  m_canal: string
  m_producto: string
  m_precio_mix: string
  m_plaza: string
  m_promocion: string
  m_costo_unit: string
  m_margen: string
  m_precio_venta: string
  // Producción
  p_proceso: string
  p_capacidad: string
  p_instalacion: string
  p_superficie: string
  p_ubicacion: string
  p_costo_local: string
  p_desc_local: string
  p_inv_equip: string
  p_inv_mp: string
  p_inv_otros: string
  p_inv_total: string
  // Financiero
  f_precio_u: string
  f_costo_u: string
  f_s1: string
  f_s2: string
  f_s3: string
  f_s4: string
  f_costos_fijos: string
  f_pvu: string
  f_cvu: string
  // Legal
  l_forma: string
  l_impositivo: string
  l_notas: string
}

export interface ProyectoEstado {
  members: Miembro[]
  competidores: Competidor[]
  equipos: Equipo[]
  presupVenta: LineaPresupuesto[]
  materiaPrima: LineaPresupuesto[]
  manoObraDirecta: ManoObra[]
  gastosFijos: GastoFijo[]
  pronosticoVentas: ProductoPronostico[]
  tramitesDone: Record<string, boolean>
  secciones_aprobadas?: string[]
  valores: string[]  // Valores del emprendimiento (ej: Honestidad, Innovación)
}

export interface Proyecto {
  id?: string
  usuario_id: string
  clase_id?: string | null
  nombre_emprendimiento: string
  rubro?: string | null
  datos_form: DatosForm
  datos_estado: ProyectoEstado
  completitud: number
  estado: 'borrador' | 'en_progreso' | 'completado' | 'entregado' | 'calificado'
  nota?: number | null
  feedback_docente?: string | null
  secciones_aprobadas?: string[] // Duplicado aquí para facilidad de consulta si es columna
  updated_at?: string
}

// ── CÁLCULOS FINANCIEROS ─────────────────────────────────────
export interface ResultadoSemana {
  semana: number
  unidades: number
  precioUnitario: number
  ingresos: number
  costoVariable: number
  costoFijoProporcionado: number
  resultado: number
}

export interface ResultadoMes {
  mes: number
  ingresos: number
  costoVariable: number
  costoFijo: number
  resultado: number
  unidades: number
}

export interface CalculoFinanciero {
  semanas: ResultadoSemana[] // Detalle del Mes 1
  proyeccionMensual: ResultadoMes[] // Proyección a 6 meses
  totalIngresos: number // Mes 1
  totalCostoVariable: number // Mes 1
  totalCostoFijo: number // Mes 1
  totalResultado: number // Mes 1
  margenContribucion: number
  puntoEquilibrioUnidades: number
  puntoEquilibrioMonto: number
  cvuPromedio: number
  cfuPromedio: number
}

export interface Completeness {
  institucional: number
  estrategica: number
  marketing: number
  produccion: number
  financiera: number
  legal: number
  overall: number
}
