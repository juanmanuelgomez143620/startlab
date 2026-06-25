import jsPDF from 'jspdf'
import type { DatosForm, ProyectoEstado } from '../types'
import { fmt, calcFinanciero, calcTotalMateriaPrima, calcTotalMOD, calcTotalGastosFijos, round2 } from './calculos'

// ── Color palette (light/professional theme) ──────────────────────
const C = {
  accent:  [124, 106, 247] as [number,number,number],  // purple — section headers
  aLight:  [235, 232, 255] as [number,number,number],  // light purple — sub-headers
  white:   [255, 255, 255] as [number,number,number],
  dark:    [25,  25,  40 ] as [number,number,number],  // body text
  muted:   [100, 100, 120] as [number,number,number],  // labels / secondary
  line:    [210, 210, 225] as [number,number,number],  // separator lines
  green:   [22,  163,  74] as [number,number,number],
  red:     [220,  38,  38] as [number,number,number],
  amber:   [180, 100,   0] as [number,number,number],
  bgStrip: [248, 247, 255] as [number,number,number],  // alternate row bg
}

const MX = 18            // horizontal margin (mm)
const UW = 210 - MX * 2 // usable width (mm)

// ── Top page bar with logo text + page number ─────────────────────
function pgBar(doc: jsPDF, empName: string, pg: number) {
  doc.setFillColor(...C.accent)
  doc.rect(0, 0, 210, 7, 'F')
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.white)
  doc.text(empName.toUpperCase(), MX, 4.8)
  doc.text(`Pag. ${pg}`, 200, 4.8, { align: 'right' })
}

export function exportarPDF(form: DatosForm, estado: ProyectoEstado) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  let y = 18
  let pg = 1

  const empNombre = form.i_nombre_emp || 'Mi Emprendimiento'

  const calc       = calcFinanciero(form, estado)
  const totalMP    = calcTotalMateriaPrima(estado.materiaPrima  || [])
  const totalMOD   = calcTotalMOD(estado.manoObraDirecta || [])
  const totalGF    = calcTotalGastosFijos(estado.gastosFijos    || [])
  const costoBase  = round2(calc.cvuPromedio + calc.cfuPromedio)

  // White background on first page
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, 210, 297, 'F')

  // ── helpers that close over doc / y ──────────────────────────────
  function newPage() {
    doc.addPage()
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, 210, 297, 'F')
    pg++
    pgBar(doc, empNombre, pg)
    y = 16
  }

  function chk(need: number) { if (y + need > 278) newPage() }

  // purple section header bar
  function secBar(title: string) {
    chk(15)
    doc.setFillColor(...C.accent)
    doc.roundedRect(MX, y, UW, 11, 2, 2, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.white)
    doc.text(title, MX + 5, y + 7.5)
    y += 15
  }

  // light sub-header
  function subHdr(title: string) {
    chk(12)
    doc.setFillColor(...C.aLight)
    doc.roundedRect(MX, y, UW, 8, 1.5, 1.5, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.accent)
    doc.text(title, MX + 4, y + 5.5)
    y += 12
  }

  // label: value field
  function fld(label: string, value: string | undefined | null, vColor?: [number,number,number]) {
    if (!value?.trim()) return
    chk(10)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.muted)
    doc.text(label + ':', MX, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...(vColor || C.dark))
    const lines = doc.splitTextToSize(String(value), UW - 42)
    doc.text(lines, MX + 42, y)
    y += Math.max(lines.length * 4.5, 5) + 2
  }

  // horizontal line
  function ln() {
    chk(6)
    doc.setDrawColor(...C.line)
    doc.setLineWidth(0.25)
    doc.line(MX, y, 210 - MX, y)
    y += 5
  }

  // small bullet item
  function bullet(text: string, color?: [number,number,number]) {
    chk(7)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...(color || C.dark))
    doc.text('•', MX + 2, y)
    const lines = doc.splitTextToSize(text, UW - 12)
    doc.text(lines, MX + 7, y)
    y += lines.length * 4.5 + 1
  }

  // table header row
  function tHdr(cols: {label: string; w: number; align?: 'left'|'right'|'center'}[]) {
    chk(10)
    doc.setFillColor(...C.aLight)
    doc.rect(MX, y, UW, 8, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.accent)
    let x = MX
    cols.forEach(col => {
      const al = col.align || 'left'
      if (al === 'right') doc.text(col.label, x + col.w - 2, y + 5.5, { align: 'right' })
      else if (al === 'center') doc.text(col.label, x + col.w / 2, y + 5.5, { align: 'center' })
      else doc.text(col.label, x + 2, y + 5.5)
      x += col.w
    })
    y += 9
  }

  // table body row
  function tRow(cells: {value: string; w: number; align?: 'left'|'right'|'center'; color?: [number,number,number]; bold?: boolean}[], stripe: boolean) {
    chk(8)
    if (stripe) { doc.setFillColor(...C.bgStrip); doc.rect(MX, y - 1, UW, 7, 'F') }
    doc.setFontSize(8)
    let x = MX
    cells.forEach(cell => {
      doc.setFont('helvetica', cell.bold ? 'bold' : 'normal')
      doc.setTextColor(...(cell.color || C.dark))
      const al = cell.align || 'left'
      const v = cell.value || '—'
      if (al === 'right') doc.text(v, x + cell.w - 2, y + 4.5, { align: 'right' })
      else if (al === 'center') doc.text(v, x + cell.w / 2, y + 4.5, { align: 'center' })
      else {
        const lines = doc.splitTextToSize(v, cell.w - 4)
        doc.text(lines[0] || '', x + 2, y + 4.5)
      }
      x += cell.w
    })
    y += 7
  }

  // table total row (bold purple bg)
  function tTotal(cols: {value: string; w: number; align?: 'left'|'right'|'center'}[]) {
    chk(9)
    doc.setFillColor(...C.aLight)
    doc.rect(MX, y - 1, UW, 8, 'F')
    doc.setDrawColor(...C.accent)
    doc.setLineWidth(0.4)
    doc.line(MX, y - 1, 210 - MX, y - 1)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    let x = MX
    cols.forEach(col => {
      doc.setTextColor(...C.accent)
      const al = col.align || 'left'
      if (al === 'right') doc.text(col.value, x + col.w - 2, y + 5, { align: 'right' })
      else doc.text(col.value, x + 2, y + 5)
      x += col.w
    })
    y += 10
  }

  // ══════════════════════════════════════════════════════════════
  // PAG 1: PORTADA
  // ══════════════════════════════════════════════════════════════
  doc.setFillColor(...C.accent)
  doc.rect(0, 0, 210, 52, 'F')

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 195, 255)
  doc.text('PLAN DE NEGOCIOS', 105, 14, { align: 'center' })

  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(empNombre.toUpperCase(), 105, 28, { align: 'center' })

  if (form.i_tipo_negocio) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(200, 195, 255)
    doc.text(form.i_tipo_negocio, 105, 38, { align: 'center' })
  }

  if (form.i_slogan) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...C.muted)
    doc.text(`"${form.i_slogan}"`, 105, 65, { align: 'center' })
  }

  // Institutional info box
  doc.setFillColor(...C.bgStrip)
  doc.setDrawColor(...C.aLight)
  doc.setLineWidth(0.5)
  doc.roundedRect(30, 74, 150, 50, 3, 3, 'FD')

  const instData = [
    ['Institucion', form.i_escuela],
    ['Curso', form.i_curso],
    ['Materia', form.i_materia],
    ['Docente', `Prof. ${form.i_docente || '-'}`],
    ['Ciclo lectivo', form.i_ciclo],
  ]
  doc.setFontSize(8)
  instData.forEach(([lbl, val], i) => {
    const iy = 82 + i * 8
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.muted)
    doc.text(lbl + ':', 36, iy)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.dark)
    doc.text(val || '-', 75, iy)
  })

  // Team
  if (estado.members.length > 0) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.dark)
    doc.text('EQUIPO EMPRENDEDOR', 105, 140, { align: 'center' })
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.muted)
    estado.members.slice(0, 8).forEach((m, i) => {
      doc.text(`${m.nombre}   ·   ${m.rol}`, 105, 148 + i * 7, { align: 'center' })
    })
  }

  // Footer portada
  doc.setFillColor(...C.bgStrip)
  doc.rect(0, 265, 210, 32, 'F')
  doc.setDrawColor(...C.aLight)
  doc.line(0, 265, 210, 265)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.muted)
  doc.text('Herramienta pedagogica desarrollada por:', 105, 270, { align: 'center' })
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.accent)
  doc.setFontSize(9.5)
  doc.text('Juan Manuel Gomez', 105, 278, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.muted)
  doc.setFontSize(6.5)
  doc.text('Profesor en Ciencias Economicas · Licenciado en Educacion · Experto en Tecnologia Educativa', 105, 285, { align: 'center' })
  doc.text('React · TypeScript · Vite · Supabase · jsPDF  |  emprendeplan.vercel.app', 105, 291, { align: 'center' })

  // ══════════════════════════════════════════════════════════════
  // PAG 2: DATOS INSTITUCIONALES
  // ══════════════════════════════════════════════════════════════
  newPage()
  secBar('1. DATOS INSTITUCIONALES')

  subHdr('Identidad del emprendimiento')
  fld('Nombre', form.i_nombre_emp)
  fld('Tipo de negocio', form.i_tipo_negocio)
  fld('Rubro', form.i_rubro)
  fld('Descripcion', form.i_desc_breve)
  fld('Slogan', form.i_slogan ? `"${form.i_slogan}"` : '')

  ln()
  subHdr('Datos escolares')
  fld('Escuela', form.i_escuela)
  fld('Modalidad', form.i_modalidad)
  fld('Curso', form.i_curso)
  fld('Materia', form.i_materia)
  fld('Docente', form.i_docente)
  fld('Ciclo lectivo', form.i_ciclo)

  if (estado.members.length > 0) {
    ln()
    subHdr('Equipo emprendedor')
    tHdr([{ label: 'Nombre', w: 80 }, { label: 'Rol', w: 60 }, { label: 'DNI', w: 34 }])
    estado.members.forEach((m, i) => {
      tRow([
        { value: m.nombre, w: 80 },
        { value: m.rol, w: 60 },
        { value: m.dni || '-', w: 34 },
      ], i % 2 === 0)
    })
    y += 3
  }

  // ══════════════════════════════════════════════════════════════
  // PAG 3: ESTRATÉGICA
  // ══════════════════════════════════════════════════════════════
  newPage()
  secBar('2. GESTION ESTRATEGICA')

  subHdr('Mision y Vision')
  fld('Mision', form.e_mision)
  ln()
  fld('Vision', form.e_vision)

  if (form.e_propuesta_valor) {
    ln()
    subHdr('Propuesta de valor')
    fld('Propuesta', form.e_propuesta_valor)
  }

  if (form.e_objetivos) {
    ln()
    subHdr('Objetivos')
    const objetivos = form.e_objetivos.split('\n').filter(Boolean)
    objetivos.forEach((obj, i) => {
      chk(7)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...C.dark)
      doc.text(`${i + 1}. ${obj}`, MX + 3, y)
      y += 6
    })
    y += 2
  }

  if ((estado.valores || []).length > 0) {
    ln()
    subHdr('Valores del emprendimiento')
    chk(10)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.dark)
    doc.text(estado.valores.join('   ·   '), MX + 3, y)
    y += 8
  }

  // FODA 2x2 grid
  ln()
  secBar('ANALISIS FODA')

  const fodaBoxH = 52
  const fodaBoxW = (UW - 4) / 2

  const parseItems = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean)

  const fodaData = [
    { title: 'FORTALEZAS',    items: parseItems(form.e_fortalezas  || ''), color: [22, 163, 74]   as [number,number,number], bg: [230, 252, 238] as [number,number,number] },
    { title: 'OPORTUNIDADES', items: parseItems(form.e_oportunidades || ''), color: [124, 106, 247] as [number,number,number], bg: [235, 232, 255] as [number,number,number] },
    { title: 'DEBILIDADES',   items: parseItems(form.e_debilidades  || ''), color: [180, 100,   0] as [number,number,number], bg: [255, 247, 230] as [number,number,number] },
    { title: 'AMENAZAS',      items: parseItems(form.e_amenazas     || ''), color: [220,  38,  38] as [number,number,number], bg: [255, 235, 235] as [number,number,number] },
  ]

  chk(fodaBoxH * 2 + 14)

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const f = fodaData[row * 2 + col]
      const bx = MX + col * (fodaBoxW + 4)
      const by = y + row * (fodaBoxH + 4)

      doc.setFillColor(...f.bg)
      doc.setDrawColor(...f.color)
      doc.setLineWidth(0.5)
      doc.roundedRect(bx, by, fodaBoxW, fodaBoxH, 2, 2, 'FD')

      // Header bar inside box
      doc.setFillColor(...f.color)
      doc.roundedRect(bx, by, fodaBoxW, 9, 2, 2, 'F')
      doc.rect(bx, by + 5, fodaBoxW, 4, 'F')

      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...C.white)
      doc.text(f.title, bx + fodaBoxW / 2, by + 6.2, { align: 'center' })

      // Items
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...C.dark)
      f.items.slice(0, 7).forEach((item, i) => {
        const iy = by + 13 + i * 5.5
        if (iy + 5 < by + fodaBoxH - 2) {
          doc.text('• ' + item, bx + 3, iy, { maxWidth: fodaBoxW - 6 })
        }
      })
      if (f.items.length === 0) {
        doc.setTextColor(...C.muted)
        doc.text('Sin datos ingresados', bx + 3, by + 22)
      }
    }
  }
  y += fodaBoxH * 2 + 12

  // ══════════════════════════════════════════════════════════════
  // PAG 4: MARKETING
  // ══════════════════════════════════════════════════════════════
  newPage()
  secBar('3. GESTION DE MARKETING')

  subHdr('Segmentacion de mercado')
  fld('Segmento objetivo', form.m_segmento)
  fld('Perfil del consumidor', form.m_perfil)
  fld('Mercado estimado', form.m_zona)

  if (form.m_canal) {
    fld('Canales de venta', form.m_canal)
  }

  if ((estado.redes_sociales || []).length > 0) {
    fld('Redes sociales', estado.redes_sociales.join(' · '))
  }

  if (estado.competidores.length > 0) {
    ln()
    subHdr('Analisis de competidores')
    tHdr([
      { label: 'Competidor', w: 38 },
      { label: 'Producto/Servicio', w: 44 },
      { label: 'Precio', w: 22 },
      { label: 'Fortaleza', w: 35 },
      { label: 'Nuestra ventaja', w: 35 },
    ])
    estado.competidores.forEach((c, i) => {
      tRow([
        { value: c.nombre, w: 38 },
        { value: c.producto, w: 44 },
        { value: c.precio, w: 22, align: 'center' },
        { value: c.fortaleza, w: 35 },
        { value: c.ventaja || c.debilidad, w: 35 },
      ], i % 2 === 0)
    })
    y += 3
  }

  ln()
  subHdr('Marketing Mix — Las 4P')
  fld('Producto', form.m_producto)
  fld('Precio', form.m_precio_mix)
  fld('Plaza (distribucion)', form.m_plaza)
  fld('Promocion', form.m_promocion)

  if (form.m_precio_venta) {
    ln()
    subHdr('Precio estimado')
    fld('Costo unitario', `$${fmt(parseFloat(form.m_costo_unit) || 0)}`)
    fld('Margen de ganancia', `${form.m_margen}%`)
    fld('Precio de venta sugerido', `$${fmt(parseFloat(form.m_precio_venta) || 0)}`, C.green)
  }

  // ══════════════════════════════════════════════════════════════
  // PAG 5: PRODUCCION
  // ══════════════════════════════════════════════════════════════
  newPage()
  secBar('4. GESTION DE PRODUCCION')

  subHdr('Proceso productivo')
  const pasos = estado.pasos_proceso || []
  if (pasos.length > 0) {
    pasos.forEach((paso, i) => {
      chk(7)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...C.dark)
      const lines = doc.splitTextToSize(`${i + 1}. ${paso}`, UW - 5)
      doc.text(lines, MX + 3, y)
      y += lines.length * 4.5 + 2
    })
    y += 2
  } else if (form.p_proceso) {
    fld('Proceso', form.p_proceso)
  }

  fld('Capacidad de produccion', form.p_capacidad)

  ln()
  subHdr('Instalaciones')
  fld('Tipo de instalacion', form.p_instalacion)
  fld('Ubicacion', form.p_ubicacion)
  fld('Superficie', form.p_superficie)
  if (form.p_costo_local) fld('Costo mensual del espacio', `$${fmt(parseFloat(form.p_costo_local) || 0)}`)

  if (estado.equipos.length > 0) {
    ln()
    subHdr('Equipamiento necesario')
    tHdr([
      { label: 'Equipo / Herramienta', w: 75 },
      { label: 'Cant.', w: 18, align: 'center' },
      { label: 'Precio unit. ($)', w: 35, align: 'right' },
      { label: 'Total ($)', w: 30, align: 'right' },
      { label: 'Disponible', w: 16, align: 'center' },
    ])
    estado.equipos.forEach((eq, i) => {
      tRow([
        { value: eq.nombre, w: 75 },
        { value: String(eq.cantidad), w: 18, align: 'center' },
        { value: `$${fmt(eq.precio)}`, w: 35, align: 'right' },
        { value: `$${fmt(eq.cantidad * eq.precio)}`, w: 30, align: 'right' },
        { value: eq.tiene, w: 16, align: 'center', color: eq.tiene === 'Sí' ? C.green : eq.tiene === 'Parcial' ? C.amber : C.red },
      ], i % 2 === 0)
    })
    tTotal([
      { value: 'TOTAL EQUIPAMIENTO', w: 123 },
      { value: `$${fmt(estado.equipos.reduce((a, e) => a + e.cantidad * e.precio, 0))}`, w: 30, align: 'right' },
      { value: '', w: 21 },
    ])
  }

  ln()
  subHdr('Inversion inicial')
  const invEquip = parseFloat(form.p_inv_equip) || 0
  const invMP    = parseFloat(form.p_inv_mp)    || 0
  const invOtros = parseFloat(form.p_inv_otros)  || 0
  const invTotal = parseFloat(form.p_inv_total)  || (invEquip + invMP + invOtros)
  tHdr([{ label: 'Concepto', w: 120 }, { label: 'Monto ($)', w: 54, align: 'right' }])
  tRow([{ value: 'Equipamiento', w: 120 }, { value: `$${fmt(invEquip)}`, w: 54, align: 'right' }], false)
  tRow([{ value: 'Materia prima inicial', w: 120 }, { value: `$${fmt(invMP)}`, w: 54, align: 'right' }], true)
  tRow([{ value: 'Otros gastos iniciales', w: 120 }, { value: `$${fmt(invOtros)}`, w: 54, align: 'right' }], false)
  tTotal([{ value: 'INVERSION TOTAL INICIAL', w: 120 }, { value: `$${fmt(invTotal)}`, w: 54, align: 'right' }])

  // ══════════════════════════════════════════════════════════════
  // PAG 6-7: FINANCIERO
  // ══════════════════════════════════════════════════════════════
  newPage()
  secBar('5. GESTION ECONOMICA-FINANCIERA')

  subHdr('Presupuesto de costos')

  // MP
  if ((estado.materiaPrima || []).length > 0) {
    chk(8)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.muted)
    doc.text('Materia Prima / Insumos', MX, y)
    y += 6
    tHdr([{ label: 'Insumo', w: 85 }, { label: 'Cantidad', w: 25, align: 'center' }, { label: 'Precio unit.', w: 32, align: 'right' }, { label: 'Total', w: 32, align: 'right' }])
    ;(estado.materiaPrima || []).forEach((m, i) => {
      tRow([
        { value: m.concepto, w: 85 },
        { value: String(m.cantidad), w: 25, align: 'center' },
        { value: `$${fmt(m.precio)}`, w: 32, align: 'right' },
        { value: `$${fmt(m.cantidad * m.precio)}`, w: 32, align: 'right', color: C.red },
      ], i % 2 === 0)
    })
    tTotal([{ value: 'TOTAL MATERIA PRIMA', w: 142 }, { value: `$${fmt(totalMP)}`, w: 32, align: 'right' }])
    y += 2
  }

  // MOD
  if ((estado.manoObraDirecta || []).length > 0) {
    chk(8)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.muted)
    doc.text('Mano de Obra Directa', MX, y)
    y += 6
    tHdr([{ label: 'Rol / Tarea', w: 85 }, { label: 'Horas/mes', w: 30, align: 'center' }, { label: 'Valor hora', w: 27, align: 'right' }, { label: 'Total', w: 32, align: 'right' }])
    ;(estado.manoObraDirecta || []).forEach((m, i) => {
      tRow([
        { value: m.nombre, w: 85 },
        { value: String(m.horas), w: 30, align: 'center' },
        { value: `$${fmt(m.valorHora)}`, w: 27, align: 'right' },
        { value: `$${fmt(m.horas * m.valorHora)}`, w: 32, align: 'right', color: C.red },
      ], i % 2 === 0)
    })
    tTotal([{ value: 'TOTAL MANO DE OBRA', w: 142 }, { value: `$${fmt(totalMOD)}`, w: 32, align: 'right' }])
    y += 2
  }

  // Gastos fijos
  if ((estado.gastosFijos || []).length > 0) {
    chk(8)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.muted)
    doc.text('Costos Fijos Mensuales', MX, y)
    y += 6
    tHdr([{ label: 'Concepto', w: 100 }, { label: 'Tipo', w: 42 }, { label: 'Monto ($)', w: 32, align: 'right' }])
    ;(estado.gastosFijos || []).forEach((g, i) => {
      tRow([
        { value: g.concepto, w: 100 },
        { value: g.tipo, w: 42 },
        { value: `$${fmt(g.monto)}`, w: 32, align: 'right' },
      ], i % 2 === 0)
    })
    tTotal([{ value: 'TOTAL COSTOS FIJOS', w: 142 }, { value: `$${fmt(totalGF)}`, w: 32, align: 'right' }])
    y += 3
  }

  // KPIs unitarios
  subHdr('Costos unitarios calculados')
  tHdr([{ label: 'Indicador', w: 100 }, { label: 'Valor', w: 74, align: 'right' }])
  tRow([{ value: 'Costo Variable Unitario (CVU) — materiales + MOD por unidad', w: 100 }, { value: `$${fmt(calc.cvuPromedio)}`, w: 74, align: 'right', color: C.red }], false)
  tRow([{ value: 'Costo Fijo Unitario (CFU) — parte de los fijos por unidad', w: 100 }, { value: `$${fmt(calc.cfuPromedio)}`, w: 74, align: 'right', color: C.amber }], true)
  tTotal([{ value: 'COSTO TOTAL UNITARIO BASE', w: 100 }, { value: `$${fmt(costoBase)}`, w: 74, align: 'right' }])

  // Pronóstico y precio
  if ((estado.pronosticoVentas || []).length > 0) {
    ln()
    subHdr('Pronostico de ventas — Mes 1')
    tHdr([
      { label: 'Producto / Servicio', w: 55 },
      { label: 'S1', w: 15, align: 'center' },
      { label: 'S2', w: 15, align: 'center' },
      { label: 'S3', w: 15, align: 'center' },
      { label: 'S4', w: 15, align: 'center' },
      { label: 'Total', w: 20, align: 'center' },
      { label: 'Margen %', w: 22, align: 'center' },
      { label: 'Precio ($)', w: 17, align: 'right' },
    ])
    ;(estado.pronosticoVentas || []).forEach((p, i) => {
      const total = (p.semanas || []).reduce((a, b) => a + b, 0)
      const pv = round2(costoBase * (1 + (p.margen || 0) / 100))
      tRow([
        { value: p.nombre || '—', w: 55 },
        { value: String(p.semanas?.[0] || 0), w: 15, align: 'center' },
        { value: String(p.semanas?.[1] || 0), w: 15, align: 'center' },
        { value: String(p.semanas?.[2] || 0), w: 15, align: 'center' },
        { value: String(p.semanas?.[3] || 0), w: 15, align: 'center' },
        { value: `${total} u.`, w: 20, align: 'center', bold: true },
        { value: `${p.margen}%`, w: 22, align: 'center' },
        { value: `$${fmt(pv)}`, w: 17, align: 'right', color: C.accent },
      ], i % 2 === 0)
    })
    y += 3
  }

  // Presupuesto de ventas
  if (calc.totalIngresos > 0) {
    subHdr('Presupuesto de ventas — Mes 1')
    tHdr([
      { label: 'Producto', w: 65 },
      { label: 'Unidades', w: 28, align: 'center' },
      { label: 'Precio unit. ($)', w: 40, align: 'right' },
      { label: 'Ingresos ($)', w: 41, align: 'right' },
    ])
    ;(estado.pronosticoVentas || []).forEach((p, i) => {
      const total = (p.semanas || []).reduce((a, b) => a + b, 0)
      const pv = round2(calc.cvuPromedio * (1 + (p.margen || 0) / 100))
      tRow([
        { value: p.nombre || '—', w: 65 },
        { value: `${total} u.`, w: 28, align: 'center' },
        { value: `$${fmt(pv)}`, w: 40, align: 'right' },
        { value: `$${fmt(total * pv)}`, w: 41, align: 'right', color: C.green },
      ], i % 2 === 0)
    })
    tTotal([
      { value: 'TOTAL INGRESOS — MES 1', w: 133 },
      { value: `$${fmt(calc.totalIngresos)}`, w: 41, align: 'right' },
    ])
    y += 3
  }

  // Punto de equilibrio
  subHdr('Punto de equilibrio')
  tHdr([{ label: 'Indicador', w: 120 }, { label: 'Valor', w: 54, align: 'right' }])
  tRow([{ value: 'Punto de equilibrio en unidades', w: 120 }, { value: `${calc.puntoEquilibrioUnidades} u.`, w: 54, align: 'right', bold: true, color: C.accent }], false)
  tRow([{ value: 'Punto de equilibrio en pesos', w: 120 }, { value: `$${fmt(calc.puntoEquilibrioMonto)}`, w: 54, align: 'right', bold: true, color: C.accent }], true)
  tRow([{ value: 'Margen de contribucion', w: 120 }, { value: `${calc.margenContribucion.toFixed(1)}%`, w: 54, align: 'right' }], false)
  y += 3

  // Proyección 6 meses
  chk(55)
  subHdr('Proyeccion economica a 6 meses')
  const meses = ['Mes 1', 'Mes 2', 'Mes 3', 'Mes 4', 'Mes 5', 'Mes 6']
  const mW = 27
  const cW = UW - mW * 6

  tHdr([
    { label: 'Concepto', w: cW },
    ...meses.map(m => ({ label: m, w: mW, align: 'right' as const })),
  ])

  const rows6m = [
    { label: 'Ingresos ($)', values: calc.proyeccionMensual.map(m => `$${fmt(m.ingresos)}`), color: C.green },
    { label: 'Costos variables ($)', values: calc.proyeccionMensual.map(m => `-$${fmt(m.costoVariable)}`), color: C.red },
    { label: 'Costos fijos ($)', values: calc.proyeccionMensual.map(m => `-$${fmt(m.costoFijo)}`), color: C.muted },
  ]
  rows6m.forEach((row, i) => {
    tRow([
      { value: row.label, w: cW },
      ...row.values.map(v => ({ value: v, w: mW, align: 'right' as const, color: row.color })),
    ], i % 2 === 0)
  })

  // resultado row (bold)
  chk(9)
  doc.setFillColor(...C.aLight)
  doc.rect(MX, y - 1, UW, 8, 'F')
  doc.setDrawColor(...C.accent)
  doc.setLineWidth(0.4)
  doc.line(MX, y - 1, 210 - MX, y - 1)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.accent)
  doc.text('Resultado ($)', MX + 2, y + 4.5)
  calc.proyeccionMensual.forEach((m, i) => {
    const xPos = MX + cW + i * mW + mW - 2
    doc.setTextColor(m.resultado >= 0 ? C.green[0] : C.red[0], m.resultado >= 0 ? C.green[1] : C.red[1], m.resultado >= 0 ? C.green[2] : C.red[2])
    const val = (m.resultado >= 0 ? '+$' : '-$') + fmt(Math.abs(m.resultado))
    doc.text(val, xPos, y + 4.5, { align: 'right' })
  })
  y += 10

  // ══════════════════════════════════════════════════════════════
  // PAG: LEGAL
  // ══════════════════════════════════════════════════════════════
  newPage()
  secBar('6. GESTION LEGAL E IMPOSITIVA')

  subHdr('Estructura legal')
  fld('Forma juridica', form.l_forma)
  fld('Regimen impositivo', form.l_impositivo)

  const TRAMITE_LISTA = [
    { id: 'cuit',           nombre: 'Obtencion de CUIT (AFIP)' },
    { id: 'mono',           nombre: 'Inscripcion como Monotributista' },
    { id: 'afip',           nombre: 'Alta en portal Mi AFIP' },
    { id: 'banco',          nombre: 'Apertura de cuenta bancaria / CVU' },
    { id: 'marca',          nombre: 'Registro de Marca (INPI)' },
    { id: 'ing_brutos',     nombre: 'Inscripcion en Ingresos Brutos (Misiones)' },
    { id: 'rentas',         nombre: 'Alta en DGR Misiones' },
    { id: 'habilitacion_prov', nombre: 'Habilitacion provincial (si aplica)' },
    { id: 'hab_mun',        nombre: 'Habilitacion Municipal del Local' },
    { id: 'libre_deuda',    nombre: 'Certificado de Libre Deuda Municipal' },
    { id: 'bromatologia',   nombre: 'Habilitacion Bromatologica (si aplica)' },
    { id: 'patente',        nombre: 'Patente Comercial Municipal' },
  ]

  ln()
  subHdr('Tramites de habilitacion')
  const done   = TRAMITE_LISTA.filter(t => estado.tramitesDone[t.id])
  const pend   = TRAMITE_LISTA.filter(t => !estado.tramitesDone[t.id])

  if (done.length > 0) {
    chk(8)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.green)
    doc.text(`Completados (${done.length})`, MX, y)
    y += 6
    done.forEach(t => bullet(t.nombre, C.green))
    y += 3
  }

  if (pend.length > 0) {
    chk(8)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.muted)
    doc.text(`Pendientes (${pend.length})`, MX, y)
    y += 6
    pend.forEach(t => bullet(t.nombre, C.muted))
    y += 3
  }

  if (form.l_notas) {
    ln()
    fld('Notas legales', form.l_notas)
  }

  // ── Save ──────────────────────────────────────────────────────
  doc.save(`Plan_Negocios_${empNombre.replace(/\s+/g, '_')}.pdf`)
}
