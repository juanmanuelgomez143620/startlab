import { useStore } from '../store/useStore'
import { Card, CardTitle, CardSubtitle, FormGroup } from '../components/ui'
import { FeedbackPanel } from '../components/FeedbackPanel'

export default function PageEstrategica() {
  const { form, setField, perfil } = useStore()
  const isProfesor = perfil?.rol === 'profesor'

  const ta = (id: keyof typeof form, label: string, placeholder: string, helper?: string, required?: boolean) => (
    <FormGroup label={label} required={required} helper={helper}>
      <textarea 
        value={form[id]} 
        onChange={e => setField(id, e.target.value)} 
        placeholder={placeholder} 
        className={form[id] ? "filled" : ""} 
        disabled={isProfesor}
      />
    </FormGroup>
  )
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.8rem", letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 10 }}>
          🎯 Gestión Estratégica
          <span style={{ background: "rgba(247,162,106,0.15)", color: "var(--accent2)", border: "1px solid rgba(247,162,106,0.25)", borderRadius: 99, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 600 }}>Paso 2</span>
        </h1>
      </div>
      <Card>
        <CardTitle icon="🧭">Misión, Visión y Objetivos</CardTitle>
        <CardSubtitle>La base filosófica de tu empresa</CardSubtitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {ta("e_mision","Misión","¿Qué hacemos, para quién y cómo?","La misión describe el PROPÓSITO actual de tu empresa. Respondé: ¿qué hacemos?, ¿para quién?, ¿cómo lo hacemos?",true)}
          {ta("e_vision","Visión","¿Dónde queremos estar en 3-5 años?","La visión describe hacia dónde querés ir en el FUTURO. Debe ser ambiciosa pero alcanzable.",true)}
          {ta("e_objetivos","Objetivos del Emprendimiento","1. Alcanzar 50 ventas mensuales en los primeros 6 meses\n2. Recuperar la inversión en 12 meses","Los objetivos deben ser SMART: Específicos, Medibles, Alcanzables, Relevantes y con Tiempo definido.",true)}
        </div>
      </Card>
      <Card>
        <CardTitle icon="⚡">Análisis FODA</CardTitle>
        <CardSubtitle>Fortalezas, Oportunidades, Debilidades y Amenazas</CardSubtitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { id: "e_fortalezas" as const, label: "💪 FORTALEZAS", bg: "rgba(106,247,184,0.08)", border: "rgba(106,247,184,0.2)", color: "var(--accent3)", ph: "¿Qué hacemos bien? ¿Qué recursos tenemos? ¿Qué nos diferencia?" },
            { id: "e_oportunidades" as const, label: "🌟 OPORTUNIDADES", bg: "rgba(124,106,247,0.08)", border: "rgba(124,106,247,0.2)", color: "var(--accent)", ph: "¿Qué tendencias nos favorecen? ¿Qué necesidades del mercado podemos cubrir?" },
            { id: "e_debilidades" as const, label: "⚠️ DEBILIDADES", bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.2)", color: "var(--warn)", ph: "¿Qué debemos mejorar? ¿Qué nos falta?" },
            { id: "e_amenazas" as const, label: "🔴 AMENAZAS", bg: "rgba(247,106,138,0.08)", border: "rgba(247,106,138,0.2)", color: "var(--accent4)", ph: "¿Qué puede perjudicarnos? ¿Qué riesgos existen?" },
          ].map(f => (
            <div key={f.id} style={{ background: f.bg, border: `1px solid ${f.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", color: f.color, marginBottom: 8 }}>{f.label}</div>
              <textarea 
                value={form[f.id]} 
                onChange={e => setField(f.id, e.target.value)} 
                placeholder={f.ph} 
                className={form[f.id] ? "filled" : ""} 
                disabled={isProfesor}
                style={{ background: "transparent", border: `1px solid ${f.border}`, minHeight: 100 }}
              />
            </div>
          ))}
        </div>
      </Card>

      <FeedbackPanel section="estrategica" />
    </div>
  )
}
