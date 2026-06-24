import { useStore } from "../store/useStore"
import { Card, CardTitle, CardSubtitle, FormGroup, IconBtn, Divider } from "../components/ui"
import { FeedbackPanel } from "../components/FeedbackPanel"
import { fmt, calcTotalEquipamiento, calcInversionTotal, n } from "../lib/calculos"
import type { Equipo } from "../types"

const INSTALACIONES = ["Domicilio particular / Garaje","Local alquilado","Local propio","Espacio de cowork / Incubadora","Campo / Predio agrícola","Sin espacio físico (servicio digital)","Otro"]

export default function PageProduccion() {
  const { form, setField, estado, setEstado, perfil } = useStore()
  const isProfesor = perfil?.rol === 'profesor'

  function addEquipo() { 
    if (isProfesor) return
    setEstado({ equipos: [...estado.equipos, { id: Date.now(), nombre: "", cantidad: 1, precio: 0, tiene: "No" }] }) 
  }
  function removeEquipo(id: number) { 
    if (isProfesor) return
    setEstado({ equipos: estado.equipos.filter(e => e.id !== id) }) 
  }
  function updateEquipo(id: number, field: keyof Equipo, value: string | number) {
    if (isProfesor) return
    const updated = estado.equipos.map(e => e.id === id ? { ...e, [field]: value } : e)
    setEstado({ equipos: updated })
    const totalEquip = calcTotalEquipamiento(updated)
    setField("p_inv_equip", String(totalEquip))
    recalcTotal(String(totalEquip), form.p_inv_mp, form.p_inv_otros)
  }

  function recalcTotal(eq: string, mp: string, otros: string) {
    setField("p_inv_total", String(calcInversionTotal(n(eq), n(mp), n(otros))))
  }

  const totalEquip = calcTotalEquipamiento(estado.equipos)
  const th = { background: "var(--bg3)", padding: "10px 14px", textAlign: "left" as const, fontSize: "0.75rem", color: "var(--text2)", fontWeight: 600 }
  const td = { padding: "10px 14px", fontSize: "0.85rem", borderTop: "1px solid var(--border)" }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.8rem", letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 10 }}>
          🏭 Gestión de Producción
          <span style={{ background: "rgba(247,106,138,0.15)", color: "var(--accent4)", border: "1px solid rgba(247,106,138,0.25)", borderRadius: 99, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 600 }}>Paso 4</span>
        </h1>
      </div>
      <Card>
        <CardTitle icon="✅">Viabilidad Técnica</CardTitle>
        <CardSubtitle>¿Es técnicamente posible llevar adelante el proyecto?</CardSubtitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <FormGroup label="Descripción del Proceso Productivo" required helper="Sé detallado: ¿qué se hace primero?, ¿cuánto tiempo lleva cada etapa?, ¿quién interviene?">
            <textarea value={form.p_proceso} onChange={e => setField("p_proceso", e.target.value)} placeholder="Describí paso a paso cómo se produce tu producto o presta tu servicio." className={form.p_proceso ? "filled" : ""} disabled={isProfesor} />
          </FormGroup>
          <FormGroup label="Capacidad de Producción">
            <input value={form.p_capacidad} onChange={e => setField("p_capacidad", e.target.value)} placeholder="Ej: 50 unidades por semana con el equipo actual" disabled={isProfesor} />
          </FormGroup>
        </div>
      </Card>

      <Card>
        <CardTitle icon="🔧">Equipamiento Necesario</CardTitle>
        <CardSubtitle>Listá todas las máquinas, herramientas y equipos requeridos</CardSubtitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Equipo / Herramienta","Cantidad","Costo unit. ($)","Costo total ($)","¿Se tiene?",""].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {estado.equipos.map(e => (
              <tr key={e.id}>
                <td style={td}><input value={e.nombre} onChange={x => updateEquipo(e.id, "nombre", x.target.value)} placeholder="Nombre del equipo" style={{ padding: "4px 8px", width: 180 }} disabled={isProfesor} /></td>
                <td style={td}><input type="number" value={e.cantidad} min={1} onChange={x => updateEquipo(e.id, "cantidad", +x.target.value)} style={{ width: 70, padding: "4px 8px" }} disabled={isProfesor} /></td>
                <td style={td}><input type="number" value={e.precio} onChange={x => updateEquipo(e.id, "precio", +x.target.value)} style={{ width: 100, padding: "4px 8px" }} disabled={isProfesor} /></td>
                <td style={{ ...td, color: "var(--accent)", fontWeight: 600 }}>${fmt(e.cantidad * e.precio)}</td>
                <td style={td}>
                  <select value={e.tiene} onChange={x => updateEquipo(e.id, "tiene", x.target.value)} style={{ padding: "4px 8px", width: "auto" }} disabled={isProfesor}>
                    {["No","Sí","Parcial"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </td>
                <td style={td}>{!isProfesor && <IconBtn variant="del" onClick={() => removeEquipo(e.id)} />}</td>
              </tr>
            ))}
            <tr style={{ background: "rgba(124,106,247,0.06)" }}>
              <td colSpan={3} style={{ ...td, fontWeight: 700, color: "var(--text2)", borderTop: "2px solid var(--accent)", fontSize: "0.8rem" }}>TOTAL EQUIPAMIENTO</td>
              <td style={{ ...td, fontWeight: 700, color: "var(--accent)", borderTop: "2px solid var(--accent)" }}>${fmt(totalEquip)}</td>
              <td colSpan={2} style={td}></td>
            </tr>
          </tbody>
        </table>
        {!isProfesor && <button onClick={addEquipo} style={{ marginTop: 12, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 14px", color: "var(--text)", fontSize: "0.85rem", cursor: "pointer", fontFamily: "var(--font-body)" }}>➕ Agregar equipo</button>}
      </Card>

      <Card>
        <CardTitle icon="🏢">Planta Productiva y Local</CardTitle>
        <CardSubtitle>¿Dónde y cómo se produce?</CardSubtitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FormGroup label="Tipo de Instalación">
            <select value={form.p_instalacion} onChange={e => setField("p_instalacion", e.target.value)} disabled={isProfesor}>
              <option value="">Seleccioná...</option>
              {INSTALACIONES.map(i => <option key={i}>{i}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Superficie aproximada">
            <input value={form.p_superficie} onChange={e => setField("p_superficie", e.target.value)} placeholder="Ej: 25 m²" disabled={isProfesor} />
          </FormGroup>
          <FormGroup label="Ubicación">
            <input value={form.p_ubicacion} onChange={e => setField("p_ubicacion", e.target.value)} placeholder="Ej: Colonia Wanda, Misiones" disabled={isProfesor} />
          </FormGroup>
          <FormGroup label="Costo mensual del espacio ($)">
            <input type="number" value={form.p_costo_local} onChange={e => setField("p_costo_local", e.target.value)} placeholder="0" disabled={isProfesor} />
          </FormGroup>
          <div style={{ gridColumn: "1/-1" }}>
            <FormGroup label="Descripción del Espacio">
              <textarea value={form.p_desc_local} onChange={e => setField("p_desc_local", e.target.value)} placeholder="Medidas, servicios disponibles (agua, electricidad), condiciones sanitarias, etc." disabled={isProfesor} />
            </FormGroup>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle icon="💰">Inversión Inicial</CardTitle>
        <CardSubtitle>Inversión inicial en equipamiento y materias primas</CardSubtitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FormGroup label="Inversión en Equipamiento ($)">
            <input type="number" value={form.p_inv_equip || totalEquip || ""} onChange={e => { setField("p_inv_equip", e.target.value); recalcTotal(e.target.value, form.p_inv_mp, form.p_inv_otros) }}
              placeholder={String(totalEquip || 0)} disabled={isProfesor} />
            {totalEquip > 0 && <div style={{ fontSize: "0.72rem", color: "var(--accent3)", marginTop: 4 }}>✓ Calculado desde tabla de equipos: ${fmt(totalEquip)}</div>}
          </FormGroup>
          <FormGroup label="Inversión en Materia Prima inicial ($)">
            <input type="number" value={form.p_inv_mp} onChange={e => { setField("p_inv_mp", e.target.value); recalcTotal(form.p_inv_equip, e.target.value, form.p_inv_otros) }} placeholder="0" disabled={isProfesor} />
          </FormGroup>
          <FormGroup label="Otros gastos iniciales ($)">
            <input type="number" value={form.p_inv_otros} onChange={e => { setField("p_inv_otros", e.target.value); recalcTotal(form.p_inv_equip, form.p_inv_mp, e.target.value) }} placeholder="Ej: habilitación, publicidad inicial" disabled={isProfesor} />
          </FormGroup>
          <FormGroup label="INVERSIÓN TOTAL INICIAL ($)">
            <input type="number" value={form.p_inv_total} readOnly style={{ borderColor: "rgba(247,162,106,0.4)", color: "var(--accent2)", cursor: "not-allowed" }} disabled={isProfesor} />
          </FormGroup>
        </div>
      </Card>
      
      <FeedbackPanel section="produccion" />
    </div>
  )
}
