import { useStore } from '../store/useStore'
import { Btn } from '../components/ui'
import { exportarPDF } from '../lib/pdfExport'
import { calcCompleteness, fmt, calcFinanciero } from '../lib/calculos'
import { useMemo } from 'react'
import { toast } from '../components/ui'

export default function PageReporte() {
  const { form, estado, loadProject, reset } = useStore()
  const comp = useMemo(() => calcCompleteness(form), [form])
  const calc = useMemo(() => calcFinanciero(form, estado), [form, estado])

  function handleExport() {
    exportarPDF(form, estado)
    toast('📄 PDF generado correctamente.', 'success')
  }

  function handleExportJSON() {
    const data = { form, estado, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `plan_negocios_${(form.i_nombre_emp || 'mi_proyecto').replace(/\s+/g, '_')}.json`
    a.click()
    toast('Datos exportados como JSON.', 'success')
  }

  function handleImportJSON() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string)
          loadProject(data.form, data.estado)
          toast('Datos importados exitosamente.', 'success')
        } catch {
          toast('Error al importar. Archivo inválido.', 'error')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const cardStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, marginBottom: 20 }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.5px' }}>📄 Reporte Final</h1>
        <p style={{ color: 'var(--text2)', marginTop: 4 }}>Revisá el plan completo y exportalo en PDF institucional.</p>
      </div>

      {/* Main export card */}
      <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>📋</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem', marginBottom: 8 }}>
          {form.i_nombre_emp || 'Mi Emprendimiento'}
        </div>
        <div style={{ color: 'var(--text2)', marginBottom: 24, fontSize: '0.9rem' }}>
          {form.i_escuela || 'Escuela'} · {form.i_curso || 'Curso'} · {form.i_ciclo || 'Ciclo Lectivo'}
          {form.i_docente ? ` · Prof. ${form.i_docente}` : ''}
        </div>

        {/* Completeness badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: comp.overall === 100 ? 'rgba(74,222,128,0.1)' : 'rgba(250,204,21,0.1)', border: `1px solid ${comp.overall === 100 ? 'rgba(74,222,128,0.3)' : 'rgba(250,204,21,0.3)'}`, borderRadius: 99, padding: '6px 16px', marginBottom: 28 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: comp.overall === 100 ? 'var(--success)' : 'var(--warn)' }}>
            {comp.overall === 100 ? '✅ Plan completo' : `⚠️ Plan ${comp.overall}% completo`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Btn variant="primary" onClick={handleExport} style={{ padding: '12px 24px' }}>
            📄 Exportar PDF Completo
          </Btn>
          <Btn variant="secondary" onClick={() => window.print()}>🖨️ Imprimir</Btn>
          <Btn variant="secondary" onClick={handleExportJSON}>💾 Exportar JSON</Btn>
          <Btn variant="secondary" onClick={handleImportJSON}>📂 Importar JSON</Btn>
        </div>
      </div>

      {/* Preview sections */}
      {[
        {
          title: '🏫 Datos Institucionales',
          content: form.i_escuela ? (
            <div style={{ fontSize: '0.875rem', lineHeight: 1.8, color: 'var(--text2)' }}>
              <b style={{ color: 'var(--text)' }}>Escuela:</b> {form.i_escuela}<br />
              <b style={{ color: 'var(--text)' }}>Modalidad:</b> {form.i_modalidad}<br />
              <b style={{ color: 'var(--text)' }}>Curso:</b> {form.i_curso} · <b style={{ color: 'var(--text)' }}>Materia:</b> {form.i_materia}<br />
              <b style={{ color: 'var(--text)' }}>Docente:</b> {form.i_docente} · <b style={{ color: 'var(--text)' }}>Ciclo:</b> {form.i_ciclo}<br />
              <b style={{ color: 'var(--text)' }}>Emprendimiento:</b> {form.i_nombre_emp} · <b style={{ color: 'var(--text)' }}>Rubro:</b> {form.i_rubro}<br />
              <b style={{ color: 'var(--text)' }}>Integrantes:</b> {estado.members.map(m => `${m.nombre} (${m.rol})`).join(', ') || 'No registrados'}
            </div>
          ) : <span style={{ color: 'var(--text3)' }}>Completá los datos institucionales para ver el reporte.</span>
        },
        {
          title: '🎯 Gestión Estratégica',
          content: form.e_mision ? (
            <div style={{ fontSize: '0.875rem', lineHeight: 1.8, color: 'var(--text2)' }}>
              <b style={{ color: 'var(--text)' }}>Misión:</b> {form.e_mision}<br /><br />
              <b style={{ color: 'var(--text)' }}>Visión:</b> {form.e_vision}<br /><br />
              <b style={{ color: 'var(--text)' }}>Objetivos:</b><br />
              {form.e_objetivos.split('\n').map((l, i) => <span key={i}>{l}<br /></span>)}
            </div>
          ) : <span style={{ color: 'var(--text3)' }}>Completá la gestión estratégica.</span>
        },
        {
          title: '📊 Resumen Económico-Financiero',
          content: calc.totalIngresos > 0 ? (
            <div style={{ fontSize: '0.875rem', lineHeight: 1.8, color: 'var(--text2)' }}>
              <b style={{ color: 'var(--text)' }}>Precio de venta:</b> ${fmt(parseFloat(form.f_precio_u) || 0)} · <b style={{ color: 'var(--text)' }}>Costo variable:</b> ${fmt(parseFloat(form.f_costo_u) || 0)}<br />
              <b style={{ color: 'var(--text)' }}>Ingresos totales 4 semanas:</b> <span style={{ color: 'var(--success)' }}>${fmt(calc.totalIngresos)}</span><br />
              <b style={{ color: 'var(--text)' }}>Resultado:</b> <span style={{ color: calc.totalResultado >= 0 ? 'var(--success)' : 'var(--error)' }}>{calc.totalResultado >= 0 ? '+' : ''}${fmt(calc.totalResultado)}</span><br />
              <b style={{ color: 'var(--text)' }}>Punto de equilibrio:</b> {calc.puntoEquilibrioUnidades} unidades / ${fmt(calc.puntoEquilibrioMonto)}<br />
              <b style={{ color: 'var(--text)' }}>Margen de contribución:</b> {calc.margenContribucion.toFixed(1)}%<br />
              <b style={{ color: 'var(--text)' }}>Inversión inicial:</b> ${fmt(parseFloat(form.p_inv_total) || 0)}
            </div>
          ) : <span style={{ color: 'var(--text3)' }}>Completá la gestión económica-financiera.</span>
        },
      ].map(s => (
        <div key={s.title} style={cardStyle}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>{s.title}</div>
          {s.content}
        </div>
      ))}

      {/* Danger zone */}
      <div style={{ ...cardStyle, border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.04)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 8, color: 'var(--error)' }}>⚠️ Zona peligrosa</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text2)', marginBottom: 16 }}>Reiniciar el plan borrará todos los datos del formulario. Esta acción no se puede deshacer.</p>
        <Btn variant="danger" onClick={() => { if (confirm('¿Estás seguro? Se borrarán todos los datos.')) { reset(); toast('Plan reiniciado.', 'warn') } }}>
          🗑️ Reiniciar plan
        </Btn>
      </div>
    </div>
  )
}
