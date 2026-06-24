import { Card, CardTitle, CardSubtitle, FormGroup } from '../components/ui'
import { FeedbackPanel } from '../components/FeedbackPanel'

const FORMAS = ['Emprendimiento estudiantil (sin personería aún)','Monotributista / Autónomo','Sociedad de Hecho','SAS (Sociedad por Acciones Simplificada)','SRL (Sociedad de Responsabilidad Limitada)','Cooperativa']
const IMPOSITIVOS = ['Monotributo Categoría A','Monotributo Categoría B','Monotributo Categoría C','Responsable Inscripto','No aplica (proyecto escolar)']

const TRAMITES = {
  nac: [
    { id: 'cuit', nombre: 'Obtención de CUIT', desc: 'Trámite ante la AFIP para obtener la Clave Única de Identificación Tributaria.' },
    { id: 'mono', nombre: 'Inscripción como Monotributista', desc: 'Alta en el Régimen Simplificado para pequeños contribuyentes.' },
    { id: 'afip', nombre: 'Alta en AFIP / portal Mi AFIP', desc: 'Registro en el sistema digital de AFIP para gestionar declaraciones y pagos.' },
    { id: 'banco', nombre: 'Apertura de cuenta bancaria / CVU', desc: 'Cuenta para recibir cobros y manejar fondos del emprendimiento.' },
    { id: 'marca', nombre: 'Registro de Marca (INPI)', desc: 'Protección del nombre e imagen ante el Instituto Nacional de la Propiedad Industrial.' },
  ],
  prov: [
    { id: 'ing_brutos', nombre: 'Inscripción en Ingresos Brutos', desc: 'Registro en la Dirección General de Rentas de Misiones.' },
    { id: 'rentas', nombre: 'Alta en DGR Misiones', desc: 'Tramitar usuario, declarar actividad y conocer alícuotas aplicables.' },
    { id: 'habilitacion_prov', nombre: 'Habilitación provincial (si aplica)', desc: 'Para rubros como alimentos, salud o actividades reguladas.' },
  ],
  mun: [
    { id: 'hab_mun', nombre: 'Habilitación Municipal del Local', desc: 'Trámite en la Municipalidad para habilitar el local o espacio de producción.' },
    { id: 'libre_deuda', nombre: 'Certificado de Libre Deuda', desc: 'Documento que acredita que no hay deudas pendientes con la municipalidad.' },
    { id: 'bromatologia', nombre: 'Habilitación Bromatológica (si aplica)', desc: 'Obligatorio para emprendimientos de alimentos.' },
    { id: 'patente', nombre: 'Patente Comercial', desc: 'Pago de la tasa por actividad comercial a la municipalidad.' },
  ],
}

export default function PageLegal() {
  const { form, setField, estado, setEstado, perfil } = useStore()
  const isProfesor = perfil?.rol === 'profesor'

  function toggle(id: string) {
    if (isProfesor) return
    setEstado({ tramitesDone: { ...estado.tramitesDone, [id]: !estado.tramitesDone[id] } })
  }

  const seccionTitles: Record<string, string> = {
    nac: '🇦🇷 Trámites Nacionales',
    prov: '🏛️ Trámites Provinciales',
    mun: '🏘️ Trámites Municipales',
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 10 }}>
          ⚖️ Gestión Legal e Impositiva
          <span style={{ background: 'rgba(247,162,106,0.15)', color: 'var(--accent2)', border: '1px solid rgba(247,162,106,0.25)', borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600 }}>Paso 6</span>
        </h1>
      </div>

      <Card>
        <CardTitle icon="🗂️">Forma Jurídica</CardTitle>
        <CardSubtitle>Definí la estructura legal de tu emprendimiento</CardSubtitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FormGroup label="Forma Jurídica" required helper="Para proyectos escolares, la opción más común es 'Emprendimiento estudiantil'.">
            <select value={form.l_forma} onChange={e => setField('l_forma', e.target.value)} className={form.l_forma ? 'filled' : ''} disabled={isProfesor}>
              <option value="">Seleccioná...</option>
              {FORMAS.map(f => <option key={f}>{f}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Régimen impositivo previsto">
            <select value={form.l_impositivo} onChange={e => setField('l_impositivo', e.target.value)} disabled={isProfesor}>
              <option value="">Seleccioná...</option>
              {IMPOSITIVOS.map(i => <option key={i}>{i}</option>)}
            </select>
          </FormGroup>
        </div>
      </Card>

      {(Object.keys(TRAMITES) as ('nac' | 'prov' | 'mun')[]).map(tipo => (
        <Card key={tipo}>
          <CardTitle>{seccionTitles[tipo]}</CardTitle>
          <CardSubtitle>{tipo === 'nac' ? 'Gestiones a nivel nacional' : tipo === 'prov' ? 'Gestiones provinciales (Misiones)' : 'Gestiones en el municipio local'}</CardSubtitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {TRAMITES[tipo].map(t => (
              <div key={t.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div onClick={() => toggle(t.id)}
                  style={{
                    width: 20, height: 20, borderRadius: 4, cursor: 'pointer', flexShrink: 0, marginTop: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem',
                    transition: 'all 0.18s',
                    background: estado.tramitesDone[t.id] ? 'var(--success)' : 'transparent',
                    border: `2px solid ${estado.tramitesDone[t.id] ? 'var(--success)' : 'var(--border)'}`,
                    color: '#000',
                    cursor: isProfesor ? 'default' : 'pointer'
                  }}>
                  {estado.tramitesDone[t.id] ? '✓' : ''}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: estado.tramitesDone[t.id] ? 'var(--success)' : 'var(--text)' }}>{t.nombre}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text2)', marginTop: 3 }}>{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Card>
        <CardTitle icon="📝">Notas y Observaciones Legales</CardTitle>
        <FormGroup label="">
          <textarea value={form.l_notas} onChange={e => setField('l_notas', e.target.value)}
            placeholder="Agregá cualquier nota sobre el aspecto legal: consultas realizadas, contactos de organismos, plazos estimados, etc."
            style={{ minHeight: 100 }} disabled={isProfesor} />
        </FormGroup>
      </Card>

      <FeedbackPanel section="legal" />
    </div>
  )
}
