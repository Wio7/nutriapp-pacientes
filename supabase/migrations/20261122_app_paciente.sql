-- ====================================================================
-- APP DEL PACIENTE — NUTRIAPP
-- Migración: 20261122_app_paciente.sql
-- NO ejecutar directamente: Aurex revisa antes de aplicar.
-- ====================================================================

-- ----------------------------------------------------------------
-- 1. COLUMNAS NUEVAS EN TABLAS EXISTENTES
-- ----------------------------------------------------------------

-- nutri_leads y nutri_patients: 5 niveles de actividad, objetivo, nivel de ejercicio
ALTER TABLE public.nutri_leads
  ADD COLUMN IF NOT EXISTS activity_level_v2 TEXT CHECK (activity_level_v2 IN ('sedentario','ligero','moderado','alto','muy_alto')),
  ADD COLUMN IF NOT EXISTS goal TEXT CHECK (goal IN ('bajar','mantener','subir')),
  ADD COLUMN IF NOT EXISTS exercise_level TEXT CHECK (exercise_level IN ('nivel_cero','principiante','con_experiencia','avanzado')),
  ADD COLUMN IF NOT EXISTS has_gallstones BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_constipation BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_triglycerides BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.nutri_patients
  ADD COLUMN IF NOT EXISTS activity_level_v2 TEXT CHECK (activity_level_v2 IN ('sedentario','ligero','moderado','alto','muy_alto')),
  ADD COLUMN IF NOT EXISTS goal TEXT CHECK (goal IN ('bajar','mantener','subir')),
  ADD COLUMN IF NOT EXISTS goal_kcal_adjustment INTEGER NOT NULL DEFAULT -500,
  ADD COLUMN IF NOT EXISTS exercise_level TEXT CHECK (exercise_level IN ('nivel_cero','principiante','con_experiencia','avanzado')),
  ADD COLUMN IF NOT EXISTS meal_times JSONB NOT NULL DEFAULT '{"desayuno":"07:00","media_manana":"10:00","almuerzo":"13:00","media_tarde":"16:00","cena":"19:30"}'::jsonb;

-- nutri_meal_plans: columna status
ALTER TABLE public.nutri_meal_plans
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador','publicado'));

-- ----------------------------------------------------------------
-- 2. TABLA: nutri_patient_access
-- Acceso del paciente por celular + código (no usa Supabase Auth)
-- El código es único dentro de la cuenta (celular + código → 1 paciente).
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nutri_patient_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL,
    -- Hash SHA-256 del código de 6 dígitos que da Camilo
    code_hash TEXT NOT NULL,
    -- Celular en formato E.164 (+519XXXXXXXX)
    phone TEXT NOT NULL CHECK (phone ~ '^\+519[0-9]{8}$'),
    -- Intentos fallidos en la ventana de 15 minutos
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    last_failed_at TIMESTAMPTZ,
    -- Token de sesión: se guarda solo el hash SHA-256
    token_hash TEXT,
    token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (account_id, patient_id) REFERENCES public.nutri_patients(account_id, id) ON DELETE CASCADE,
    -- El código es único dentro de la cuenta: celular + código siempre dan un solo paciente,
    -- aunque dos pacientes compartan el celular (ej. menores con el celular de la mamá).
    UNIQUE (account_id, code_hash),
    -- Un paciente → un acceso por cuenta
    UNIQUE (account_id, patient_id)
);

CREATE INDEX IF NOT EXISTS nutri_patient_access_phone ON public.nutri_patient_access (account_id, phone);
CREATE INDEX IF NOT EXISTS nutri_patient_access_token ON public.nutri_patient_access (token_hash) WHERE token_hash IS NOT NULL;

-- Intentos fallidos de entrada, por celular (un celular puede ser de varios pacientes).
CREATE TABLE IF NOT EXISTS public.nutri_patient_login_failures (
    id BIGSERIAL PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS nutri_patient_login_failures_phone ON public.nutri_patient_login_failures (account_id, phone, failed_at DESC);

-- Fecha de hoy en Lima: la base está en UTC y desde las 19:00 de Lima ya sería "mañana".
CREATE OR REPLACE FUNCTION public.nutri_hoy_lima()
RETURNS DATE
LANGUAGE sql STABLE
AS $$ SELECT (NOW() AT TIME ZONE 'America/Lima')::DATE $$;

-- ----------------------------------------------------------------
-- 3. TABLA: nutri_cycles
-- Ciclo de 30 días por paciente desde que Camilo publica la dieta.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nutri_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL,
    meal_plan_id UUID NOT NULL,
    starts_at DATE NOT NULL,
    ends_at DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador','activo','por_renovar','pagado')),
    -- Resumen del mes: números calculados por código + texto de la IA
    summary_numbers JSONB,
    summary_text TEXT,
    summary_generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (account_id, patient_id) REFERENCES public.nutri_patients(account_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS nutri_cycles_paciente ON public.nutri_cycles (account_id, patient_id, starts_at DESC);

-- ----------------------------------------------------------------
-- 4. TABLA: nutri_food_logs
-- Registro diario de comidas del paciente.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nutri_food_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL,
    cycle_id UUID NOT NULL REFERENCES public.nutri_cycles(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT public.nutri_hoy_lima(),
    meal_time TEXT NOT NULL CHECK (meal_time IN ('desayuno','media_manana','almuerzo','media_tarde','cena')),
    -- Apunta al ítem del plan (día de semana + tiempo de comida)
    meal_plan_item_id UUID,
    status TEXT CHECK (status IN ('cumpli','a_medias','no')),
    nota TEXT CHECK (char_length(nota) <= 500),
    -- Ruta en el bucket privado nutri-fotos
    foto_path TEXT,
    -- Revisión de la IA: {que_se_ve, coincide: si|parcial|no, kcal_aprox, comentario}
    revision_ia JSONB,
    estado_revision TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado_revision IN ('pendiente','hecha','fallida')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (account_id, patient_id) REFERENCES public.nutri_patients(account_id, id) ON DELETE CASCADE,
    UNIQUE (patient_id, log_date, meal_time)
);

CREATE INDEX IF NOT EXISTS nutri_food_logs_paciente_fecha ON public.nutri_food_logs (patient_id, log_date DESC);
CREATE INDEX IF NOT EXISTS nutri_food_logs_revision ON public.nutri_food_logs (estado_revision) WHERE estado_revision = 'pendiente';

-- ----------------------------------------------------------------
-- 5. TABLA: nutri_exercise_templates
-- Plantillas de rutina por nivel. Una por cuenta por nivel.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nutri_exercise_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    level TEXT NOT NULL CHECK (level IN ('nivel_cero','principiante','con_experiencia','avanzado')),
    -- JSON con la lista de ejercicios: [{nombre, series, repeticiones, minutos, descripcion}]
    exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
    days_per_week INTEGER NOT NULL DEFAULT 3 CHECK (days_per_week BETWEEN 1 AND 7),
    notes TEXT,
    -- Marcado "ejemplo, revisar" para que Camilo lo ajuste antes de usar con pacientes reales
    is_example BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (account_id, level)
);

-- ----------------------------------------------------------------
-- 6. TABLA: nutri_exercise_logs
-- Registro de si el paciente hizo su rutina ese día.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nutri_exercise_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL,
    cycle_id UUID NOT NULL REFERENCES public.nutri_cycles(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT public.nutri_hoy_lima(),
    done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (account_id, patient_id) REFERENCES public.nutri_patients(account_id, id) ON DELETE CASCADE,
    UNIQUE (patient_id, log_date)
);

CREATE INDEX IF NOT EXISTS nutri_exercise_logs_paciente ON public.nutri_exercise_logs (patient_id, log_date DESC);

-- ----------------------------------------------------------------
-- 7. TABLA: nutri_ai_usage
-- Contador mensual de fotos revisadas por IA por cuenta.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nutri_ai_usage (
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    mes TEXT NOT NULL, -- formato YYYY-MM
    fotos_usadas INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (account_id, mes)
);

-- ----------------------------------------------------------------
-- 8. PERMISOS — mismo estilo que las tablas nutri_ existentes
-- ----------------------------------------------------------------
DO $$
DECLARE v_tabla TEXT;
BEGIN
  FOREACH v_tabla IN ARRAY ARRAY[
    'nutri_patient_access', 'nutri_cycles', 'nutri_food_logs',
    'nutri_exercise_templates', 'nutri_exercise_logs', 'nutri_ai_usage',
    'nutri_patient_login_failures'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_tabla);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon', v_tabla);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', v_tabla);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tabla || '_admin', v_tabla);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.nutri_is_admin(account_id)) WITH CHECK (public.nutri_is_admin(account_id))',
      v_tabla || '_admin', v_tabla
    );
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------
-- 9. BUCKET PRIVADO PARA FOTOS DEL PACIENTE
-- ----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('nutri-fotos', 'nutri-fotos', FALSE, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- 10. FUNCIONES SECURITY DEFINER PARA EL PACIENTE
-- El paciente NO es usuario de Supabase Auth.
-- Todas las operaciones pasan por estas funciones que validan el token.
-- ----------------------------------------------------------------

-- Helper interno: valida token y devuelve patient_id + account_id
CREATE OR REPLACE FUNCTION public.nutri_pac_validar_token(p_token TEXT)
RETURNS TABLE(patient_id UUID, account_id UUID)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT a.patient_id, a.account_id
  FROM public.nutri_patient_access a
  WHERE a.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    AND a.token_expires_at > NOW();
END;
$$;
-- Solo la usan las demás funciones; nadie la llama desde afuera.
REVOKE ALL ON FUNCTION public.nutri_pac_validar_token(TEXT) FROM PUBLIC, anon, authenticated;

-- ENTRAR: celular + código → token aleatorio (90 días)
-- Máximo 5 intentos fallidos por celular cada 15 minutos.
-- Devuelve JSONB {ok, token} o {ok:false, error}. NO lanza excepción al fallar:
-- una excepción desharía el registro del intento fallido y el límite no serviría.
DROP FUNCTION IF EXISTS public.nutri_paciente_entrar(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.nutri_paciente_entrar(
  p_account_id UUID,
  p_celular TEXT,
  p_codigo TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access_id UUID;
  v_fallos INTEGER;
  v_token TEXT;
BEGIN
  IF p_celular IS NULL OR p_celular !~ '^\+519[0-9]{8}$' OR p_codigo IS NULL OR p_codigo !~ '^[0-9]{6}$' THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'DATOS_INVALIDOS');
  END IF;

  -- Serializa los intentos del mismo celular
  PERFORM pg_advisory_xact_lock(hashtextextended(p_account_id::text || p_celular, 0));

  SELECT COUNT(*) INTO v_fallos
  FROM public.nutri_patient_login_failures
  WHERE account_id = p_account_id AND phone = p_celular
    AND failed_at > NOW() - INTERVAL '15 minutes';

  IF v_fallos >= 5 THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'LIMITE_INTENTOS');
  END IF;

  SELECT a.id INTO v_access_id
  FROM public.nutri_patient_access a
  WHERE a.account_id = p_account_id
    AND a.phone = p_celular
    AND a.code_hash = encode(sha256(convert_to(p_codigo, 'UTF8')), 'hex');

  IF v_access_id IS NULL THEN
    -- Mismo error si el celular no existe o el código está mal: no se revela qué celulares hay.
    INSERT INTO public.nutri_patient_login_failures (account_id, phone) VALUES (p_account_id, p_celular);
    DELETE FROM public.nutri_patient_login_failures WHERE failed_at < NOW() - INTERVAL '1 day';
    RETURN jsonb_build_object('ok', FALSE, 'error', 'CODIGO_INVALIDO');
  END IF;

  -- Token aleatorio: 2 UUID v4 (244 bits al azar) pasados por sha256. No depende de pgcrypto.
  v_token := encode(sha256(convert_to(gen_random_uuid()::text || gen_random_uuid()::text, 'UTF8')), 'hex');

  UPDATE public.nutri_patient_access
  SET token_hash = encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
      token_expires_at = NOW() + INTERVAL '90 days',
      updated_at = NOW()
  WHERE id = v_access_id;

  DELETE FROM public.nutri_patient_login_failures WHERE account_id = p_account_id AND phone = p_celular;

  RETURN jsonb_build_object('ok', TRUE, 'token', v_token);
END;
$$;
REVOKE ALL ON FUNCTION public.nutri_paciente_entrar(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nutri_paciente_entrar(UUID, TEXT, TEXT) TO anon;

-- SALIR: invalida el token
CREATE OR REPLACE FUNCTION public.nutri_paciente_salir(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.nutri_patient_access
  SET token_hash = NULL, token_expires_at = NULL, updated_at = NOW()
  WHERE token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
END;
$$;
REVOKE ALL ON FUNCTION public.nutri_paciente_salir(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nutri_paciente_salir(TEXT) TO anon;

-- HOY: comidas del día con el plato planeado y el log del paciente
CREATE OR REPLACE FUNCTION public.nutri_paciente_hoy(p_token TEXT, p_fecha DATE DEFAULT public.nutri_hoy_lima())
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID; v_account_id UUID;
  v_ciclo public.nutri_cycles%ROWTYPE;
  v_dia_semana INTEGER;
  v_result JSONB;
BEGIN
  SELECT patient_id, account_id INTO v_patient_id, v_account_id
  FROM public.nutri_pac_validar_token(p_token);
  IF v_patient_id IS NULL THEN RAISE EXCEPTION 'TOKEN_INVALIDO' USING ERRCODE = 'P0001'; END IF;

  SELECT * INTO v_ciclo FROM public.nutri_cycles
  WHERE patient_id = v_patient_id AND status IN ('activo','por_renovar')
  ORDER BY starts_at DESC LIMIT 1;

  -- Día de semana del plan semanal (1=Lunes ... 7=Domingo)
  v_dia_semana := EXTRACT(ISODOW FROM p_fecha)::INTEGER;

  SELECT jsonb_build_object(
    'fecha', p_fecha,
    'ciclo', CASE WHEN v_ciclo.id IS NOT NULL THEN row_to_json(v_ciclo) ELSE NULL END,
    'comidas', (
      SELECT jsonb_agg(jsonb_build_object(
        'item_id', i.id,
        'tiempo_comida', i.meal_time,
        'plato_id', i.dish_id,
        'plato_nombre', d.name,
        'medida_casera', i.custom_notes,
        'porcion', i.portion_multiplier,
        'hora', coalesce((p.meal_times->>(i.meal_time)), ''),
        'log', (
          SELECT jsonb_build_object('status', fl.status, 'foto_path', fl.foto_path, 'nota', fl.nota) FROM public.nutri_food_logs fl
          WHERE fl.patient_id = v_patient_id AND fl.log_date = p_fecha AND fl.meal_time = i.meal_time
          LIMIT 1
        )
      ) ORDER BY ARRAY_POSITION(ARRAY['desayuno','media_manana','almuerzo','media_tarde','cena'], i.meal_time))
      FROM public.nutri_meal_plan_items i
      JOIN public.nutri_dishes d ON d.account_id = i.account_id AND d.id = i.dish_id
      JOIN public.nutri_meal_plans mp ON mp.id = i.meal_plan_id
      JOIN public.nutri_patients p ON p.account_id = v_account_id AND p.id = v_patient_id
      WHERE i.meal_plan_id = v_ciclo.meal_plan_id
        AND (i.day_of_week IS NULL OR i.day_of_week = v_dia_semana)
        AND mp.status = 'publicado'
    ),
    'meta_agua_ml', (SELECT weight_kg * 35 FROM public.nutri_patients WHERE id = v_patient_id),
    'ejercicio_hecho', (SELECT done FROM public.nutri_exercise_logs WHERE patient_id = v_patient_id AND log_date = p_fecha LIMIT 1)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.nutri_paciente_hoy(TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nutri_paciente_hoy(TEXT, DATE) TO anon;

-- REGISTRAR_COMIDA: marca el estado de una comida
CREATE OR REPLACE FUNCTION public.nutri_paciente_registrar_comida(
  p_token TEXT,
  p_fecha DATE,
  p_tiempo_comida TEXT,
  p_item_plan_id UUID,
  p_estado TEXT,
  p_nota TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID; v_account_id UUID;
  v_ciclo_id UUID;
BEGIN
  SELECT patient_id, account_id INTO v_patient_id, v_account_id
  FROM public.nutri_pac_validar_token(p_token);
  IF v_patient_id IS NULL THEN RAISE EXCEPTION 'TOKEN_INVALIDO' USING ERRCODE = 'P0001'; END IF;
  IF p_estado NOT IN ('cumpli','a_medias','no') THEN RAISE EXCEPTION 'ESTADO_INVALIDO' USING ERRCODE = '22023'; END IF;
  -- Solo hoy o hasta 3 días atrás (para quien se olvidó de anotar); nunca días futuros.
  IF p_fecha IS NULL OR p_fecha > public.nutri_hoy_lima() OR p_fecha < public.nutri_hoy_lima() - 3 THEN
    RAISE EXCEPTION 'FECHA_INVALIDA' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_ciclo_id FROM public.nutri_cycles
  WHERE patient_id = v_patient_id AND status IN ('activo','por_renovar')
  ORDER BY starts_at DESC LIMIT 1;
  IF v_ciclo_id IS NULL THEN RAISE EXCEPTION 'SIN_CICLO' USING ERRCODE = 'P0001'; END IF;

  INSERT INTO public.nutri_food_logs (account_id, patient_id, cycle_id, log_date, meal_time, meal_plan_item_id, status, nota, estado_revision)
  VALUES (v_account_id, v_patient_id, v_ciclo_id, p_fecha, p_tiempo_comida, p_item_plan_id, p_estado, p_nota, 'pendiente')
  ON CONFLICT (patient_id, log_date, meal_time) DO UPDATE
  SET status = EXCLUDED.status, nota = EXCLUDED.nota, updated_at = NOW();
END;
$$;
REVOKE ALL ON FUNCTION public.nutri_paciente_registrar_comida(TEXT,DATE,TEXT,UUID,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nutri_paciente_registrar_comida(TEXT,DATE,TEXT,UUID,TEXT,TEXT) TO anon;

-- REGISTRAR_PESO: agrega un registro de peso
CREATE OR REPLACE FUNCTION public.nutri_paciente_registrar_peso(
  p_token TEXT,
  p_peso_kg NUMERIC,
  p_fecha DATE DEFAULT public.nutri_hoy_lima()
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID; v_account_id UUID;
BEGIN
  SELECT patient_id, account_id INTO v_patient_id, v_account_id
  FROM public.nutri_pac_validar_token(p_token);
  IF v_patient_id IS NULL THEN RAISE EXCEPTION 'TOKEN_INVALIDO' USING ERRCODE = 'P0001'; END IF;
  IF p_peso_kg IS NULL OR p_peso_kg < 25 OR p_peso_kg > 350 THEN RAISE EXCEPTION 'PESO_INVALIDO' USING ERRCODE = '22023'; END IF;
  IF p_fecha IS NULL OR p_fecha > public.nutri_hoy_lima() OR p_fecha < public.nutri_hoy_lima() - 3 THEN
    RAISE EXCEPTION 'FECHA_INVALIDA' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.nutri_measurements (account_id, patient_id, measured_at, weight_kg)
  VALUES (v_account_id, v_patient_id, p_fecha, p_peso_kg)
  ON CONFLICT DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.nutri_paciente_registrar_peso(TEXT,NUMERIC,DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nutri_paciente_registrar_peso(TEXT,NUMERIC,DATE) TO anon;

-- RUTINA: devuelve la plantilla de ejercicio del nivel del paciente
CREATE OR REPLACE FUNCTION public.nutri_paciente_rutina(p_token TEXT, p_fecha DATE DEFAULT public.nutri_hoy_lima())
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID; v_account_id UUID;
  v_level TEXT;
BEGIN
  SELECT patient_id, account_id INTO v_patient_id, v_account_id
  FROM public.nutri_pac_validar_token(p_token);
  IF v_patient_id IS NULL THEN RAISE EXCEPTION 'TOKEN_INVALIDO' USING ERRCODE = 'P0001'; END IF;

  SELECT coalesce(exercise_level, 'nivel_cero') INTO v_level
  FROM public.nutri_patients WHERE id = v_patient_id;

  RETURN (
    SELECT jsonb_build_object(
      'nivel', v_level,
      'template', row_to_json(et),
      'hecho_hoy', (SELECT done FROM public.nutri_exercise_logs WHERE patient_id = v_patient_id AND log_date = p_fecha LIMIT 1)
    )
    FROM public.nutri_exercise_templates et
    WHERE et.account_id = v_account_id AND et.level = v_level
    LIMIT 1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.nutri_paciente_rutina(TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nutri_paciente_rutina(TEXT, DATE) TO anon;

-- MARCAR_RUTINA: marca si el paciente hizo su rutina ese día
CREATE OR REPLACE FUNCTION public.nutri_paciente_marcar_rutina(
  p_token TEXT,
  p_fecha DATE,
  p_hecho BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID; v_account_id UUID;
  v_ciclo_id UUID;
BEGIN
  SELECT patient_id, account_id INTO v_patient_id, v_account_id
  FROM public.nutri_pac_validar_token(p_token);
  IF v_patient_id IS NULL THEN RAISE EXCEPTION 'TOKEN_INVALIDO' USING ERRCODE = 'P0001'; END IF;

  IF p_fecha IS NULL OR p_fecha > public.nutri_hoy_lima() OR p_fecha < public.nutri_hoy_lima() - 3 THEN
    RAISE EXCEPTION 'FECHA_INVALIDA' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_ciclo_id FROM public.nutri_cycles
  WHERE patient_id = v_patient_id AND status IN ('activo','por_renovar')
  ORDER BY starts_at DESC LIMIT 1;
  IF v_ciclo_id IS NULL THEN RAISE EXCEPTION 'SIN_CICLO' USING ERRCODE = 'P0001'; END IF;

  INSERT INTO public.nutri_exercise_logs (account_id, patient_id, cycle_id, log_date, done)
  VALUES (v_account_id, v_patient_id, v_ciclo_id, p_fecha, p_hecho)
  ON CONFLICT (patient_id, log_date) DO UPDATE SET done = EXCLUDED.done;
END;
$$;
REVOKE ALL ON FUNCTION public.nutri_paciente_marcar_rutina(TEXT,DATE,BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nutri_paciente_marcar_rutina(TEXT,DATE,BOOLEAN) TO anon;

-- PROGRESO: peso, cumplimiento semanal, días de rutina, fotos
CREATE OR REPLACE FUNCTION public.nutri_paciente_progreso(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID; v_account_id UUID;
  v_ciclo public.nutri_cycles%ROWTYPE;
BEGIN
  SELECT patient_id, account_id INTO v_patient_id, v_account_id
  FROM public.nutri_pac_validar_token(p_token);
  IF v_patient_id IS NULL THEN RAISE EXCEPTION 'TOKEN_INVALIDO' USING ERRCODE = 'P0001'; END IF;

  SELECT * INTO v_ciclo FROM public.nutri_cycles
  WHERE patient_id = v_patient_id AND status IN ('activo','por_renovar')
  ORDER BY starts_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'pesos', (
      SELECT jsonb_agg(jsonb_build_object('fecha', measured_at, 'peso_kg', weight_kg) ORDER BY measured_at)
      FROM public.nutri_measurements WHERE patient_id = v_patient_id
    ),
    'cumplimiento_semanal', (
      SELECT jsonb_agg(jsonb_build_object(
        'semana_inicio', gs::DATE,
        'total', cnt.total,
        'cumplidas', cnt.cumplidas,
        'pct', CASE WHEN cnt.total > 0 THEN round(cnt.cumplidas * 100.0 / cnt.total) ELSE 0 END
      ) ORDER BY gs)
      FROM generate_series(v_ciclo.starts_at::TIMESTAMP, LEAST(v_ciclo.ends_at, public.nutri_hoy_lima())::TIMESTAMP, '7 days') gs
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE status = 'cumpli') AS cumplidas
        FROM public.nutri_food_logs
        WHERE patient_id = v_patient_id AND log_date >= gs::DATE AND log_date < (gs + INTERVAL '7 days')::DATE
      ) cnt ON TRUE
    ),
    'dias_rutina', (SELECT COUNT(*) FROM public.nutri_exercise_logs WHERE patient_id = v_patient_id AND done = TRUE AND cycle_id = v_ciclo.id),
    'fotos_subidas', (SELECT COUNT(*) FROM public.nutri_food_logs WHERE patient_id = v_patient_id AND foto_path IS NOT NULL AND cycle_id = v_ciclo.id)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.nutri_paciente_progreso(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nutri_paciente_progreso(TEXT) TO anon;

-- MI_MES: resumen del ciclo cerrado
CREATE OR REPLACE FUNCTION public.nutri_paciente_mi_mes(p_token TEXT, p_ciclo_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID; v_account_id UUID;
  v_ciclo public.nutri_cycles%ROWTYPE;
BEGIN
  SELECT patient_id, account_id INTO v_patient_id, v_account_id
  FROM public.nutri_pac_validar_token(p_token);
  IF v_patient_id IS NULL THEN RAISE EXCEPTION 'TOKEN_INVALIDO' USING ERRCODE = 'P0001'; END IF;

  IF p_ciclo_id IS NOT NULL THEN
    SELECT * INTO v_ciclo FROM public.nutri_cycles WHERE id = p_ciclo_id AND patient_id = v_patient_id;
  ELSE
    -- El último ciclo que el paciente ya tuvo (nunca el borrador de la dieta nueva)
    SELECT * INTO v_ciclo FROM public.nutri_cycles
    WHERE patient_id = v_patient_id AND status <> 'borrador'
    ORDER BY starts_at DESC LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'ciclo', row_to_json(v_ciclo),
    'ciclo_terminado', COALESCE(v_ciclo.ends_at < public.nutri_hoy_lima(), FALSE),
    'resumen_texto', v_ciclo.summary_text,
    'ciclo_nuevo_bloqueado', EXISTS(
      SELECT 1 FROM public.nutri_cycles
      WHERE patient_id = v_patient_id AND status = 'borrador'
    ),
    'whatsapp_camilo', '51952686162'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.nutri_paciente_mi_mes(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nutri_paciente_mi_mes(TEXT, UUID) TO anon;

-- MIS_METAS: peso objetivo, calorías, agua, días que faltan
CREATE OR REPLACE FUNCTION public.nutri_paciente_mis_metas(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID; v_account_id UUID;
  v_ciclo public.nutri_cycles%ROWTYPE;
  v_pac public.nutri_patients%ROWTYPE;
BEGIN
  SELECT patient_id, account_id INTO v_patient_id, v_account_id
  FROM public.nutri_pac_validar_token(p_token);
  IF v_patient_id IS NULL THEN RAISE EXCEPTION 'TOKEN_INVALIDO' USING ERRCODE = 'P0001'; END IF;

  SELECT * INTO v_pac FROM public.nutri_patients WHERE id = v_patient_id;
  SELECT * INTO v_ciclo FROM public.nutri_cycles
  WHERE patient_id = v_patient_id AND status IN ('activo','por_renovar')
  ORDER BY starts_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'nombre', v_pac.full_name,
    'peso_actual_kg', v_pac.weight_kg,
    'peso_objetivo_kg', NULL,
    'calorias_objetivo', (SELECT mp.target_calories FROM public.nutri_meal_plans mp WHERE mp.id = v_ciclo.meal_plan_id LIMIT 1),
    'meta_agua_ml', v_pac.weight_kg * 35,
    'dias_que_faltan', GREATEST(0, v_ciclo.ends_at - public.nutri_hoy_lima()),
    'dias_totales_ciclo', v_ciclo.ends_at - v_ciclo.starts_at,
    'nivel_ejercicio', v_pac.exercise_level
  );
END;
$$;
REVOKE ALL ON FUNCTION public.nutri_paciente_mis_metas(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nutri_paciente_mis_metas(TEXT) TO anon;

-- ----------------------------------------------------------------
-- 10b. FOTOS Y RESUMEN DEL MES (los llama el servidor de la app con el token del paciente)
-- ----------------------------------------------------------------

-- Fotos subidas por paciente y día (cada foto cuenta, aunque reemplace a otra de la misma comida)
CREATE TABLE IF NOT EXISTS public.nutri_patient_photo_days (
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL,
    fecha DATE NOT NULL,
    fotos INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (patient_id, fecha),
    FOREIGN KEY (account_id, patient_id) REFERENCES public.nutri_patients(account_id, id) ON DELETE CASCADE
);
ALTER TABLE public.nutri_patient_photo_days ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nutri_patient_photo_days FROM PUBLIC, anon;
GRANT SELECT ON public.nutri_patient_photo_days TO authenticated;
DROP POLICY IF EXISTS nutri_patient_photo_days_admin ON public.nutri_patient_photo_days;
CREATE POLICY nutri_patient_photo_days_admin ON public.nutri_patient_photo_days
  FOR SELECT TO authenticated USING (public.nutri_is_admin(account_id));

-- FOTO_RESERVAR: antes de subir. Aplica el tope diario (6) y reserva un cupo del tope mensual de IA.
-- Devuelve la ruta donde el servidor debe guardar la foto y el plato planeado para compararla.
CREATE OR REPLACE FUNCTION public.nutri_paciente_foto_reservar(
  p_token TEXT,
  p_tiempo_comida TEXT,
  p_tope_mes INTEGER DEFAULT 10000
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID; v_account_id UUID;
  v_hoy DATE := public.nutri_hoy_lima();
  v_ciclo public.nutri_cycles%ROWTYPE;
  v_fotos_hoy INTEGER;
  v_usadas_mes INTEGER;
  v_item_id UUID; v_plato TEXT;
BEGIN
  SELECT patient_id, account_id INTO v_patient_id, v_account_id
  FROM public.nutri_pac_validar_token(p_token);
  IF v_patient_id IS NULL THEN RETURN jsonb_build_object('ok', FALSE, 'error', 'TOKEN_INVALIDO'); END IF;
  IF p_tiempo_comida NOT IN ('desayuno','media_manana','almuerzo','media_tarde','cena') THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'TIEMPO_INVALIDO');
  END IF;

  SELECT * INTO v_ciclo FROM public.nutri_cycles
  WHERE patient_id = v_patient_id AND status IN ('activo','por_renovar')
  ORDER BY starts_at DESC LIMIT 1;
  IF v_ciclo.id IS NULL THEN RETURN jsonb_build_object('ok', FALSE, 'error', 'SIN_CICLO'); END IF;

  INSERT INTO public.nutri_patient_photo_days (account_id, patient_id, fecha, fotos)
  VALUES (v_account_id, v_patient_id, v_hoy, 1)
  ON CONFLICT (patient_id, fecha) DO UPDATE SET fotos = public.nutri_patient_photo_days.fotos + 1
  RETURNING fotos INTO v_fotos_hoy;

  IF v_fotos_hoy > 6 THEN
    -- Se deshace el conteo de esta foto rechazada
    UPDATE public.nutri_patient_photo_days SET fotos = 6 WHERE patient_id = v_patient_id AND fecha = v_hoy;
    RETURN jsonb_build_object('ok', FALSE, 'error', 'TOPE_DIA');
  END IF;

  INSERT INTO public.nutri_ai_usage (account_id, mes, fotos_usadas)
  VALUES (v_account_id, to_char(v_hoy, 'YYYY-MM'), 1)
  ON CONFLICT (account_id, mes) DO UPDATE
    SET fotos_usadas = public.nutri_ai_usage.fotos_usadas + 1, updated_at = NOW()
  RETURNING fotos_usadas INTO v_usadas_mes;

  SELECT i.id, d.name INTO v_item_id, v_plato
  FROM public.nutri_meal_plan_items i
  JOIN public.nutri_dishes d ON d.account_id = i.account_id AND d.id = i.dish_id
  WHERE i.meal_plan_id = v_ciclo.meal_plan_id
    AND i.meal_time = p_tiempo_comida
    AND (i.day_of_week IS NULL OR i.day_of_week = EXTRACT(ISODOW FROM v_hoy)::INTEGER)
  LIMIT 1;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'ia_permitida', v_usadas_mes <= p_tope_mes,
    'fecha', v_hoy,
    'item_id', v_item_id,
    'plato_nombre', v_plato,
    'ruta', v_account_id::text || '/' || v_patient_id::text || '/' || v_hoy::text || '/'
            || p_tiempo_comida || '_' || replace(gen_random_uuid()::text, '-', '') || '.jpg'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.nutri_paciente_foto_reservar(TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nutri_paciente_foto_reservar(TEXT, TEXT, INTEGER) TO anon;

-- FOTO_GUARDAR: después de subir. Guarda la ruta y la revisión de la IA en el registro de esa comida.
CREATE OR REPLACE FUNCTION public.nutri_paciente_foto_guardar(
  p_token TEXT,
  p_ruta TEXT,
  p_tiempo_comida TEXT,
  p_revision JSONB,
  p_estado_revision TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID; v_account_id UUID;
  v_hoy DATE := public.nutri_hoy_lima();
  v_ciclo public.nutri_cycles%ROWTYPE;
  v_item_id UUID;
BEGIN
  SELECT patient_id, account_id INTO v_patient_id, v_account_id
  FROM public.nutri_pac_validar_token(p_token);
  IF v_patient_id IS NULL THEN RAISE EXCEPTION 'TOKEN_INVALIDO' USING ERRCODE = 'P0001'; END IF;
  IF p_estado_revision NOT IN ('pendiente','hecha','fallida') THEN RAISE EXCEPTION 'ESTADO_INVALIDO' USING ERRCODE = '22023'; END IF;
  -- La ruta tiene que ser de este paciente y de hoy (la generó foto_reservar)
  IF p_ruta IS NULL OR p_ruta NOT LIKE v_account_id::text || '/' || v_patient_id::text || '/' || v_hoy::text || '/%' THEN
    RAISE EXCEPTION 'RUTA_INVALIDA' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_ciclo FROM public.nutri_cycles
  WHERE patient_id = v_patient_id AND status IN ('activo','por_renovar')
  ORDER BY starts_at DESC LIMIT 1;
  IF v_ciclo.id IS NULL THEN RAISE EXCEPTION 'SIN_CICLO' USING ERRCODE = 'P0001'; END IF;

  SELECT i.id INTO v_item_id FROM public.nutri_meal_plan_items i
  WHERE i.meal_plan_id = v_ciclo.meal_plan_id AND i.meal_time = p_tiempo_comida
    AND (i.day_of_week IS NULL OR i.day_of_week = EXTRACT(ISODOW FROM v_hoy)::INTEGER)
  LIMIT 1;

  INSERT INTO public.nutri_food_logs (account_id, patient_id, cycle_id, log_date, meal_time, meal_plan_item_id, foto_path, revision_ia, estado_revision)
  VALUES (v_account_id, v_patient_id, v_ciclo.id, v_hoy, p_tiempo_comida, v_item_id, p_ruta, p_revision, p_estado_revision)
  ON CONFLICT (patient_id, log_date, meal_time) DO UPDATE
  SET foto_path = EXCLUDED.foto_path, revision_ia = EXCLUDED.revision_ia,
      estado_revision = EXCLUDED.estado_revision, updated_at = NOW();
END;
$$;
REVOKE ALL ON FUNCTION public.nutri_paciente_foto_guardar(TEXT, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nutri_paciente_foto_guardar(TEXT, TEXT, TEXT, JSONB, TEXT) TO anon;

-- RESUMEN_DATOS: números del último ciclo terminado para armar el resumen del mes.
-- Si el resumen ya existe, lo devuelve tal cual (una sola llamada a la IA por ciclo).
CREATE OR REPLACE FUNCTION public.nutri_paciente_resumen_datos(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID; v_account_id UUID;
  v_ciclo public.nutri_cycles%ROWTYPE;
BEGIN
  SELECT patient_id, account_id INTO v_patient_id, v_account_id
  FROM public.nutri_pac_validar_token(p_token);
  IF v_patient_id IS NULL THEN RETURN jsonb_build_object('ok', FALSE, 'error', 'TOKEN_INVALIDO'); END IF;

  SELECT * INTO v_ciclo FROM public.nutri_cycles
  WHERE patient_id = v_patient_id AND status <> 'borrador' AND ends_at < public.nutri_hoy_lima()
  ORDER BY starts_at DESC LIMIT 1;
  IF v_ciclo.id IS NULL THEN RETURN jsonb_build_object('ok', FALSE, 'error', 'SIN_CICLO_TERMINADO'); END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'ciclo_id', v_ciclo.id,
    'resumen_texto', v_ciclo.summary_text,
    'resumen_numeros', v_ciclo.summary_numbers,
    'nombre', (SELECT full_name FROM public.nutri_patients WHERE id = v_patient_id),
    'dias_ciclo', v_ciclo.ends_at - v_ciclo.starts_at,
    'comidas_por_dia', GREATEST(1, (SELECT COUNT(DISTINCT meal_time) FROM public.nutri_meal_plan_items WHERE meal_plan_id = v_ciclo.meal_plan_id)),
    'dias_rutina_semana', COALESCE((SELECT et.days_per_week FROM public.nutri_exercise_templates et
                                    JOIN public.nutri_patients p ON p.id = v_patient_id
                                    WHERE et.account_id = v_account_id AND et.level = COALESCE(p.exercise_level, 'nivel_cero')), 3),
    'registros', COALESCE((SELECT jsonb_agg(jsonb_build_object('status', status, 'coincide', revision_ia->>'coincide'))
                           FROM public.nutri_food_logs WHERE cycle_id = v_ciclo.id), '[]'::jsonb),
    'pesos', COALESCE((SELECT jsonb_agg(jsonb_build_object('fecha', measured_at, 'peso_kg', weight_kg) ORDER BY measured_at)
                       FROM public.nutri_measurements
                       WHERE patient_id = v_patient_id AND measured_at BETWEEN v_ciclo.starts_at AND v_ciclo.ends_at), '[]'::jsonb),
    'dias_rutina_hechos', (SELECT COUNT(*) FROM public.nutri_exercise_logs WHERE cycle_id = v_ciclo.id AND done)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.nutri_paciente_resumen_datos(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nutri_paciente_resumen_datos(TEXT) TO anon;

-- RESUMEN_GUARDAR: guarda el resumen una sola vez (si ya hay texto, no lo pisa).
CREATE OR REPLACE FUNCTION public.nutri_paciente_resumen_guardar(
  p_token TEXT, p_ciclo_id UUID, p_numeros JSONB, p_texto TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID; v_account_id UUID;
BEGIN
  SELECT patient_id, account_id INTO v_patient_id, v_account_id
  FROM public.nutri_pac_validar_token(p_token);
  IF v_patient_id IS NULL THEN RAISE EXCEPTION 'TOKEN_INVALIDO' USING ERRCODE = 'P0001'; END IF;
  IF p_texto IS NULL OR char_length(p_texto) > 1500 THEN RAISE EXCEPTION 'TEXTO_INVALIDO' USING ERRCODE = '22023'; END IF;

  UPDATE public.nutri_cycles
  SET summary_numbers = p_numeros, summary_text = p_texto, summary_generated_at = NOW()
  WHERE id = p_ciclo_id AND patient_id = v_patient_id
    AND status <> 'borrador' AND ends_at < public.nutri_hoy_lima()
    AND summary_text IS NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.nutri_paciente_resumen_guardar(TEXT, UUID, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nutri_paciente_resumen_guardar(TEXT, UUID, JSONB, TEXT) TO anon;

-- ----------------------------------------------------------------
-- 11. DATOS DE EJEMPLO: plantillas de rutina por nivel
-- ----------------------------------------------------------------
INSERT INTO public.nutri_exercise_templates (account_id, level, exercises, days_per_week, notes, is_example) VALUES
('88cf5ef8-5803-461b-b0c3-ed8905977337', 'nivel_cero',
 '[
   {"nombre":"Caminata suave","series":null,"repeticiones":null,"minutos":20,"descripcion":"Caminar a paso tranquilo"},
   {"nombre":"Estiramiento de cuello","series":2,"repeticiones":10,"minutos":null,"descripcion":"Inclinar cabeza a cada lado"},
   {"nombre":"Marcha en el lugar","series":null,"repeticiones":null,"minutos":5,"descripcion":"Levantar rodillas alternando"}
 ]'::jsonb, 3, 'EJEMPLO — revisar antes de usar con pacientes reales', TRUE),
('88cf5ef8-5803-461b-b0c3-ed8905977337', 'principiante',
 '[
   {"nombre":"Caminata moderada","series":null,"repeticiones":null,"minutos":30,"descripcion":"Caminata a paso moderado"},
   {"nombre":"Sentadillas","series":3,"repeticiones":15,"minutos":null,"descripcion":"Sin peso"},
   {"nombre":"Flexiones de rodilla","series":3,"repeticiones":10,"minutos":null,"descripcion":"En el suelo"},
   {"nombre":"Plancha abdominal","series":3,"repeticiones":null,"minutos":0.5,"descripcion":"30 segundos cada vez"}
 ]'::jsonb, 4, 'EJEMPLO — revisar antes de usar con pacientes reales', TRUE),
('88cf5ef8-5803-461b-b0c3-ed8905977337', 'con_experiencia',
 '[
   {"nombre":"Trote","series":null,"repeticiones":null,"minutos":30,"descripcion":"Trote continuo a ritmo moderado"},
   {"nombre":"Sentadillas con peso","series":4,"repeticiones":12,"minutos":null,"descripcion":"Con mancuernas"},
   {"nombre":"Peso muerto rumano","series":3,"repeticiones":12,"minutos":null,"descripcion":"Con barra o mancuernas"},
   {"nombre":"Remo con mancuerna","series":3,"repeticiones":12,"minutos":null,"descripcion":"Un brazo a la vez"},
   {"nombre":"Plancha con rotación","series":3,"repeticiones":10,"minutos":null,"descripcion":"Alternar lados"}
 ]'::jsonb, 5, 'EJEMPLO — revisar antes de usar con pacientes reales', TRUE),
('88cf5ef8-5803-461b-b0c3-ed8905977337', 'avanzado',
 '[
   {"nombre":"Carrera","series":null,"repeticiones":null,"minutos":40,"descripcion":"Ritmo elevado, intervalos"},
   {"nombre":"Sentadilla profunda","series":5,"repeticiones":10,"minutos":null,"descripcion":"Con barra"},
   {"nombre":"Peso muerto convencional","series":4,"repeticiones":8,"minutos":null,"descripcion":"Con barra"},
   {"nombre":"Flexiones","series":4,"repeticiones":20,"minutos":null,"descripcion":"Estrictas"},
   {"nombre":"Dominadas","series":3,"repeticiones":8,"minutos":null,"descripcion":"Con agarre supino"},
   {"nombre":"Plancha lateral","series":3,"repeticiones":null,"minutos":1,"descripcion":"1 minuto por lado"}
 ]'::jsonb, 5, 'EJEMPLO — revisar antes de usar con pacientes reales', TRUE)
ON CONFLICT (account_id, level) DO NOTHING;
