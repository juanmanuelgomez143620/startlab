-- ============================================================
-- Startlab / EmprendePlan — Esquema completo (Supabase)
-- Reconstruido a partir del código de la app (src/) el 2026-11-14.
-- Reemplaza a _legacy/supabase-emprendeplan.sql + _legacy/2026-07-abp-migracion.sql
-- e incorpora los cambios que se habían aplicado a mano en la base anterior.
-- Idempotente en lo posible: se puede ejecutar en un proyecto vacío.
-- ============================================================

-- ============================================================
-- 1. TABLAS
-- ============================================================

-- 1.1 Perfiles (docentes y estudiantes)
CREATE TABLE IF NOT EXISTS public.perfiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  email           TEXT NOT NULL,
  rol             TEXT NOT NULL CHECK (rol IN ('profesor', 'estudiante')),
  codigo_clase    TEXT,
  avatar_url      TEXT,
  escuela         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 Clases
CREATE TABLE IF NOT EXISTS public.clases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profesor_id     UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  escuela         TEXT,
  modalidad       TEXT,
  materia         TEXT,
  curso           TEXT,
  ciclo_lectivo   TEXT,
  descripcion     TEXT,
  codigo          TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 6)),
  codigo_docente  TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 6)),
  activa          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN public.clases.codigo IS 'Código para que los alumnos se inscriban.';
COMMENT ON COLUMN public.clases.codigo_docente IS 'Código para que otro docente se sume como colaborador.';
CREATE INDEX IF NOT EXISTS idx_clases_profesor ON public.clases(profesor_id);

-- 1.3 Alumnos inscriptos en clases
CREATE TABLE IF NOT EXISTS public.clase_estudiantes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clase_id        UUID NOT NULL REFERENCES public.clases(id) ON DELETE CASCADE,
  estudiante_id   UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  fecha_union     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clase_id, estudiante_id)
);
CREATE INDEX IF NOT EXISTS idx_clase_est_estudiante ON public.clase_estudiantes(estudiante_id);

-- 1.4 Co-docencia (el titular es clases.profesor_id y no aparece acá)
CREATE TABLE IF NOT EXISTS public.clase_profesores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clase_id        UUID NOT NULL REFERENCES public.clases(id) ON DELETE CASCADE,
  profesor_id     UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  rol             TEXT NOT NULL DEFAULT 'colaborador' CHECK (rol IN ('titular', 'colaborador')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clase_id, profesor_id)
);
CREATE INDEX IF NOT EXISTS idx_clase_prof_profesor ON public.clase_profesores(profesor_id);

-- 1.5 Proyectos (plan de negocios; usuario_id = líder del equipo)
-- Nota: proyectos tiene UNA sola FK a perfiles a propósito; la app hace
-- embeds tipo proyectos(..., perfiles(nombre_completo)) y una segunda FK
-- los volvería ambiguos.
CREATE TABLE IF NOT EXISTS public.proyectos (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id              UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  clase_id                UUID REFERENCES public.clases(id) ON DELETE SET NULL,
  codigo_grupo            TEXT UNIQUE,
  nombre_emprendimiento   TEXT NOT NULL DEFAULT 'Sin nombre',
  rubro                   TEXT,
  descripcion_breve       TEXT,
  datos_form              JSONB NOT NULL DEFAULT '{}',
  datos_estado            JSONB NOT NULL DEFAULT '{}',
  completitud             INTEGER NOT NULL DEFAULT 0,
  estado                  TEXT NOT NULL DEFAULT 'borrador'
                          CHECK (estado IN ('borrador', 'en_progreso', 'completado', 'entregado', 'calificado')),
  nota                    NUMERIC(4,2),
  feedback_docente        TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proyectos_usuario ON public.proyectos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_clase ON public.proyectos(clase_id);

-- 1.6 Integrantes del equipo (además del líder)
CREATE TABLE IF NOT EXISTS public.proyecto_participantes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id     UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (proyecto_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_ppart_usuario ON public.proyecto_participantes(usuario_id);

-- 1.7 Feedback por sección (docente <-> equipo)
CREATE TABLE IF NOT EXISTS public.comentarios_secciones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id       UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  seccion           TEXT NOT NULL,
  usuario_id        UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  usuario_nombre    TEXT NOT NULL,
  texto             TEXT NOT NULL,
  leido_estudiante  BOOLEAN NOT NULL DEFAULT FALSE,
  leido_profesor    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coment_proyecto ON public.comentarios_secciones(proyecto_id, seccion);

-- ============================================================
-- 2. TRIGGERS DE MANTENIMIENTO
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_perfiles_updated_at ON public.perfiles;
CREATE TRIGGER trigger_perfiles_updated_at BEFORE UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trigger_clases_updated_at ON public.clases;
CREATE TRIGGER trigger_clases_updated_at BEFORE UPDATE ON public.clases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trigger_proyectos_updated_at ON public.proyectos;
CREATE TRIGGER trigger_proyectos_updated_at BEFORE UPDATE ON public.proyectos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Un usuario no puede cambiarse el rol a sí mismo (p. ej. alumno -> profesor)
CREATE OR REPLACE FUNCTION public.bloquear_cambio_rol()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.rol IS DISTINCT FROM OLD.rol AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'No se puede cambiar el rol del usuario';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_bloquear_cambio_rol ON public.perfiles;
CREATE TRIGGER trg_bloquear_cambio_rol BEFORE UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_cambio_rol();

-- Alta automática de perfil + inscripción a la clase al registrarse.
-- Funciona aunque esté activada la confirmación por email (cuando el
-- cliente todavía no tiene sesión y no puede escribir por RLS).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_rol    TEXT := COALESCE(NEW.raw_user_meta_data->>'rol', 'estudiante');
  v_codigo TEXT := NULLIF(upper(trim(NEW.raw_user_meta_data->>'codigo_clase')), '');
  v_clase  UUID;
BEGIN
  IF v_rol NOT IN ('profesor', 'estudiante') THEN
    v_rol := 'estudiante';
  END IF;

  INSERT INTO public.perfiles (id, nombre_completo, email, rol, codigo_clase)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nombre_completo', ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    v_rol,
    v_codigo
  )
  ON CONFLICT (id) DO NOTHING;

  IF v_rol = 'estudiante' AND v_codigo IS NOT NULL THEN
    SELECT id INTO v_clase FROM public.clases WHERE codigo = v_codigo AND activa;
    IF v_clase IS NOT NULL THEN
      INSERT INTO public.clase_estudiantes (clase_id, estudiante_id)
      VALUES (v_clase, NEW.id)
      ON CONFLICT (clase_id, estudiante_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Un alumno no puede estar en dos equipos de la misma clase
CREATE OR REPLACE FUNCTION public.check_unico_equipo_por_clase()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_clase_id UUID;
BEGIN
  SELECT clase_id INTO v_clase_id FROM public.proyectos WHERE id = NEW.proyecto_id;
  IF v_clase_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.proyectos
      WHERE usuario_id = NEW.usuario_id AND clase_id = v_clase_id
    UNION ALL
    SELECT 1 FROM public.proyecto_participantes pp
      JOIN public.proyectos p ON p.id = pp.proyecto_id
      WHERE pp.usuario_id = NEW.usuario_id AND p.clase_id = v_clase_id
  ) THEN
    RAISE EXCEPTION 'El alumno ya pertenece a un equipo en esta clase';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_unico_equipo ON public.proyecto_participantes;
CREATE TRIGGER trg_check_unico_equipo BEFORE INSERT ON public.proyecto_participantes
  FOR EACH ROW EXECUTE FUNCTION public.check_unico_equipo_por_clase();

-- ============================================================
-- 3. FUNCIONES HELPER (SECURITY DEFINER para evitar recursión de RLS)
-- ============================================================

CREATE OR REPLACE FUNCTION public.es_profesor_clase(p_clase_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.clases WHERE id = p_clase_id AND profesor_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.clase_profesores WHERE clase_id = p_clase_id AND profesor_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.mis_clases_como_profesor()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT id FROM public.clases WHERE profesor_id = auth.uid()
  UNION
  SELECT clase_id FROM public.clase_profesores WHERE profesor_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.mis_clases_como_estudiante()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT clase_id FROM public.clase_estudiantes WHERE estudiante_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.mis_proyectos_participante()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT proyecto_id FROM public.proyecto_participantes WHERE usuario_id = auth.uid();
$$;

-- ¿Puede el usuario actual ver/trabajar este proyecto? (líder, integrante o docente de la clase)
CREATE OR REPLACE FUNCTION public.puede_ver_proyecto(p_proyecto_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.proyectos p
    WHERE p.id = p_proyecto_id
      AND (
        p.usuario_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.proyecto_participantes pp
                   WHERE pp.proyecto_id = p.id AND pp.usuario_id = auth.uid())
        OR (p.clase_id IS NOT NULL AND public.es_profesor_clase(p.clase_id))
      )
  );
$$;

-- ============================================================
-- 4. RPC PÚBLICAS (búsqueda por código sin exponer la tabla entera)
-- ============================================================

-- Validar código de clase (se usa antes del registro, sin sesión)
CREATE OR REPLACE FUNCTION public.clase_id_por_codigo(p_codigo TEXT)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT id FROM public.clases WHERE codigo = upper(trim(p_codigo)) AND activa LIMIT 1;
$$;

-- Un docente se suma como colaborador con el código docente
CREATE OR REPLACE FUNCTION public.clase_por_codigo_docente(p_codigo TEXT)
RETURNS TABLE (id UUID, profesor_id UUID) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT c.id, c.profesor_id FROM public.clases c
  WHERE c.codigo_docente = upper(trim(p_codigo))
    AND EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'profesor')
  LIMIT 1;
$$;

-- Un alumno se une a un equipo con el código de grupo
CREATE OR REPLACE FUNCTION public.proyecto_por_codigo_grupo(p_codigo TEXT)
RETURNS TABLE (id UUID, clase_id UUID) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id, p.clase_id FROM public.proyectos p
  WHERE p.codigo_grupo = upper(trim(p_codigo))
    AND auth.uid() IS NOT NULL
  LIMIT 1;
$$;

-- Compañeros de la clase que todavía no tienen equipo
CREATE OR REPLACE FUNCTION public.companeros_disponibles(p_clase_id UUID)
RETURNS TABLE (id UUID, nombre_completo TEXT, email TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
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
      SELECT p.usuario_id FROM public.proyectos p WHERE p.clase_id = p_clase_id
      UNION
      SELECT pp.usuario_id FROM public.proyecto_participantes pp
        JOIN public.proyectos p ON p.id = pp.proyecto_id
        WHERE p.clase_id = p_clase_id
    );
END;
$$;

-- ============================================================
-- 5. PERMISOS
-- ============================================================

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.perfiles, public.clases, public.clase_estudiantes, public.clase_profesores,
  public.proyectos, public.proyecto_participantes, public.comentarios_secciones
TO authenticated;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.es_profesor_clase(UUID),
  public.mis_clases_como_profesor(),
  public.mis_clases_como_estudiante(),
  public.mis_proyectos_participante(),
  public.puede_ver_proyecto(UUID),
  public.clase_id_por_codigo(TEXT),
  public.clase_por_codigo_docente(TEXT),
  public.proyecto_por_codigo_grupo(TEXT),
  public.companeros_disponibles(UUID)
TO authenticated;
GRANT EXECUTE ON FUNCTION public.clase_id_por_codigo(TEXT) TO anon;

-- Las funciones de trigger no se llaman por RPC
REVOKE EXECUTE ON FUNCTION
  public.set_updated_at(),
  public.bloquear_cambio_rol(),
  public.handle_new_user(),
  public.check_unico_equipo_por_clase()
FROM authenticated, anon, PUBLIC;

CREATE INDEX IF NOT EXISTS idx_coment_usuario ON public.comentarios_secciones(usuario_id);

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.perfiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clases                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clase_estudiantes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clase_profesores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios_secciones  ENABLE ROW LEVEL SECURITY;

-- ─── perfiles ───────────────────────────────────────────────
DROP POLICY IF EXISTS perfiles_select_auth ON public.perfiles;
CREATE POLICY perfiles_select_auth ON public.perfiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS perfiles_insert_own ON public.perfiles;
CREATE POLICY perfiles_insert_own ON public.perfiles
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS perfiles_update_own ON public.perfiles;
CREATE POLICY perfiles_update_own ON public.perfiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

-- ─── clases ─────────────────────────────────────────────────
DROP POLICY IF EXISTS clases_select ON public.clases;
CREATE POLICY clases_select ON public.clases
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT public.mis_clases_como_profesor())
    OR id IN (SELECT public.mis_clases_como_estudiante())
  );

DROP POLICY IF EXISTS clases_insert ON public.clases;
CREATE POLICY clases_insert ON public.clases
  FOR INSERT TO authenticated
  WITH CHECK (
    profesor_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.perfiles WHERE id = (SELECT auth.uid()) AND rol = 'profesor')
  );

DROP POLICY IF EXISTS clases_update ON public.clases;
CREATE POLICY clases_update ON public.clases
  FOR UPDATE TO authenticated
  USING (public.es_profesor_clase(id));

DROP POLICY IF EXISTS clases_delete ON public.clases;
CREATE POLICY clases_delete ON public.clases
  FOR DELETE TO authenticated
  USING (profesor_id = (SELECT auth.uid()));  -- solo el titular

-- ─── clase_estudiantes ──────────────────────────────────────
DROP POLICY IF EXISTS clase_est_select ON public.clase_estudiantes;
CREATE POLICY clase_est_select ON public.clase_estudiantes
  FOR SELECT TO authenticated
  USING (
    estudiante_id = (SELECT auth.uid())
    OR clase_id IN (SELECT public.mis_clases_como_profesor())
  );

DROP POLICY IF EXISTS clase_est_insert ON public.clase_estudiantes;
CREATE POLICY clase_est_insert ON public.clase_estudiantes
  FOR INSERT TO authenticated
  WITH CHECK (estudiante_id = (SELECT auth.uid()));

-- necesaria para el upsert(onConflict) que hace la app
DROP POLICY IF EXISTS clase_est_update ON public.clase_estudiantes;
CREATE POLICY clase_est_update ON public.clase_estudiantes
  FOR UPDATE TO authenticated
  USING (estudiante_id = (SELECT auth.uid()))
  WITH CHECK (estudiante_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS clase_est_delete ON public.clase_estudiantes;
CREATE POLICY clase_est_delete ON public.clase_estudiantes
  FOR DELETE TO authenticated
  USING (
    estudiante_id = (SELECT auth.uid())
    OR clase_id IN (SELECT public.mis_clases_como_profesor())
  );

-- ─── clase_profesores ───────────────────────────────────────
DROP POLICY IF EXISTS clase_prof_select ON public.clase_profesores;
CREATE POLICY clase_prof_select ON public.clase_profesores
  FOR SELECT TO authenticated
  USING (public.es_profesor_clase(clase_id));

DROP POLICY IF EXISTS clase_prof_insert ON public.clase_profesores;
CREATE POLICY clase_prof_insert ON public.clase_profesores
  FOR INSERT TO authenticated
  WITH CHECK (
    profesor_id = (SELECT auth.uid())
    AND rol = 'colaborador'
    AND EXISTS (SELECT 1 FROM public.perfiles WHERE id = (SELECT auth.uid()) AND rol = 'profesor')
  );

DROP POLICY IF EXISTS clase_prof_delete ON public.clase_profesores;
CREATE POLICY clase_prof_delete ON public.clase_profesores
  FOR DELETE TO authenticated
  USING (
    profesor_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.clases c WHERE c.id = clase_id AND c.profesor_id = (SELECT auth.uid()))
  );

-- ─── proyectos ──────────────────────────────────────────────
DROP POLICY IF EXISTS proyectos_select ON public.proyectos;
CREATE POLICY proyectos_select ON public.proyectos
  FOR SELECT TO authenticated
  USING (
    usuario_id = (SELECT auth.uid())
    OR id IN (SELECT public.mis_proyectos_participante())
    OR clase_id IN (SELECT public.mis_clases_como_profesor())
  );

DROP POLICY IF EXISTS proyectos_insert ON public.proyectos;
CREATE POLICY proyectos_insert ON public.proyectos
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS proyectos_update ON public.proyectos;
CREATE POLICY proyectos_update ON public.proyectos
  FOR UPDATE TO authenticated
  USING (
    usuario_id = (SELECT auth.uid())
    OR id IN (SELECT public.mis_proyectos_participante())
    OR clase_id IN (SELECT public.mis_clases_como_profesor())
  );

DROP POLICY IF EXISTS proyectos_delete ON public.proyectos;
CREATE POLICY proyectos_delete ON public.proyectos
  FOR DELETE TO authenticated
  USING (usuario_id = (SELECT auth.uid()));  -- solo el líder

-- ─── proyecto_participantes ─────────────────────────────────
DROP POLICY IF EXISTS ppart_select ON public.proyecto_participantes;
CREATE POLICY ppart_select ON public.proyecto_participantes
  FOR SELECT TO authenticated
  USING (public.puede_ver_proyecto(proyecto_id));

DROP POLICY IF EXISTS ppart_insert ON public.proyecto_participantes;
CREATE POLICY ppart_insert ON public.proyecto_participantes
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = (SELECT auth.uid())  -- se une por código
    OR proyecto_id IN (SELECT id FROM public.proyectos WHERE usuario_id = (SELECT auth.uid()))  -- el líder agrega
  );

DROP POLICY IF EXISTS ppart_delete ON public.proyecto_participantes;
CREATE POLICY ppart_delete ON public.proyecto_participantes
  FOR DELETE TO authenticated
  USING (
    usuario_id = (SELECT auth.uid())
    OR proyecto_id IN (SELECT id FROM public.proyectos WHERE usuario_id = (SELECT auth.uid()))
  );

-- ─── comentarios_secciones ──────────────────────────────────
DROP POLICY IF EXISTS coment_select ON public.comentarios_secciones;
CREATE POLICY coment_select ON public.comentarios_secciones
  FOR SELECT TO authenticated
  USING (public.puede_ver_proyecto(proyecto_id));

DROP POLICY IF EXISTS coment_insert ON public.comentarios_secciones;
CREATE POLICY coment_insert ON public.comentarios_secciones
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = (SELECT auth.uid()) AND public.puede_ver_proyecto(proyecto_id));

-- marcar como leído
DROP POLICY IF EXISTS coment_update ON public.comentarios_secciones;
CREATE POLICY coment_update ON public.comentarios_secciones
  FOR UPDATE TO authenticated
  USING (public.puede_ver_proyecto(proyecto_id))
  WITH CHECK (public.puede_ver_proyecto(proyecto_id));

DROP POLICY IF EXISTS coment_delete ON public.comentarios_secciones;
CREATE POLICY coment_delete ON public.comentarios_secciones
  FOR DELETE TO authenticated
  USING (usuario_id = (SELECT auth.uid()));

-- ============================================================
-- 7. REALTIME (notificaciones de feedback)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'comentarios_secciones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comentarios_secciones;
  END IF;
END $$;
