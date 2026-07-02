-- ============================================================
-- Startlab (ex EmprendePlan) — Migración ABP
-- Co-docencia por clase + equipos de alumnos con selección de compañeros
-- Aplicado directo contra el proyecto Supabase cldovzycctdcsfzdhgwd
-- ============================================================

-- ============================================================
-- 1. CO-DOCENCIA
-- ============================================================

-- 1.1 Código separado para que un docente se sume como colaborador
ALTER TABLE public.clases
  ADD COLUMN IF NOT EXISTS codigo_docente TEXT UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 6));

-- Rellenar códigos para filas existentes (por si el default no corrió en el ALTER)
UPDATE public.clases SET codigo_docente = upper(substr(md5(random()::text || id::text), 1, 6))
WHERE codigo_docente IS NULL;

ALTER TABLE public.clases ALTER COLUMN codigo_docente SET NOT NULL;

-- 1.2 Tabla de colaboradores (el titular sigue siendo clases.profesor_id, no se duplica acá)
CREATE TABLE IF NOT EXISTS public.clase_profesores (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clase_id      UUID NOT NULL REFERENCES public.clases(id) ON DELETE CASCADE,
  profesor_id   UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  rol           TEXT NOT NULL DEFAULT 'colaborador' CHECK (rol IN ('titular', 'colaborador')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clase_id, profesor_id)
);

COMMENT ON TABLE public.clase_profesores IS 'Docentes colaboradores de una clase (co-docencia). El titular es clases.profesor_id y no aparece acá.';

CREATE INDEX IF NOT EXISTS idx_clase_prof_clase ON public.clase_profesores(clase_id);
CREATE INDEX IF NOT EXISTS idx_clase_prof_profesor ON public.clase_profesores(profesor_id);

-- 1.3 Helper: ¿es auth.uid() profesor (titular o colaborador) de esta clase?
CREATE OR REPLACE FUNCTION public.es_profesor_clase(p_clase_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clases WHERE id = p_clase_id AND profesor_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.clase_profesores WHERE clase_id = p_clase_id AND profesor_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1.4 Ampliar mis_clases_como_profesor() para incluir clases co-dictadas
CREATE OR REPLACE FUNCTION public.mis_clases_como_profesor()
RETURNS SETOF UUID AS $$
  SELECT id FROM public.clases WHERE profesor_id = auth.uid()
  UNION
  SELECT clase_id FROM public.clase_profesores WHERE profesor_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1.5 RLS de clase_profesores
ALTER TABLE public.clase_profesores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clase_prof_select" ON public.clase_profesores
  FOR SELECT TO authenticated
  USING (public.es_profesor_clase(clase_id));

CREATE POLICY "clase_prof_insert" ON public.clase_profesores
  FOR INSERT TO authenticated
  WITH CHECK (
    profesor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'profesor')
  );

CREATE POLICY "clase_prof_delete" ON public.clase_profesores
  FOR DELETE TO authenticated
  USING (
    profesor_id = auth.uid()  -- el propio colaborador se puede ir
    OR EXISTS (SELECT 1 FROM public.clases WHERE id = clase_id AND profesor_id = auth.uid())  -- o el titular lo expulsa
  );

-- 1.6 Actualizar políticas existentes para reconocer colaboradores
DROP POLICY IF EXISTS "clases_select_profesor" ON public.clases;
CREATE POLICY "clases_select_profesor" ON public.clases
  FOR SELECT TO authenticated
  USING (
    profesor_id = auth.uid()
    OR id IN (SELECT clase_id FROM public.clase_profesores WHERE profesor_id = auth.uid())
    OR id IN (SELECT clase_id FROM public.clase_estudiantes WHERE estudiante_id = auth.uid())
    OR activa = TRUE
  );

DROP POLICY IF EXISTS "clases_update_profesor" ON public.clases;
CREATE POLICY "clases_update_profesor" ON public.clases
  FOR UPDATE TO authenticated
  USING (public.es_profesor_clase(id));
-- clases_delete_profesor se deja sin tocar: solo el titular (profesor_id = auth.uid()) puede borrar.

DROP POLICY IF EXISTS "proyectos_select_own" ON public.proyectos;
CREATE POLICY "proyectos_select_own" ON public.proyectos
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR (clase_id IS NOT NULL AND public.es_profesor_clase(clase_id))
  );

DROP POLICY IF EXISTS "proyectos_update_own" ON public.proyectos;
CREATE POLICY "proyectos_update_own" ON public.proyectos
  FOR UPDATE TO authenticated
  USING (
    usuario_id = auth.uid()
    OR (clase_id IS NOT NULL AND public.es_profesor_clase(clase_id))
  );

DROP POLICY IF EXISTS "miembros_select" ON public.miembros_proyecto;
CREATE POLICY "miembros_select" ON public.miembros_proyecto
  FOR SELECT TO authenticated
  USING (
    proyecto_id IN (SELECT id FROM public.proyectos WHERE usuario_id = auth.uid())
    OR proyecto_id IN (
      SELECT p.id FROM public.proyectos p
      WHERE p.clase_id IS NOT NULL AND public.es_profesor_clase(p.clase_id)
    )
  );

DROP POLICY IF EXISTS "ppart_select" ON public.proyecto_participantes;
CREATE POLICY "ppart_select" ON public.proyecto_participantes
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR proyecto_id IN (SELECT id FROM public.proyectos WHERE usuario_id = auth.uid())
    OR proyecto_id IN (
      SELECT p.id FROM public.proyectos p
      WHERE p.clase_id IS NOT NULL AND public.es_profesor_clase(p.clase_id)
    )
  );

DROP POLICY IF EXISTS "comentarios_select" ON public.comentarios_docente;
CREATE POLICY "comentarios_select" ON public.comentarios_docente
  FOR SELECT TO authenticated
  USING (
    proyecto_id IN (SELECT id FROM public.proyectos WHERE usuario_id = auth.uid())
    OR proyecto_id IN (
      SELECT p.id FROM public.proyectos p
      WHERE p.clase_id IS NOT NULL AND public.es_profesor_clase(p.clase_id)
    )
  );

DROP POLICY IF EXISTS "comentarios_insert_profesor" ON public.comentarios_docente;
CREATE POLICY "comentarios_insert_profesor" ON public.comentarios_docente
  FOR INSERT TO authenticated
  WITH CHECK (
    profesor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'profesor')
    AND proyecto_id IN (
      SELECT p.id FROM public.proyectos p
      WHERE p.clase_id IS NOT NULL AND public.es_profesor_clase(p.clase_id)
    )
  );

-- ============================================================
-- 2. EQUIPOS DE ALUMNOS — SELECCIÓN DE COMPAÑEROS
-- ============================================================

-- 2.1 Función: compañeros de la clase que todavía no tienen equipo
CREATE OR REPLACE FUNCTION public.companeros_disponibles(p_clase_id UUID)
RETURNS TABLE (id UUID, nombre_completo TEXT, email TEXT) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.clase_estudiantes
    WHERE clase_id = p_clase_id AND estudiante_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No pertenecés a esta clase';
  END IF;

  RETURN QUERY
  SELECT pr.id, pr.nombre_completo, pr.email
  FROM public.clase_estudiantes ce
  JOIN public.perfiles pr ON pr.id = ce.estudiante_id
  WHERE ce.clase_id = p_clase_id
    AND ce.estudiante_id <> auth.uid()
    AND ce.estudiante_id NOT IN (
      SELECT usuario_id FROM public.proyectos WHERE clase_id = p_clase_id
      UNION
      SELECT pp.usuario_id FROM public.proyecto_participantes pp
        JOIN public.proyectos p ON p.id = pp.proyecto_id
        WHERE p.clase_id = p_clase_id
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2.2 Ampliar proyecto_participantes: el líder también puede agregar/quitar miembros
DROP POLICY IF EXISTS "ppart_insert" ON public.proyecto_participantes;
CREATE POLICY "ppart_insert" ON public.proyecto_participantes
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()  -- alguien se une por código
    OR proyecto_id IN (SELECT id FROM public.proyectos WHERE usuario_id = auth.uid())  -- el líder agrega a otro
  );

DROP POLICY IF EXISTS "ppart_delete" ON public.proyecto_participantes;
CREATE POLICY "ppart_delete" ON public.proyecto_participantes
  FOR DELETE TO authenticated
  USING (
    usuario_id = auth.uid()  -- se auto-expulsa (sale del equipo)
    OR proyecto_id IN (SELECT id FROM public.proyectos WHERE usuario_id = auth.uid())  -- el líder expulsa
  );

-- 2.3 Trigger: un alumno no puede estar en dos equipos de la misma clase
CREATE OR REPLACE FUNCTION public.check_unico_equipo_por_clase()
RETURNS TRIGGER AS $$
DECLARE
  v_clase_id UUID;
  v_existe BOOLEAN;
BEGIN
  SELECT clase_id INTO v_clase_id FROM public.proyectos WHERE id = NEW.proyecto_id;
  IF v_clase_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.proyectos
      WHERE usuario_id = NEW.usuario_id AND clase_id = v_clase_id
    UNION
    SELECT 1 FROM public.proyecto_participantes pp
      JOIN public.proyectos p ON p.id = pp.proyecto_id
      WHERE pp.usuario_id = NEW.usuario_id AND p.clase_id = v_clase_id
  ) INTO v_existe;

  IF v_existe THEN
    RAISE EXCEPTION 'El alumno ya pertenece a un equipo en esta clase';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_unico_equipo ON public.proyecto_participantes;
CREATE TRIGGER trg_check_unico_equipo
  BEFORE INSERT ON public.proyecto_participantes
  FOR EACH ROW EXECUTE FUNCTION public.check_unico_equipo_por_clase();

-- ============================================================
-- 3. FIX: los participantes del equipo (no solo el líder) deben poder
--    ver y editar el proyecto compartido, y ver el feedback del docente.
--    (Bug preexistente: antes de esta migración, unirse por código ya
--    dejaba al compañero sin poder ver ni guardar el proyecto).
--
--    proyecto_participantes.ppart_select ya consulta "proyectos", así que
--    referenciar proyecto_participantes directamente desde las políticas
--    de "proyectos" genera recursión infinita entre ambas tablas. Se
--    rompe el ciclo con una función SECURITY DEFINER (mismo patrón que
--    mis_clases_como_profesor()).
-- ============================================================

CREATE OR REPLACE FUNCTION public.mis_proyectos_participante()
RETURNS SETOF UUID AS $$
  SELECT proyecto_id FROM public.proyecto_participantes WHERE usuario_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

DROP POLICY IF EXISTS "proyectos_select_own" ON public.proyectos;
CREATE POLICY "proyectos_select_own" ON public.proyectos
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR id IN (SELECT public.mis_proyectos_participante())
    OR (clase_id IS NOT NULL AND public.es_profesor_clase(clase_id))
  );

DROP POLICY IF EXISTS "proyectos_update_own" ON public.proyectos;
CREATE POLICY "proyectos_update_own" ON public.proyectos
  FOR UPDATE TO authenticated
  USING (
    usuario_id = auth.uid()
    OR id IN (SELECT public.mis_proyectos_participante())
    OR (clase_id IS NOT NULL AND public.es_profesor_clase(clase_id))
  );

DROP POLICY IF EXISTS "comentarios_select" ON public.comentarios_docente;
CREATE POLICY "comentarios_select" ON public.comentarios_docente
  FOR SELECT TO authenticated
  USING (
    proyecto_id IN (
      SELECT id FROM public.proyectos WHERE usuario_id = auth.uid()
      UNION
      SELECT public.mis_proyectos_participante()
    )
    OR proyecto_id IN (
      SELECT p.id FROM public.proyectos p
      WHERE p.clase_id IS NOT NULL AND public.es_profesor_clase(p.clase_id)
    )
  );

DROP POLICY IF EXISTS "miembros_select" ON public.miembros_proyecto;
CREATE POLICY "miembros_select" ON public.miembros_proyecto
  FOR SELECT TO authenticated
  USING (
    proyecto_id IN (
      SELECT id FROM public.proyectos WHERE usuario_id = auth.uid()
      UNION
      SELECT public.mis_proyectos_participante()
    )
    OR proyecto_id IN (
      SELECT p.id FROM public.proyectos p
      WHERE p.clase_id IS NOT NULL AND public.es_profesor_clase(p.clase_id)
    )
  );

-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================
