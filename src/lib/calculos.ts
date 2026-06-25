/**
 * Motor de cálculos financieros — Startlab
 * Versión corregida con validaciones y precisión numérica
 */

import type {
  DatosForm,
  ProyectoEstado,
  CalculoFinanciero,
  ResultadoSemana,
  ResultadoMes,
  Completeness,
} from '../types'

// ── HELPERS ─────────────────────────────────────────────────
export const n = (v: string | number | undefined | null): number => {
  const parsed = parseFloat(String(v ?? '0'))
  return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed
}

export const round2 = (v: number): number => Math.round(v * 100) / 100

export const fmt = (v: number): string =>
  Math.round(v).toLocaleString('es-AR')

export const fmtDecimal = (v: number): string =>
  v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── CÁLCULO PRECIO DE VENTA ──────────────────────────────────
export function calcPrecioVenta(costoUnitario: number, margenPct: number): number {
  if (costoUnitario <= 0) return 0
  return round2(costoUnitario * (1 + margenPct / 100))
}

// ── CÁLCULO INVERSIÓN INICIAL ────────────────────────────────
export function calcInversionTotal(
  invEquip: number,
  invMP: number,
  invOtros: number
): number {
  return round2(invEquip + invMP + invOtros)
}

// ── TOTALES DE TABLAS ────────────────────────────────────────
export function calcTotalEquipamiento(equipos: ProyectoEstado['equipos']): number {
  return round2((equipos || []).reduce((acc, e) => acc + (e.cantidad || 1) * (e.precio || 0), 0))
}

export function calcTotalMateriaPrima(mp: ProyectoEstado['materiaPrima']): number {
  return round2((mp || []).reduce((acc, m) => acc + (m.cantidad || 0) * (m.precio || 0), 0))
}

export function calcTotalMOD(mod: ProyectoEstado['manoObraDirecta']): number {
  return round2((mod || []).reduce((acc, m) => acc + (m.horas || 0) * (m.valorHora || 0), 0))
}

export function calcTotalGastosFijos(gastos: ProyectoEstado['gastosFijos']): number {
  return round2((gastos || []).reduce((acc, g) => acc + (g.monto || 0), 0))
}

export function calcTotalPresupVentas(pv: ProyectoEstado['presupVenta']): number {
  return round2(pv.reduce((acc, p) => acc + (p.cantidad || 0) * (p.precio || 0), 0))
}

// ── CÁLCULO FINANCIERO PRINCIPAL ─────────────────────────────
/**
 * Calcula todas las métricas financieras del plan.
 * 
 * CORRECCIONES vs versión anterior:
 * 1. Los costos fijos mensuales se dividen equitativamente entre 4 semanas
 *    pero el TOTAL acumulado en 4 semanas = costos fijos * 1 (no * 4)
 *    porque ya se distribuyó 1 mes = 4 semanas
 * 2. El margen de contribución se calcula sobre el precio, no sobre el costo
 * 3. El punto de equilibrio usa costos fijos MENSUALES (no semanales)
 * 4. Validación de división por cero en todos los cálculos
 */
export function calcFinanciero(
  form: Pick<DatosForm, 'f_costos_fijos' | 'f_pvu' | 'f_cvu'>,
  estado: Pick<ProyectoEstado, 'gastosFijos' | 'pronosticoVentas' | 'materiaPrima' | 'manoObraDirecta'>
): CalculoFinanciero {
  // Costos fijos mensuales base
  const costosFijosMensuales = n(form.f_costos_fijos) > 0
    ? n(form.f_costos_fijos)
    : calcTotalGastosFijos(estado.gastosFijos)

  const pronostico = estado.pronosticoVentas || []

  // 1. CÁLCULO MES 1 (Detalle Semanal)
  const costoFijoSemanal = round2(costosFijosMensuales / 4)
  const semanas: ResultadoSemana[] = [1, 2, 3, 4].map(num => ({
    semana: num,
    unidades: 0,
    precioUnitario: 0,
    ingresos: 0,
    costoVariable: 0,
    costoFijoProporcionado: costoFijoSemanal,
    resultado: -costoFijoSemanal,
  }))

  const totalVariablesMes1 = calcTotalMateriaPrima(estado.materiaPrima || []) + calcTotalMOD(estado.manoObraDirecta || [])
  
  let totalUnidadesMes1 = 0
  pronostico.forEach(p => {
    const p_semanas = p.semanas || [0, 0, 0, 0]
    p_semanas.forEach(cant => { totalUnidadesMes1 += n(cant) })
  })

  // Promedios unitarios (Base para el negocio)
  const cvuPromedio = totalUnidadesMes1 > 0 ? round2(totalVariablesMes1 / totalUnidadesMes1) : 0
  const cfuPromedio = totalUnidadesMes1 > 0 ? round2(costosFijosMensuales / totalUnidadesMes1) : 0

  let totalIngresosMes1 = 0
  pronostico.forEach(p => {
    const p_semanas = p.semanas || [0, 0, 0, 0]
    // El precio se calcula dinámicamente: CVU PROMEDIO * (1 + Margen/100)
    const precioCalculado = round2(cvuPromedio * (1 + (n(p.margen) / 100)))
    
    p_semanas.forEach((cant, idx) => {
      const u = n(cant)
      const ing = round2(u * precioCalculado)
      semanas[idx].unidades += u
      semanas[idx].ingresos += ing
      totalIngresosMes1 += ing
    })
  })

  // Sincronizar costos variables semanales usando el CVU promedio
  semanas.forEach(s => {
    s.costoVariable = round2(s.unidades * cvuPromedio)
    s.resultado = round2(s.ingresos - s.costoVariable - s.costoFijoProporcionado)
  })

  const totalCostoVariableMes1 = round2(totalUnidadesMes1 * cvuPromedio)

  // 2. PROYECCIÓN A 6 MESES
  const proyeccionMensual: ResultadoMes[] = []
  for (let m = 1; m <= 6; m++) {
    let mesIngresos = 0
    let mesCostosV = 0
    let mesUnidades = 0

    pronostico.forEach(p => {
      const p_semanas = p.semanas || [0, 0, 0, 0]
      const unidadesM1 = p_semanas.reduce((a, b) => a + n(b), 0)
      const factorCrecimiento = Math.pow(1 + (n(p.crecimientoMensual || 0) / 100), m - 1)
      const unidadesMes = Math.round(unidadesM1 * factorCrecimiento)
      
      const precioCalculado = round2(cvuPromedio * (1 + (n(p.margen) / 100)))
      
      mesUnidades += unidadesMes
      mesIngresos += round2(unidadesMes * precioCalculado)
    })

    mesCostosV = round2(mesUnidades * cvuPromedio)

    proyeccionMensual.push({
      mes: m,
      unidades: mesUnidades,
      ingresos: mesIngresos,
      costoVariable: mesCostosV,
      costoFijo: costosFijosMensuales,
      resultado: round2(mesIngresos - mesCostosV - costosFijosMensuales)
    })
  }

  // Margen de contribución ponderado
  let margenContribucion = 0
  if (totalIngresosMes1 > 0) {
    margenContribucion = round2(((totalIngresosMes1 - totalCostoVariableMes1) / totalIngresosMes1) * 100)
  } else if (pronostico.length > 0) {
    const mcSuma = pronostico.reduce((acc, p) => {
      const p_n = n(p.precio)
      return acc + (p_n > 0 ? (p_n - n(p.costo)) / p_n : 0)
    }, 0)
    margenContribucion = round2((mcSuma / pronostico.length) * 100)
  }

  // Punto de equilibrio
  let puntoEquilibrioMonto = 0
  if (margenContribucion > 0) {
    puntoEquilibrioMonto = round2(costosFijosMensuales / (margenContribucion / 100))
  }

  let puntoEquilibrioUnidades = 0
  const precioPromedio = pronostico.length > 0 
    ? pronostico.reduce((acc, p) => acc + n(p.precio), 0) / pronostico.length 
    : (n(form.f_pvu) || 1)

  if (puntoEquilibrioMonto > 0) {
    puntoEquilibrioUnidades = Math.ceil(puntoEquilibrioMonto / precioPromedio)
  }

  return {
    semanas: semanas.map(s => ({ ...s, ingresos: round2(s.ingresos), costoVariable: round2(s.costoVariable), resultado: round2(s.resultado) })),
    proyeccionMensual,
    totalIngresos: round2(totalIngresosMes1),
    totalCostoVariable: round2(totalCostoVariableMes1),
    totalCostoFijo: costosFijosMensuales,
    totalResultado: round2(totalIngresosMes1 - totalCostoVariableMes1 - costosFijosMensuales),
    margenContribucion,
    puntoEquilibrioUnidades,
    puntoEquilibrioMonto,
    cvuPromedio,
    cfuPromedio
  }
}

// ── COMPLETITUD DEL PLAN ─────────────────────────────────────
const SECCIONES_CAMPOS: Record<keyof Omit<Completeness, 'overall'>, (keyof DatosForm)[]> = {
  institucional: ['i_escuela', 'i_modalidad', 'i_curso', 'i_materia', 'i_docente', 'i_ciclo', 'i_nombre_emp', 'i_tipo_negocio', 'i_desc_breve'],
  estrategica: ['e_mision', 'e_vision', 'e_propuesta_valor', 'e_objetivos', 'e_fortalezas', 'e_oportunidades', 'e_debilidades', 'e_amenazas'],
  marketing: ['m_segmento', 'm_perfil', 'm_producto', 'm_precio_mix', 'm_plaza', 'm_promocion'],
  produccion: ['p_proceso', 'p_inv_total'],
  financiera: ['f_precio_u', 'f_costo_u', 'f_s1'],
  legal: ['l_forma'],
}

export function calcCompleteness(form: DatosForm, aprobadas: string[] = []): Completeness {
  let totalCampos = 0
  let totalRellenos = 0
  const result: Partial<Completeness> = {}

  for (const [seccion, campos] of Object.entries(SECCIONES_CAMPOS)) {
    const rellenos = campos.filter(c => form[c] && String(form[c]).trim() !== '').length
    const pct = Math.round((rellenos / campos.length) * 100)
    result[seccion as keyof Omit<Completeness, 'overall'>] = pct
    totalCampos += campos.length
    totalRellenos += rellenos
  }

  // El progreso general (overall) ahora depende de las aprobaciones del docente
  // Son 6 secciones: institucional, estrategica, marketing, produccion, financiera, legal
  const totalSecciones = 6
  result.overall = Math.round((aprobadas.length / totalSecciones) * 100)
  
  return result as Completeness
}

// ── DATOS VACÍOS ─────────────────────────────────────────────
export const FORM_VACIO: DatosForm = {
  i_escuela: '', i_modalidad: '', i_curso: '', i_materia: '',
  i_docente: '', i_ciclo: '', i_nombre_emp: '', i_rubro: '',
  i_tipo_negocio: '', i_slogan: '', i_desc_breve: '',
  e_mision: '', e_vision: '', e_objetivos: '', e_propuesta_valor: '',
  e_fortalezas: '', e_oportunidades: '', e_debilidades: '', e_amenazas: '',
  m_segmento: '', m_perfil: '', m_zona: '', m_canal: '',
  m_producto: '', m_precio_mix: '', m_plaza: '', m_promocion: '',
  m_costo_unit: '', m_margen: '30', m_precio_venta: '',
  p_proceso: '', p_capacidad: '', p_instalacion: '', p_superficie: '',
  p_ubicacion: '', p_costo_local: '', p_desc_local: '',
  p_inv_equip: '', p_inv_mp: '', p_inv_otros: '', p_inv_total: '',
  f_precio_u: '', f_costo_u: '',
  f_s1: '', f_s2: '', f_s3: '', f_s4: '',
  f_costos_fijos: '', f_pvu: '', f_cvu: '',
  l_forma: '', l_impositivo: '', l_notas: '',
}

export const ESTADO_VACIO: ProyectoEstado = {
  members: [],
  competidores: [],
  equipos: [],
  presupVenta: [],
  materiaPrima: [],
  manoObraDirecta: [],
  gastosFijos: [],
  pronosticoVentas: [],
  tramitesDone: {},
  valores: [],
}
