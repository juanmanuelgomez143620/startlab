import jsPDF from 'jspdf'
import type { DatosForm, ProyectoEstado, CalculoFinanciero } from '../types'
import { fmt, calcFinanciero } from './calculos'

const ACCENT = [124, 106, 247] as const
const DARK = [15, 15, 19] as const
const WHITE = [232, 232, 240] as const
const GREY = [144, 144, 176] as const
const GREEN = [74, 222, 128] as const

export function exportarPDF(form: DatosForm, estado: ProyectoEstado) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const W = 210, M = 18, U = W - M * 2
  let y = M

  const addPage = () => {
    doc.addPage()
    y = M
    doc.setFillColor(DARK[0], DARK[1], DARK[2])
    doc.rect(0, 0, 210, 297, 'F')
  }

  const checkY = (need: number) => { if (y + need > 282) addPage() }

  const header = (title: string, sub?: string) => {
    checkY(22)
    doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2])
    doc.roundedRect(M, y, U, 14, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(title, M + 5, y + 9)
    y += 18
    if (sub) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(GREY[0], GREY[1], GREY[2])
      doc.text(sub, M, y)
      y += 6
    }
  }

  const field = (label: string, value: string) => {
    if (!value || value.trim() === '') return
    checkY(12)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(GREY[0], GREY[1], GREY[2])
    doc.text(label + ':', M, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
    const lines = doc.splitTextToSize(value, U - 32)
    doc.text(lines, M + 35, y)
    y += lines.length * 5 + 3
  }

  const sep = () => {
    checkY(5)
    doc.setDrawColor(42, 42, 56)
    doc.line(M, y, W - M, y)
    y += 4
  }

  const empNombre = form.i_nombre_emp || 'Mi Emprendimiento'
  const calc: CalculoFinanciero = calcFinanciero(form, estado)

  // ── PORTADA ──
  doc.setFillColor(DARK[0], DARK[1], DARK[2])
  doc.rect(0, 0, 210, 297, 'F')
  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2])
  doc.rect(0, 0, 210, 8, 'F')

  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2])
  doc.text('PLAN DE NEGOCIOS', 105, 80, { align: 'center' })

  doc.setFontSize(20)
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
  doc.text(empNombre.toUpperCase(), 105, 100, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(GREY[0], GREY[1], GREY[2])
  doc.text(form.i_escuela || 'Institucion Educativa', 105, 118, { align: 'center' })
  doc.text(`${form.i_curso || 'Curso'} - ${form.i_materia || 'Materia'} - ${form.i_ciclo || 'Ciclo'}`, 105, 126, { align: 'center' })
  doc.text(`Docente: ${form.i_docente || '-'}`, 105, 134, { align: 'center' })

  if (estado.members.length > 0) {
    doc.setFontSize(9)
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
    doc.text('EQUIPO EMPRENDEDOR:', 105, 155, { align: 'center' })
    doc.setFontSize(8.5)
    doc.setTextColor(GREY[0], GREY[1], GREY[2])
    estado.members.forEach((m, i) => {
      doc.text(`${m.nombre} - ${m.rol}`, 105, 163 + i * 7, { align: 'center' })
    })
  }

  // Footer portada
  doc.setFillColor(22, 22, 30)
  doc.rect(0, 268, 210, 29, 'F')
  doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2])
  doc.line(0, 268, 210, 268)
  doc.setFontSize(7)
  doc.setTextColor(GREY[0], GREY[1], GREY[2])
  doc.setFont('helvetica', 'normal')
  doc.text('Herramienta pedagogica desarrollada por:', 105, 274, { align: 'center' })
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2])
  doc.setFontSize(9)
  doc.text('Juan Manuel Gomez', 105, 281, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(GREY[0], GREY[1], GREY[2])
  doc.setFontSize(7)
  doc.text('Profesor en Ciencias Economicas | Licenciado en Educacion | Experto en Tecnologia Educativa', 105, 287, { align: 'center' })

  // ── PAG 2: ESTRATÉGICA ──
  addPage()
  header('GESTION ESTRATEGICA', 'Mision, Vision, Objetivos y FODA')
  field('Mision', form.e_mision)
  sep()
  field('Vision', form.e_vision)
  sep()
  field('Objetivos', form.e_objetivos)
  y += 4
  header('ANALISIS FODA', '')
  field('Fortalezas', form.e_fortalezas)
  field('Oportunidades', form.e_oportunidades)
  field('Debilidades', form.e_debilidades)
  field('Amenazas', form.e_amenazas)

  // ── PAG 3: MARKETING ──
  addPage()
  header('GESTION DE MARKETING', 'Segmentacion, Competidores y Marketing Mix')
  field('Segmento objetivo', form.m_segmento)
  field('Perfil del consumidor', form.m_perfil)
  field('Zona geografica', form.m_zona)
  field('Canal de venta', form.m_canal)
  sep()
  field('Producto', form.m_producto)
  field('Precio', form.m_precio_mix)
  field('Plaza', form.m_plaza)
  field('Promocion', form.m_promocion)
  sep()
  field('Precio de venta unitario', '$' + fmt(parseFloat(form.m_precio_venta) || 0))

  // ── PAG 4: PRODUCCION ──
  addPage()
  header('GESTION DE PRODUCCION', 'Viabilidad tecnica, equipamiento e inversion')
  field('Proceso productivo', form.p_proceso)
  field('Capacidad', form.p_capacidad)
  field('Instalacion', form.p_instalacion)
  field('Ubicacion', form.p_ubicacion)
  field('Superficie', form.p_superficie)
  sep()
  field('Inv. equipamiento', '$' + fmt(parseFloat(form.p_inv_equip) || 0))
  field('Inv. materia prima', '$' + fmt(parseFloat(form.p_inv_mp) || 0))
  field('Otros gastos', '$' + fmt(parseFloat(form.p_inv_otros) || 0))
  checkY(14)
  doc.setFillColor(40, 40, 80)
  doc.roundedRect(M, y, U, 12, 2, 2, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2])
  doc.text('INVERSION TOTAL: $' + fmt(parseFloat(form.p_inv_total) || 0), M + 5, y + 8)
  y += 16

  // ── PAG 5: FINANCIERO ──
  addPage()
  header('GESTION ECONOMICA-FINANCIERA', 'Presupuestos, Equilibrio y Resultados')
  field('Precio venta unitario', '$' + fmt(parseFloat(form.f_precio_u) || 0))
  field('Costo variable unitario', '$' + fmt(parseFloat(form.f_costo_u) || 0))
  y += 2
  calc.semanas.forEach(s => {
    field(`Semana ${s.semana} (${s.unidades} u.)`, '$' + fmt(s.ingresos))
  })
  sep()
  field('Total Ingresos 4 Semanas', '$' + fmt(calc.totalIngresos))
  field('Total Costos Variables', '-$' + fmt(calc.totalCostoVariable))
  field('Costos Fijos Mensuales', '-$' + fmt(calc.totalCostoFijo))
  field('Resultado del Periodo', (calc.totalResultado >= 0 ? '+' : '') + '$' + fmt(calc.totalResultado))
  sep()
  field('Punto de Equilibrio', calc.puntoEquilibrioUnidades + ' unidades / $' + fmt(calc.puntoEquilibrioMonto))
  field('Margen de Contribucion', calc.margenContribucion.toFixed(1) + '%')

  // ── PAG 6: LEGAL ──
  addPage()
  header('GESTION LEGAL E IMPOSITIVA', 'Tramites para operar legalmente')
  field('Forma juridica', form.l_forma)
  field('Regimen impositivo', form.l_impositivo)
  sep()

  const TRAMITES = [
    { id: 'cuit', nombre: 'Obtencion de CUIT (AFIP)' },
    { id: 'mono', nombre: 'Inscripcion como Monotributista' },
    { id: 'afip', nombre: 'Alta en portal Mi AFIP' },
    { id: 'banco', nombre: 'Apertura de cuenta bancaria / CVU' },
    { id: 'marca', nombre: 'Registro de Marca (INPI)' },
    { id: 'ing_brutos', nombre: 'Inscripcion en Ingresos Brutos (Misiones)' },
    { id: 'rentas', nombre: 'Alta en DGR Misiones' },
    { id: 'hab_mun', nombre: 'Habilitacion Municipal del Local' },
    { id: 'bromatologia', nombre: 'Habilitacion Bromatologica (si aplica)' },
    { id: 'patente', nombre: 'Patente Comercial' },
  ]

  TRAMITES.forEach(t => {
    checkY(8)
    const done = estado.tramitesDone[t.id]
    doc.setFontSize(8)
    doc.setFont('helvetica', done ? 'bold' : 'normal')
    if (done) {
      doc.setTextColor(GREEN[0], GREEN[1], GREEN[2])
    } else {
      doc.setTextColor(GREY[0], GREY[1], GREY[2])
    }
    doc.text((done ? '[OK] ' : '[ ]  ') + t.nombre, M + 3, y)
    y += 6
  })

  if (form.l_notas) { sep(); field('Notas legales', form.l_notas) }

  doc.save(`Plan_Negocios_${empNombre.replace(/\s+/g, '_')}.pdf`)
}
