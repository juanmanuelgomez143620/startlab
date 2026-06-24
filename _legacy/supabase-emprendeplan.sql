-- ============================================================
-- EmprendePlan — Schema SQL para Supabase
-- Autor: Juan Manuel Gómez
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- ============================================================
-- 0. EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. TABLA: perfiles (usuarios - docentes y estudiantes)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.perfiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  email           TEXT NOT NULL,
  rol             TEXT NOT NULL CHECK (rol IN ('profesor', 'estudiante')),
  codigo_clase    TEXT,                          -- código de clase que usó al registrarse
  avatar_url      TEXT,
  escuela         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.perfiles IS 'Perfil extendido de usuarios. Rol: profesor o estudiante.';
COMMENT ON COLUMN public.perfiles.rol IS 'profesor: puede crear clases y ver proyectos. estudiante: trabaja su propio proyecto.';

-- ============================================================
-- 2. TABLA: clases (creadas por docentes)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clases (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profesor_id     UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,                -- Ej: "6° A - Proyecto Empresarial 2026"
  escuela         TEXT,
  modalidad       TEXT,
  materia         TEXT,
  ciclo_lectivo   TEXT,
  codigo          TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 6)),
  descripcion     TEXT,
  activa          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.clases IS 'Clases creadas por docentes. Cada clase tiene un código único para que los alumnos se inscriban.';
COMMENT ON COLUMN public.clases.codigo IS 'Código único de 6 caracteres para que los estudiantes se unan.';

-- ============================================================
-- 3. TABLA: clase_estudiantes (relación muchos a muchos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clase_estudiantes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clase_id        UUID NOT NULL REFERENCES public.clases(id) ON DELETE CASCADE,
  estudiante_id   UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  fecha_union     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clase_id, estudiante_id)
);

COMMENT ON TABLE public.clase_estudiantes IS 'Relación entre clases y estudiantes inscritos.';

-- ============================================================
-- 4. TABLA: proyectos (plan de negocios de cada grupo/alumno)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.proyectos (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id              UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  clase_id                UUID REFERENCES public.clases(id) ON DELETE SET NULL,
  nombre_emprendimiento   TEXT NOT NULL DEFAULT 'Sin nombre',
  rubro                   TEXT,
  descripcion_breve       TEXT,
  -- Datos del plan almacenados como JSON
  datos_form              JSONB DEFAULT '{}',   -- todos los campos del formulario
  datos_estado            JSONB DEFAULT '{}',   -- arrays dinámicos (miembros, competidores, etc.)
  -- Metadata de progreso
  completitud             INTEGER DEFAULT 0,    -- porcentaje 0-100
  estado                  TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador', 'en_progreso', 'completado', 'entregado', 'calificado')),
  -- Calificación del docente
  nota                    NUMERIC(4,2),
  feedback_docente        TEXT,
  calificado_por          UUID REFERENCES public.perfiles(id),
  calificado_at           TIMESTAMPTZ,
  -- Timestamps
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proyectos_usuario ON public.proyectos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_clase ON public.proyectos(clase_id);

COMMENT ON TABLE public.proyectos IS 'Plan de negocios de cada alumno/grupo. Guarda todo el contenido del formulario.';

-- ============================================================
-- 5. TABLA: miembros_proyecto (integrantes del equipo)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.miembros_proyecto (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proyecto_id     UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  rol             TEXT DEFAULT 'Integrante',
  dni             TEXT,
  email           TEXT,
  usuario_id      UUID REFERENCES public.perfiles(id),  -- si tiene cuenta
  orden           INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.miembros_proyecto IS 'Integrantes del equipo emprendedor para cada proyecto.';

-- ============================================================
-- 6. TABLA: comentarios_docente (feedback por sección)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comentarios_docente (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proyecto_id     UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  profesor_id     UUID NOT NULL REFERENCES public.perfiles(id),
  seccion         TEXT NOT NULL CHECK (seccion IN (
    'institucional','estrategica','marketing','produccion','financiera','legal','general'
  )),
  comentario      TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.comentarios_docente IS 'Comentarios y feedback del docente por sección del plan.';

-- ============================================================
-- 7. TABLA: notificaciones
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id      UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('info','exito','alerta','calificacion')),
  titulo          TEXT NOT NULL,
  mensaje         TEXT NOT NULL,
  leida           BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. FUNCIÓN: actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trigger_perfiles_updated_at
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_clases_updated_at
  BEFORE UPDATE ON public.clases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_proyectos_updated_at
  BEFORE UPDATE ON public.proyectos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 9. FUNCIÓN: crear perfil automáticamente al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre_completo, email, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'rol', 'estudiante')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 10. FUNCIÓN: obtener proyectos de una clase (para docentes)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_proyectos_clase(p_clase_id UUID)
RETURNS TABLE (
  proyecto_id     UUID,
  nombre_emp      TEXT,
  rubro           TEXT,
  completitud     INTEGER,
  estado          TEXT,
  nota            NUMERIC,
  alumno_nombre   TEXT,
  alumno_email    TEXT,
  updated_at      TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.nombre_emprendimiento,
    p.rubro,
    p.completitud,
    p.estado,
    p.nota,
    pr.nombre_completo,
    pr.email,
    p.updated_at
  FROM public.proyectos p
  JOIN public.perfiles pr ON pr.id = p.usuario_id
  WHERE p.clase_id = p_clase_id
  ORDER BY p.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clase_estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miembros_proyecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios_docente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- ─── PERFILES ───────────────────────────────────────────────
-- Cualquier usuario autenticado puede ver perfiles (nombre, rol)
CREATE POLICY "perfiles_select_auth" ON public.perfiles
  FOR SELECT TO authenticated USING (true);

-- Solo el propio usuario puede editar su perfil
CREATE POLICY "perfiles_update_own" ON public.perfiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- El sistema inserta (via trigger), no el usuario directamente
CREATE POLICY "perfiles_insert_system" ON public.perfiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ─── CLASES ─────────────────────────────────────────────────
-- Los profesores pueden ver y gestionar sus propias clases
CREATE POLICY "clases_select_profesor" ON public.clases
  FOR SELECT TO authenticated
  USING (
    profesor_id = auth.uid()
    OR id IN (SELECT clase_id FROM public.clase_estudiantes WHERE estudiante_id = auth.uid())
  );

CREATE POLICY "clases_insert_profesor" ON public.clases
  FOR INSERT TO authenticated
  WITH CHECK (
    profesor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'profesor')
  );

CREATE POLICY "clases_update_profesor" ON public.clases
  FOR UPDATE TO authenticated
  USING (profesor_id = auth.uid());

CREATE POLICY "clases_delete_profesor" ON public.clases
  FOR DELETE TO authenticated
  USING (profesor_id = auth.uid());

-- ─── CLASE_ESTUDIANTES ──────────────────────────────────────
CREATE POLICY "clase_est_select" ON public.clase_estudiantes
  FOR SELECT TO authenticated
  USING (
    estudiante_id = auth.uid()
    OR clase_id IN (SELECT id FROM public.clases WHERE profesor_id = auth.uid())
  );

CREATE POLICY "clase_est_insert" ON public.clase_estudiantes
  FOR INSERT TO authenticated
  WITH CHECK (estudiante_id = auth.uid());

-- ─── PROYECTOS ──────────────────────────────────────────────
-- El alumno ve y edita su propio proyecto
CREATE POLICY "proyectos_select_own" ON public.proyectos
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR clase_id IN (SELECT id FROM public.clases WHERE profesor_id = auth.uid())
  );

CREATE POLICY "proyectos_insert_own" ON public.proyectos
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "proyectos_update_own" ON public.proyectos
  FOR UPDATE TO authenticated
  USING (
    usuario_id = auth.uid()
    OR clase_id IN (SELECT id FROM public.clases WHERE profesor_id = auth.uid())
  );

-- ─── MIEMBROS_PROYECTO ──────────────────────────────────────
CREATE POLICY "miembros_select" ON public.miembros_proyecto
  FOR SELECT TO authenticated
  USING (
    proyecto_id IN (SELECT id FROM public.proyectos WHERE usuario_id = auth.uid())
    OR proyecto_id IN (
      SELECT p.id FROM public.proyectos p
      JOIN public.clases c ON c.id = p.clase_id
      WHERE c.profesor_id = auth.uid()
    )
  );

CREATE POLICY "miembros_manage_own" ON public.miembros_proyecto
  FOR ALL TO authenticated
  USING (
    proyecto_id IN (SELECT id FROM public.proyectos WHERE usuario_id = auth.uid())
  );

-- ─── COMENTARIOS_DOCENTE ────────────────────────────────────
CREATE POLICY "comentarios_select" ON public.comentarios_docente
  FOR SELECT TO authenticated
  USING (
    proyecto_id IN (SELECT id FROM public.proyectos WHERE usuario_id = auth.uid())
    OR profesor_id = auth.uid()
  );

CREATE POLICY "comentarios_insert_profesor" ON public.comentarios_docente
  FOR INSERT TO authenticated
  WITH CHECK (
    profesor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'profesor')
  );

-- ─── NOTIFICACIONES ─────────────────────────────────────────
CREATE POLICY "notif_own" ON public.notificaciones
  FOR ALL TO authenticated
  USING (usuario_id = auth.uid());

-- ============================================================
-- 12. DATOS INICIALES DE EJEMPLO (opcional, comentar si no se necesita)
-- ============================================================
-- INSERT INTO public.perfiles (id, nombre_completo, email, rol)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'Juan Manuel Gómez', 'jmgomez@ejemplo.com', 'profesor');

-- ============================================================
-- 13. VISTAS ÚTILES PARA EL PANEL DOCENTE
-- ============================================================

-- Vista: resumen de proyectos por clase
CREATE OR REPLACE VIEW public.v_resumen_clase AS
SELECT
  c.id AS clase_id,
  c.nombre AS clase_nombre,
  c.codigo AS clase_codigo,
  c.ciclo_lectivo,
  pr_prof.nombre_completo AS profesor_nombre,
  COUNT(DISTINCT ce.estudiante_id) AS total_estudiantes,
  COUNT(DISTINCT p.id) AS total_proyectos,
  ROUND(AVG(p.completitud), 0) AS completitud_promedio,
  COUNT(DISTINCT CASE WHEN p.estado = 'entregado' THEN p.id END) AS proyectos_entregados
FROM public.clases c
JOIN public.perfiles pr_prof ON pr_prof.id = c.profesor_id
LEFT JOIN public.clase_estudiantes ce ON ce.clase_id = c.id
LEFT JOIN public.proyectos p ON p.clase_id = c.id
GROUP BY c.id, c.nombre, c.codigo, c.ciclo_lectivo, pr_prof.nombre_completo;

COMMENT ON VIEW public.v_resumen_clase IS 'Vista para que el docente vea el resumen de su clase.';

-- Vista: tabla de seguimiento de alumnos
CREATE OR REPLACE VIEW public.v_seguimiento_alumnos AS
SELECT
  p.id AS proyecto_id,
  p.nombre_emprendimiento,
  p.rubro,
  p.completitud,
  p.estado,
  p.nota,
  p.updated_at AS ultima_modificacion,
  pr.nombre_completo AS alumno,
  pr.email AS alumno_email,
  c.nombre AS clase,
  c.id AS clase_id
FROM public.proyectos p
JOIN public.perfiles pr ON pr.id = p.usuario_id
LEFT JOIN public.clases c ON c.id = p.clase_id;

COMMENT ON VIEW public.v_seguimiento_alumnos IS 'Vista para seguimiento del docente. Ver con WHERE clase_id = X.';

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
-- Próximos pasos:
-- 1. Ejecutá este SQL en el SQL Editor de Supabase
-- 2. Copiá tu Project URL y Anon Key desde Settings > API
-- 3. Pegá los valores en plan-negocios.html:
--    var SUPABASE_URL = 'https://XXXXXXXX.supabase.co';
--    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
-- 4. Agregá el script de Supabase JS en el <head>:
--    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
-- ============================================================
