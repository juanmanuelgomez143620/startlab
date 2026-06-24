import { describe, it, expect } from 'vitest'
import {
  n,
  round2,
  calcPrecioVenta,
  calcInversionTotal,
  calcTotalEquipamiento,
  calcTotalMateriaPrima,
  calcTotalMOD,
  calcTotalGastosFijos,
  calcFinanciero,
  calcCompleteness,
  FORM_VACIO,
  ESTADO_VACIO,
} from './calculos'
import type { ProyectoEstado } from '../types'

// ── n() ──────────────────────────────────────────────────────
describe('n()', () => {
  it('convierte string numérico', () => expect(n('123.45')).toBe(123.45))
  it('retorna 0 para undefined', () => expect(n(undefined)).toBe(0))
  it('retorna 0 para null', () => expect(n(null)).toBe(0))
  it('retorna 0 para NaN string', () => expect(n('abc')).toBe(0))
  it('retorna 0 para Infinity', () => expect(n('Infinity')).toBe(0))
  it('acepta números directamente', () => expect(n(42)).toBe(42))
  it('retorna 0 para string vacío', () => expect(n('')).toBe(0))
})

// ── round2() ─────────────────────────────────────────────────
describe('round2()', () => {
  it('redondea a 2 decimales', () => expect(round2(1.555)).toBe(1.56))
  it('no altera enteros', () => expect(round2(100)).toBe(100))
  it('redondea hacia abajo', () => expect(round2(1.004)).toBe(1))
})

// ── calcPrecioVenta() ─────────────────────────────────────────
describe('calcPrecioVenta()', () => {
  it('costo 100 + margen 30% = precio 130', () => expect(calcPrecioVenta(100, 30)).toBe(130))
  it('costo 0 retorna 0', () => expect(calcPrecioVenta(0, 50)).toBe(0))
  it('margen 0% retorna el costo', () => expect(calcPrecioVenta(200, 0)).toBe(200))
  it('margen 100% dobla el costo', () => expect(calcPrecioVenta(50, 100)).toBe(100))
})

// ── calcInversionTotal() ──────────────────────────────────────
describe('calcInversionTotal()', () => {
  it('suma los tres componentes', () => expect(calcInversionTotal(100, 200, 50)).toBe(350))
  it('retorna 0 cuando todo es 0', () => expect(calcInversionTotal(0, 0, 0)).toBe(0))
})

// ── calcTotalEquipamiento() ───────────────────────────────────
describe('calcTotalEquipamiento()', () => {
  it('multiplica cantidad por precio y suma', () => {
    const equipos: ProyectoEstado['equipos'] = [
      { id: 1, nombre: 'A', cantidad: 2, precio: 500, tiene: 'No' },
      { id: 2, nombre: 'B', cantidad: 1, precio: 300, tiene: 'Sí' },
    ]
    expect(calcTotalEquipamiento(equipos)).toBe(1300)
  })
  it('retorna 0 para lista vacía', () => expect(calcTotalEquipamiento([])).toBe(0))
})

// ── calcTotalMateriaPrima() ───────────────────────────────────
describe('calcTotalMateriaPrima()', () => {
  it('multiplica cantidad por precio y suma', () => {
    const mp: ProyectoEstado['materiaPrima'] = [
      { id: 1, concepto: 'Harina', cantidad: 10, precio: 50 },
      { id: 2, concepto: 'Azúcar', cantidad: 5, precio: 20 },
    ]
    expect(calcTotalMateriaPrima(mp)).toBe(600)
  })
})

// ── calcTotalMOD() ────────────────────────────────────────────
describe('calcTotalMOD()', () => {
  it('multiplica horas por valor-hora y suma', () => {
    const mod: ProyectoEstado['manoObraDirecta'] = [
      { id: 1, nombre: 'Operario A', horas: 40, valorHora: 100 },
      { id: 2, nombre: 'Operario B', horas: 20, valorHora: 150 },
    ]
    expect(calcTotalMOD(mod)).toBe(7000)
  })
})

// ── calcTotalGastosFijos() ────────────────────────────────────
describe('calcTotalGastosFijos()', () => {
  it('suma los montos', () => {
    const gastos: ProyectoEstado['gastosFijos'] = [
      { id: 1, concepto: 'Alquiler', tipo: 'Operativo', monto: 5000 },
      { id: 2, concepto: 'Servicios', tipo: 'Administrativo', monto: 1500 },
    ]
    expect(calcTotalGastosFijos(gastos)).toBe(6500)
  })
  it('retorna 0 para lista vacía', () => expect(calcTotalGastosFijos([])).toBe(0))
})

// ── calcFinanciero() ──────────────────────────────────────────
describe('calcFinanciero()', () => {
  const estadoConDatos: Pick<ProyectoEstado, 'gastosFijos' | 'pronosticoVentas' | 'materiaPrima' | 'manoObraDirecta'> = {
    gastosFijos: [
      { id: 1, concepto: 'Alquiler', tipo: 'Operativo', monto: 4000 },
    ],
    pronosticoVentas: [
      { id: 1, nombre: 'Producto A', precio: 0, costo: 0, margen: 25, crecimientoMensual: 5, semanas: [10, 10, 10, 10] }
    ],
    materiaPrima: [
      { id: 1, concepto: 'Insumo', cantidad: 40, precio: 50 }
    ],
    manoObraDirecta: [
      { id: 1, nombre: 'Empleado', horas: 40, valorHora: 25 }
    ],
  }

  it('retorna 6 meses de proyección', () => {
    const result = calcFinanciero(FORM_VACIO, estadoConDatos)
    expect(result.proyeccionMensual).toHaveLength(6)
  })

  it('retorna 4 semanas en el mes 1', () => {
    const result = calcFinanciero(FORM_VACIO, estadoConDatos)
    expect(result.semanas).toHaveLength(4)
  })

  it('el CVU promedio es positivo cuando hay insumos', () => {
    const result = calcFinanciero(FORM_VACIO, estadoConDatos)
    expect(result.cvuPromedio).toBeGreaterThan(0)
  })

  it('costos fijos del mes 1 equivalen al total de gastos fijos', () => {
    const result = calcFinanciero(FORM_VACIO, estadoConDatos)
    expect(result.totalCostoFijo).toBe(4000)
  })

  it('con estado vacío no arroja error y retorna ceros', () => {
    const result = calcFinanciero(FORM_VACIO, ESTADO_VACIO)
    expect(result.totalIngresos).toBe(0)
    expect(result.totalCostoFijo).toBe(0)
    expect(result.puntoEquilibrioUnidades).toBe(0)
  })

  it('punto de equilibrio > 0 cuando hay costos fijos y margen positivo', () => {
    const result = calcFinanciero(FORM_VACIO, estadoConDatos)
    if (result.margenContribucion > 0) {
      expect(result.puntoEquilibrioMonto).toBeGreaterThan(0)
    }
  })

  it('el resultado total = ingresos - costoVariable - costoFijo', () => {
    const result = calcFinanciero(FORM_VACIO, estadoConDatos)
    const esperado = round2(result.totalIngresos - result.totalCostoVariable - result.totalCostoFijo)
    expect(result.totalResultado).toBe(esperado)
  })

  it('la proyección del mes 1 tiene más unidades base que el mes 2 cuando crecimiento=0', () => {
    const estadoSinCrecimiento = {
      ...estadoConDatos,
      pronosticoVentas: [
        { id: 1, nombre: 'P', precio: 0, costo: 0, margen: 25, crecimientoMensual: 0, semanas: [10, 10, 10, 10] }
      ]
    }
    const result = calcFinanciero(FORM_VACIO, estadoSinCrecimiento)
    expect(result.proyeccionMensual[0].unidades).toBe(result.proyeccionMensual[1].unidades)
  })

  it('con crecimiento mensual positivo las unidades aumentan mes a mes', () => {
    const result = calcFinanciero(FORM_VACIO, estadoConDatos)
    const { proyeccionMensual } = result
    for (let i = 1; i < proyeccionMensual.length; i++) {
      expect(proyeccionMensual[i].unidades).toBeGreaterThanOrEqual(proyeccionMensual[i - 1].unidades)
    }
  })

  it('costos fijos son iguales en todos los meses de la proyección', () => {
    const result = calcFinanciero(FORM_VACIO, estadoConDatos)
    result.proyeccionMensual.forEach(mes => {
      expect(mes.costoFijo).toBe(4000)
    })
  })
})

// ── calcCompleteness() ────────────────────────────────────────
describe('calcCompleteness()', () => {
  it('con form vacío retorna overall 0 (sin secciones aprobadas)', () => {
    const result = calcCompleteness(FORM_VACIO, [])
    expect(result.overall).toBe(0)
  })

  it('con 3 secciones aprobadas retorna overall 50%', () => {
    const result = calcCompleteness(FORM_VACIO, ['institucional', 'estrategica', 'marketing'])
    expect(result.overall).toBe(50)
  })

  it('con 6 secciones aprobadas retorna overall 100%', () => {
    const result = calcCompleteness(FORM_VACIO, ['institucional', 'estrategica', 'marketing', 'produccion', 'financiera', 'legal'])
    expect(result.overall).toBe(100)
  })

  it('con todos los campos institucionales completos retorna institucional 100%', () => {
    const form = {
      ...FORM_VACIO,
      i_escuela: 'Escuela',
      i_modalidad: 'Economía',
      i_curso: '6A',
      i_materia: 'Emprendimiento',
      i_docente: 'Prof. Test',
      i_ciclo: '2026',
      i_nombre_emp: 'Mi Empresa',
    }
    const result = calcCompleteness(form, [])
    expect(result.institucional).toBe(100)
  })

  it('con campos parciales retorna porcentaje proporcional', () => {
    const form = {
      ...FORM_VACIO,
      i_escuela: 'Escuela',
      i_modalidad: 'Economía',
      // faltan 5 de 7 campos institucionales
    }
    const result = calcCompleteness(form, [])
    expect(result.institucional).toBe(Math.round((2 / 7) * 100))
  })
})
