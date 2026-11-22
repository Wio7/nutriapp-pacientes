# Encargo: app del paciente de NutriApp (repo Wio7/nutriapp-pacientes)

Eres el desarrollador. Construye desde cero, en esta carpeta, la app web instalable (PWA) que usan los PACIENTES del nutricionista Camilo Villafranca (Perú). Todo el texto de la app en español de Perú, tuteo, frases cortas.

## Lee primero
1. docs/diseno.md: el diseño completo y aprobado. Tu parte son las secciones "App del paciente (repo nuevo)", "IA (DeepSeek)", "Datos nuevos" y las "Decisiones de Aurex". NO toques el formulario, el panel ni el motor de cálculo: eso vive en otro repo.
2. El repo existente (solo lectura, NO lo modifiques): ../NUTRI APP/nutricion-app
   - README.md
   - package.json: usa las mismas versiones (next 16.4.3, react 19.3.0, @supabase/supabase-js ^2.49.1, tailwind 4, vitest 3, lucide-react).
   - supabase/migrations/*.sql: esquema real de las tablas nutri_* y el estilo de las funciones SECURITY DEFINER (mira nutri_create_lead).
   - src/lib/nutricion/types.ts y calculos.ts: tipos, y cómo se calculan los macros de un plato (calcularMacrosPlato). Cópialos, no los reinventes.
   - src/components/boton-instalar.tsx, src/lib/instalacion.ts, src/app/manifest.ts y el script del layout: copia este mismo botón de descarga e instalación.
   - src/lib/etiquetas.ts y src/lib/marca.ts: nombres de los tiempos de comida y marca.

## Reglas que no se negocian
- Mismo Supabase que WIOCRM (variables NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_WIOCRM_ACCOUNT_ID). Nunca uses la clave service_role.
- Los pacientes NO son usuarios de Supabase Auth. Entran con su celular (+519XXXXXXXX) y un código de 6 dígitos que les da Camilo. Haz todo el acceso con funciones SQL SECURITY DEFINER que reciben un token:
  - nutri_paciente_entrar(p_account_id, p_celular, p_codigo) devuelve un token aleatorio. En la base se guarda solo el hash sha256 del token. El código es único dentro de la cuenta. Máximo 5 intentos fallidos por celular cada 15 minutos.
  - Todas las lecturas y escrituras del paciente pasan por funciones nutri_paciente_* que validan el token (por ejemplo: hoy, registrar_comida, registrar_peso, rutina, marcar_rutina, progreso, mi_mes, salir). Haz REVOKE a PUBLIC y GRANT a anon como en nutri_create_lead.
- Fotos: bucket PRIVADO nutri-fotos. Las sube una ruta del servidor que valida el token y usa una URL firmada. Nunca dejes URLs públicas: son datos de salud (Ley 29733).
- La clave DEEPSEEK_API_KEY solo en rutas del servidor (src/app/api/...), nunca en el navegador.
- Vista de celular y vista de computadora diseñadas por separado, no una sola estirada.
- Colores y estilo iguales al repo existente (verde #047857).

## Qué construir
1. Migración supabase/migrations/20261122_app_paciente.sql. NO la ejecutes; la revisa Aurex.
   - Tablas: nutri_patient_access, nutri_cycles (estados borrador / activo / por_renovar / pagado, 30 días desde la publicación), nutri_food_logs (enlazada al ítem planeado por día de la semana y tiempo de comida; estado cumplí / a_medias / no; nota; ruta de la foto; revision_ia jsonb; estado_revision pendiente / hecha / fallida), nutri_exercise_templates (niveles: nivel_cero, principiante, con_experiencia, avanzado), nutri_exercise_logs, nutri_ai_usage (contador mensual de fotos por cuenta).
   - Columna status en nutri_meal_plans (borrador / publicado).
   - RLS: los admins de la cuenta (nutri_is_admin) leen todo. El paciente solo entra por las funciones.
   - Plantillas de rutina de ejemplo por nivel, marcadas "ejemplo, revisar".
2. App (Next.js App Router, TypeScript, Tailwind):
   - /entrar: celular + código. El token se guarda en una cookie httpOnly que pone una ruta del servidor.
   - Hoy: comidas del día con hora (por defecto 7:00, 10:00, 13:00, 16:00 y 19:30), plato, porción en medidas caseras y macros. Por cada comida se marca cumplí / a medias / no, con nota y foto opcionales. Muestra la meta de agua (35 ml × kg).
   - Rutina: la plantilla de su nivel, y la marca de hecha por día.
   - Progreso: línea de tiempo con gráfico de peso, barras de cumplimiento por semana, días de rutina y fotos. También registrar peso.
   - Mis metas: peso objetivo, calorías, agua y días que faltan del ciclo.
   - Mi mes: al cerrar el ciclo, el resumen ("esto lograste / esto te faltó"). OPCIÓN A: sigue viendo su dieta vieja, su progreso y su historial. La dieta nueva sale como "lista, bloqueada" con un botón a WhatsApp de Camilo (https://wa.me/51952686162 con texto prellenado con su nombre) para pagar.
   - Botón de descarga e instalación (copiado del repo existente) en /entrar y en el menú.
3. IA con DeepSeek (API compatible con OpenAI, base https://api.deepseek.com). Antes de escribir código, verifica en https://api-docs.deepseek.com el ID vigente del modelo que acepta imágenes. Por noticias se llama deepseek-v4-flash-vision-exp o ya está en deepseek-flash. Ponlo en la variable DEEPSEEK_MODELO_VISION.
   - POST /api/fotos: valida el token, sube la foto (comprimida a máx. 1024 px en el navegador antes de subir) y luego pide a DeepSeek un JSON {que_se_ve, coincide: si|parcial|no, kcal_aprox, comentario} comparando con el plato planeado. Lo guarda en revision_ia.
   - Topes: 6 fotos por paciente por día y IA_TOPE_FOTOS_MES por cuenta (por defecto 10000). Si se pasa un tope o DeepSeek falla, la comida y la foto se guardan igual con estado_revision = pendiente o fallida. Nunca se pierde el registro.
   - El paciente NO ve la revisión de la IA. Solo ve "foto recibida". La ve Camilo en su panel, que es otro repo.
   - Resumen del mes: el código calcula los números (% de comidas cumplidas, comidas saltadas, cambio de peso, días de rutina, % de fotos que coinciden). DeepSeek solo redacta 3 a 5 frases amables a partir de esos números, sin consejos médicos. Haz una sola llamada por ciclo y guarda el resultado en nutri_cycles.
4. Calidad
   - Pruebas con vitest de: canje de código y token (lógica del lado de TS), topes de IA, cálculo del resumen del mes y parseo de la respuesta de DeepSeek (con respuestas falsas, sin llamar a la API real).
   - npm run build y npm test deben pasar sin errores.
   - .env.example con todas las variables y comentarios. README.md en español con cómo correrla y cómo desplegarla en Vercel.
   - Un modo demo sin Supabase (NEXT_PUBLIC_DEMO_MODE=1) con datos de ejemplo, para ver las pantallas en local.
5. Git: git init, rama main, remote https://github.com/Wio7/nutriapp-pacientes.git. Haz commits pequeños con mensajes en español (feat: ..., fix: ...) y git push -u origin main al terminar. NO subas .env.local ni claves.

## Al terminar, escribe en ENTREGA.md
- Qué hiciste, archivo por archivo, en 1 línea cada uno.
- Qué dejaste a medias o qué supusiste.
- El ID de modelo de DeepSeek que verificaste y de dónde lo sacaste.
- Cómo probarla en 3 pasos.
