import { useStore } from "../store/useStore"
import { Card, CardTitle, CardSubtitle, FormGroup, IconBtn } from "../components/ui"
import { FeedbackPanel } from "../components/FeedbackPanel"
import { calcPrecioVenta, fmt, n } from "../lib/calculos"
import type { Competidor } from "../types"

const CANALES = ["Venta directa / Puerta a puerta","Local físico","Redes sociales (Instagram, Facebook)","WhatsApp Business","Ferias y mercados","E-commerce / Tienda online","Boca en boca / Referidos","Combinación de canales"]

export default function PageMarketing() {
  const { form, setField, estado, setEstado, perfil } = useStore()
  const isProfesor = perfil?.rol === 'profesor'

  function addComp() {
    if (isProfesor) return
    setEstado({ competidores: [...estado.competidores, { id: Date.now(), nombre: "", producto: "", precio: "", fortaleza: "", debilidad: "" }] })
  }
  function removeComp(id: number) { 
    if (isProfesor) return
    setEstado({ competidores: estado.competidores.filter(c => c.id !== id) }) 
  }
  function updateComp(id: number, field: keyof Competidor, value: string) {
    if (isProfesor) return
    setEstado({ competidores: estado.competidores.map(c => c.id === id ? { ...c, [field]: value } : c) })
  }

  function handleCostoChange(v: string) {
    setField("m_costo_unit", v)
    const pv = calcPrecioVenta(n(v), n(form.m_margen))
    if (pv > 0) setField("m_precio_venta", String(pv))
  }
  function handleMargenChange(v: string) {
    setField("m_margen", v)
    const pv = calcPrecioVenta(n(form.m_costo_unit), n(v))
    if (pv > 0) setField("m_precio_venta", String(pv))
  }

  const th = { background: "var(--bg3)", padding: "10px 14px", textAlign: "left" as const, fontSize: "0.75rem", color: "var(--text2)", fontWeight: 600 }
  const td = { padding: "10px 14px", fontSize: "0.85rem", borderTop: "1px solid var(--border)" }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.8rem", letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 10 }}>
          📣 Gestión de Marketing
          <span style={{ background: "rgba(106,247,184,0.15)", color: "var(--accent3)", border: "1px solid rgba(106,247,184,0.25)", borderRadius: 99, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 600 }}>Paso 3</span>
        </h1>
      </div>
      <Card>
        <CardTitle icon="🎯">Segmentación de Mercado</CardTitle>
        <CardSubtitle>¿Quiénes son tus clientes objetivo?</CardSubtitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FormGroup label="Segmento Principal" required helper="Describí a tu cliente ideal: edad, género, nivel socioeconómico, zona.">
            <input value={form.m_segmento} onChange={e => setField("m_segmento", e.target.value)} placeholder="Ej: Mujeres de 25-45 años, clase media" className={form.m_segmento ? "filled" : ""} disabled={isProfesor} />
          </FormGroup>
          <FormGroup label="Tamaño estimado del mercado">
            <input value={form.m_zona} onChange={e => setField("m_zona", e.target.value)} placeholder="Ej: 5.000 familias en Wanda y alrededores" disabled={isProfesor} />
          </FormGroup>
          <div style={{ gridColumn: "1/-1" }}>
            <FormGroup label="Perfil del Consumidor" required>
              <textarea value={form.m_perfil} onChange={e => setField("m_perfil", e.target.value)} placeholder="Describí detalladamente a tu cliente: ¿qué necesita?, ¿donde compra?, ¿cuánto puede gastar?, ¿qué valora?" className={form.m_perfil ? "filled" : ""} disabled={isProfesor} />
            </FormGroup>
          </div>
          <FormGroup label="Canal de Venta Principal">
            <select value={form.m_canal} onChange={e => setField("m_canal", e.target.value)} disabled={isProfesor}>
              <option value="">Seleccioná...</option>
              {CANALES.map(c => <option key={c}>{c}</option>)}
            </select>
          </FormGroup>
        </div>
      </Card>

      <Card>
        <CardTitle icon="🏆">Análisis de Competidores</CardTitle>
        <CardSubtitle>Conocé a tu competencia para diferenciarte</CardSubtitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Competidor","Producto/Servicio","Precio aprox.","Fortaleza","Debilidad",""].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {estado.competidores.map(c => (
              <tr key={c.id}>
                {(["nombre","producto","precio","fortaleza","debilidad"] as (keyof Competidor)[]).map(f => (
                  <td key={f} style={td}><input value={c[f] as string} onChange={e => updateComp(c.id, f, e.target.value)} placeholder={f.charAt(0).toUpperCase()+f.slice(1)} style={{ padding: "4px 8px", width: f === "precio" ? 80 : 130 }} disabled={isProfesor} /></td>
                ))}
                <td style={td}>{!isProfesor && <IconBtn variant="del" onClick={() => removeComp(c.id)} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isProfesor && <button onClick={addComp} style={{ marginTop: 12, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 14px", color: "var(--text)", fontSize: "0.85rem", cursor: "pointer", fontFamily: "var(--font-body)" }}>➕ Agregar competidor</button>}
      </Card>

      <Card>
        <CardTitle icon="🔀">Marketing Mix — Las 4P</CardTitle>
        <CardSubtitle>Definí tu estrategia comercial completa</CardSubtitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { id: "m_producto" as const, icon: "📦", label: "PRODUCTO", ph: "¿Qué ofrecés? ¿Qué características tiene? ¿Cuál es tu diferenciación?" },
            { id: "m_precio_mix" as const, icon: "💰", label: "PRECIO", ph: "¿Cómo fijás el precio? ¿Qué estrategia usás?" },
            { id: "m_plaza" as const, icon: "🗺️", label: "PLAZA (DISTRIBUCIÓN)", ph: "¿Dónde y cómo llegás al cliente?" },
            { id: "m_promocion" as const, icon: "📢", label: "PROMOCIÓN", ph: "¿Cómo comunicás tu producto? ¿Redes sociales? ¿Flyers?" },
          ].map(p => (
            <div key={p.id} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>{p.icon}</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", color: "var(--accent2)", marginBottom: 8 }}>{p.label}</div>
              <textarea value={form[p.id]} onChange={e => setField(p.id, e.target.value)} placeholder={p.ph} className={form[p.id] ? "filled" : ""} disabled={isProfesor} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle icon="💲">Precio Estimado del Producto</CardTitle>
        <CardSubtitle>Calculá el precio de venta de tu producto o servicio</CardSubtitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <FormGroup label="Costo unitario de producción ($)" required helper="Sumatoria de materiales + mano de obra por unidad.">
            <input type="number" value={form.m_costo_unit} onChange={e => handleCostoChange(e.target.value)} placeholder="0.00" disabled={isProfesor} />
          </FormGroup>
          <FormGroup label="Margen de ganancia deseado (%)">
            <input type="number" value={form.m_margen} onChange={e => handleMargenChange(e.target.value)} placeholder="30" disabled={isProfesor} />
          </FormGroup>
          <FormGroup label="Precio de Venta Sugerido ($)">
            <input type="number" value={form.m_precio_venta} onChange={e => setField("m_precio_venta", e.target.value)}
              placeholder="Calculado automáticamente" style={{ borderColor: "rgba(106,247,184,0.4)", color: "var(--accent3)" }} readOnly={!!form.m_costo_unit || isProfesor} disabled={isProfesor} />
          </FormGroup>
        </div>
        {n(form.m_precio_venta) > 0 && (
          <div style={{ marginTop: 12, background: "rgba(106,247,184,0.08)", border: "1px solid rgba(106,247,184,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: "0.85rem", color: "var(--accent3)" }}>
            ✓ Precio sugerido: <strong>${fmt(n(form.m_precio_venta))}</strong> = ${fmt(n(form.m_costo_unit))} costo × (1 + {form.m_margen}% margen)
          </div>
        )}
      </Card>
      
      <FeedbackPanel section="marketing" />
    </div>
  )
}
