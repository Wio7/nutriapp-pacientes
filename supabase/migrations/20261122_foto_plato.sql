-- ====================================================================
-- FOTO DEL PLATO EN LA APP DEL PACIENTE (20261122_foto_plato.sql)
-- nutri_paciente_hoy devuelve tambien foto_url (nutri_dishes.image_url, bucket publico nutri-platos).
-- Idempotente. Ejecutar despues de 20261122_app_paciente.sql.
-- ====================================================================
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
        'foto_url', d.image_url,
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
