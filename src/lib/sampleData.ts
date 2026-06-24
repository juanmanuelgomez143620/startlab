import type { DatosForm, ProyectoEstado } from '../types'
import { FORM_VACIO, ESTADO_VACIO } from './calculos'

export const SAMPLE_PROJECT: { form: DatosForm; estado: ProyectoEstado } = {
  form: {
    ...FORM_VACIO,
    i_nombre_emp: "Eco-Ladrillos S.A.",
    i_escuela: "I.P.E.M. N° 124",
    i_modalidad: "Economía y Gestión",
    i_curso: "6° Año 'B'",
    i_materia: "Formación para la Vida y el Trabajo",
    i_docente: "Prof. Juan Manuel Gómez",
    i_ciclo: "2026",
    i_rubro: "Construcción Sostenible",
    e_mision: "Nuestra misión es reducir el impacto ambiental transformando residuos plásticos en soluciones constructivas de alta calidad y bajo costo.",
    e_vision: "Ser la empresa líder en materiales de construcción sustentables en nuestra región para el 2030.",
    e_fortalezas: "Compromiso del equipo, acceso a materia prima reciclable sin costo.",
    e_oportunidades: "Creciente conciencia ambiental, falta de competidores directos en la zona.",
    e_debilidades: "Falta de maquinaria industrial, presupuesto inicial limitado.",
    e_amenazas: "Cambios en las regulaciones de construcción, inflación.",
    m_segmento: "Constructores particulares y municipios interesados en obra pública sostenible.",
    p_proceso: "Ladrillos fabricados a partir de plástico PET triturado y cemento.",
    p_inv_total: "150000",
    l_forma: "Sociedad de Hecho (escolar)",
    l_impositivo: "Monotributo Social",
    l_notas: "Habilitación municipal, registro de marca.",
  },
  estado: {
    ...ESTADO_VACIO,
    members: [
      { id: 1, nombre: "Ana García", rol: "Líder / CEO", dni: "45.123.456" },
      { id: 2, nombre: "Carlos Pérez", rol: "Producción", dni: "45.789.012" }
    ],
    gastosFijos: [
      { id: 101, concepto: "Alquiler Galpón", tipo: "Operativo", monto: 20000 },
      { id: 102, concepto: "Seguros", tipo: "Administrativo", monto: 5000 }
    ],
    tramitesDone: { cuit: true, afip: true, marca: false }
  }
}
