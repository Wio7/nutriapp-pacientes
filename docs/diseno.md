# App del paciente de NutriApp (Camilo Villafranca) — diseño

Fecha: 2026-11-22. Autor: Aurex con Bryce Bueno. Estado: borrador para aprobación.

## Para qué y por qué

Camilo Villafranca es nutricionista en Perú. Hoy tiene dos piezas en este repo (`Wio7/nutricion-app`), sobre el Supabase de WIOCRM (cuenta `88cf5ef8-5803-461b-b0c3-ed8905977337`):

- `/` formulario público de captación (link de bio de TikTok/Instagram) → `nutricion-camilo.vercel.app`
- `/panel` panel privado (Interesados, Pacientes, Agenda, Platos, Ajustes, armado de dietas con PDF) → `panel-nutricion-camilo.vercel.app`

Se agrega una **app para los pacientes que ya pagaron**, para que sigan su dieta y su rutina, registren lo que comen y **vuelvan a pagar cada mes** por una dieta nueva. El negocio es la renovación mensual: la app existe para que el paciente vea su progreso y tenga una razón concreta para renovar.

Además, el motor de cálculo pasa a las reglas que mandó Camilo (documento "Fórmulas Harris-Benedict", 6 páginas, y dos audios).

## Flujo completo (decidido por Bryce)

1. La persona llena el formulario (se agregan los campos que falten, ver "Formulario").
2. Al enviar, el formulario le dice que su dieta se va a preparar y que escriba al WhatsApp de Camilo **+51 952 686 162** para coordinar la entrega (botón `wa.me` con texto prellenado con su nombre).
   - **No se genera ninguna dieta antes del pago.** Cero cálculo, cero IA hasta que pague.
3. Camilo le pide que yapee el monto; el paciente manda la captura por WhatsApp (fuera del sistema).
4. En el panel, en la ficha del interesado, Camilo toca **"Pago recibido: habilitar y crear dieta"**. Eso, en un solo paso:
   - convierte el interesado en paciente (reutiliza la conversión actual),
   - genera la dieta con el motor de reglas (sin IA, segundos),
   - crea el acceso del paciente a la app (código de 6 dígitos),
   - deja la dieta en estado **borrador** para que Camilo la revise y la publique con un botón **"Publicar al paciente"**,
   - al publicar, abre WhatsApp con un mensaje prellenado: enlace de descarga de la app + su código.
5. El paciente instala la app (botón de descarga, igual que las demás apps de Wio) y entra con su celular + código.
6. Cada día ve sus comidas con horario y qué comer, y su rutina de ejercicio de su nivel. Marca cada comida (cumplí / a medias / no) y puede subir foto. Registra su peso cuando quiera (se le sugiere 1 vez por semana).
7. La IA revisa cada foto (ver "IA").
8. La app muestra una **línea de tiempo de progreso**: peso, % de cumplimiento por semana, días de rutina, fotos.
9. Al cumplir el ciclo (30 días desde que se publicó la dieta), la app muestra el **resumen del mes**: qué cumplió, qué le faltó, qué mejoró. El sistema prepara la **dieta nueva en borrador** con su peso actualizado y lo que se aprendió del mes, pero queda **bloqueada**. El paciente ve un botón para escribirle a Camilo y pagar.
10. Camilo recibe el pago, revisa la dieta nueva en el panel y la publica. Vuelve al paso 6.

## Metas, no-metas y anti-metas

Metas
- Paciente: ver su dieta, horarios, rutina, metas y progreso; registrar comidas y fotos a diario.
- Camilo: habilitar con un botón tras el pago, ver lo que registra cada paciente, recibir el resumen del mes y la dieta nueva lista para revisar.
- Motor de cálculo con las reglas de Camilo, incluidas las combinaciones de enfermedades.

No-metas
- Cobro en línea (sigue siendo Yape + captura por WhatsApp).
- Que la IA arme la dieta (la arma el motor de reglas existente; la IA no).
- Chatbot de IA para pacientes (se gastaría sin que paguen extra; decisión de Bryce).
- Publicar en Play Store / App Store.

Anti-metas (sería un fracaso aunque funcione)
- Que una dieta llegue al paciente sin que Camilo la haya revisado y publicado.
- Que se gaste IA o cálculo en personas que no pagaron.
- Que el costo de IA crezca sin tope.
- Que la app muestre recomendaciones médicas de la IA sin revisión de Camilo.

## Restricciones

- Mismo Supabase de WIOCRM; todo en tablas `nutri_*` con `account_id` y RLS como hoy.
- Producción directa: se publica en `main` (Vercel despliega), sin previews (regla de Bryce).
- Vista de celular y vista de computadora separadas (regla de Bryce para todas sus apps).
- Ley 29733: las fotos y datos de salud son datos sensibles; bucket privado, URLs firmadas, nunca públicas.
- La clave de IA solo en el servidor (funciones de Vercel), nunca en el navegador.

## Caminos considerados

- **A. App del paciente en este mismo repo, con otro dominio.** Simple, pero mezcla tres públicos en un despliegue.
- **B. App del paciente en un repo nuevo, misma base de datos (elegido por Bryce).** Repo propio con botón de descarga como las demás apps de Wio; el panel y el formulario se quedan en `nutricion-app`. Comparten Supabase, así que Camilo ve en vivo lo que anota el paciente. Costo: copiar lo común (cálculos, tipos, botón de instalar) — ver "Código compartido".
- **C. Sin app: el paciente reporta por WhatsApp.** Descartado: Bryce quiere app con progreso visible.

Sobre la IA, Bryce eligió: **IA que revisa las fotos de comida** + **chatbot de IA solo para Camilo**, con **DeepSeek** por precio.

## Motor de cálculo (reemplaza al actual)

Reglas de Camilo (documento). Todo valor queda editable en Ajustes del panel.

- **GEB, Harris-Benedict revisada (1984):**
  - Hombres: 88.362 + 13.397·P + 4.799·T − 5.677·E
  - Mujeres: 447.593 + 9.247·P + 3.098·T − 4.330·E
  - Prueba obligatoria: hombre 21 a, 83 kg, 179 cm → GEB ≈ 1930; con FA 1.55 → GET ≈ 2991.5.
- **Factores de actividad (5):** sedentario 1.2 · ligero 1.375 · moderado 1.55 · alto 1.725 · muy alto 1.9. Los pacientes y leads existentes con `ligera`/`moderada` se mapean a ligero/moderado.
- **Objetivo:** bajar = GET − X (X entre 250 y 500), subir = GET + Y (Y entre 300 y 500), mantener = GET. Por defecto X = 500 y Y = 400 (decisión de Aurex, editable en Ajustes y por paciente). Sustituye al % actual (−15 % / +10 %).
- **Por condición:**

| Condición | CHO/Prot/Grasa | Reparto D/MM/A/MT/C | Reglas |
|---|---|---|---|
| Normal | 55/15/30 | 20/10/40/10/20 | — |
| Diabetes | 45/20/35 | 20/12.5/35/12.5/20 | Máx. 60–70 g CHO por comida (por defecto 65) |
| Piedras en vesícula (nueva) | 60/15/25 | 20/12.5/35/12.5/20 | **Tope duro: máx. 5 g de grasa por comida** (Camilo, 2026-11-22 10:03: "que lo haga con 5, así evitamos que muera alguien"). El tope manda sobre el 25 %: si la grasa del día queda por debajo, se acepta y el borrador lo avisa. Etiqueta "bajo en grasa" recomendada |
| Gastritis | 55/15/30 | 20/12.5/35/12.5/20 | Solo blandos/cocidos, sin cáscara; sin col, coliflor, brócoli; carnes magras; máx. 1 yema por comida |
| Hígado graso | 50/20/30 | 20/12.5/35/12.5/20 (el documento no lo dice; decisión de Aurex) | Sin azúcar añadido (estevia); máx. 60 g CHO por comida; grasas: aceituna, frutos secos, aceite vegetal |
| Estreñimiento (nueva) | como normal (o diabetes si la tiene) | como normal (o diabetes) | 3 porciones de ½ taza de verdura + 2 de fruta (manzana, piña, granadilla) al día |
| Colesterol | normal | normal | Sin carne roja; máx. 1 yema al día; solo lácteos descremados |
| Triglicéridos (se separa de colesterol) | normal | normal | Objetivo bajar de peso por defecto; sin azúcar añadido; fruta con cáscara; 3 porc. verdura cruda/día; menestras 4×/semana; carnes magras |
| Hipertensión | normal | normal | Controlar sal (etiqueta "bajo en sodio") |
| Renal, embarazo, menores | se mantiene el comportamiento actual: sin déficit automático, aviso a Camilo |

- **Agua:** 35 ml × kg para todos (el documento lo pide en estreñimiento; se muestra a todos como meta diaria — decisión de Aurex).
- **Combinación de condiciones:**
  - Macros y reparto: los de la condición de mayor prioridad. Prioridad: diabetes > vesícula > hígado graso > gastritis > triglicéridos > colesterol > estreñimiento > hipertensión > normal.
  - Topes por comida (CHO, grasa): se aplica el más bajo de todos.
  - Etiquetas: se suman todas; si una regla prohíbe algo que otra pide, gana la prohibición (ya funciona así).
  - **Gastritis anula la fibra:** con gastritis, se quitan las exigencias de fibra cruda de diabetes, estreñimiento y triglicéridos (verdura cruda, fruta con cáscara); la diabetes se controla solo con el tope de CHO por comida (caso que dio Camilo). Con estreñimiento + gastritis, la fibra va en verdura y fruta cocidas sin cáscara.
- La sugerencia automática usa el reparto por condición (hoy usa 25/10/35/10/20 fijo) y respeta los topes por comida.

## Formulario (repo actual)

Se agregan:
- Nivel de actividad con 5 opciones (texto simple: "casi no me muevo", "1–3 días de ejercicio", etc.).
- Objetivo: bajar, mantener o subir de peso (si no existe ya como campo propio).
- Condiciones: se suman piedras en la vesícula, estreñimiento y triglicéridos (separado de colesterol).
- Nivel de ejercicio: nivel cero, principiante, con experiencia, avanzado.
- Pantalla final: mensaje + botón a WhatsApp de Camilo (+51952686162) con texto prellenado. El número se toma de `NEXT_PUBLIC_NUTRI_WHATSAPP`.

## Panel (repo actual)

- Botón "Pago recibido: habilitar y crear dieta" en el interesado (flujo del paso 4).
- En el paciente: código de acceso (ver, regenerar), estado del ciclo (activo / por renovar / esperando pago), día del ciclo.
- Registro diario del paciente: comidas marcadas, fotos con la revisión de la IA, peso, rutina.
- Lista "Por renovar" en el inicio del panel: pacientes cuyo ciclo terminó, con botón para abrir WhatsApp con mensaje prellenado.
- Resumen del mes y dieta nueva en borrador → botón "Pago recibido: publicar dieta nueva".
- Ajustes → **Rutinas**: una plantilla por nivel (nivel cero, principiante, con experiencia, avanzado) que escribe Camilo: lista de ejercicios con series/repeticiones/minutos y días por semana. Se cargan ejemplos marcados "ejemplo, revisar" para que no arranque vacío.
- **Chatbot para Camilo** (DeepSeek): un chat en el panel. Si está abierto dentro de un paciente, recibe como contexto el resumen de ese paciente (datos, condiciones, dieta vigente, cumplimiento, revisiones de fotos). Sirve para preguntas como "¿cómo va Juan?", "¿qué le cambio en la cena?". No escribe en la base; solo responde.

## App del paciente (repo nuevo)

- Next.js (App Router) + TypeScript + Tailwind, PWA instalable con el mismo `BotonInstalar` que este repo, desplegada en Vercel con dominio propio.
- **Entrada:** celular + código de 6 dígitos que da Camilo. Los pacientes **no** son usuarios de Supabase Auth. El acceso va por funciones `SECURITY DEFINER` en Supabase (mismo estilo que `nutri_create_lead`): una función canjea celular + código por un token de sesión aleatorio (se guarda solo su hash, expira a los 90 días), y todas las lecturas/escrituras del paciente pasan por funciones que validan ese token. Límite de intentos de código por celular. Decisión de Aurex.
- Pantallas:
  - **Hoy:** comidas del día con hora, plato y porción en medidas caseras; por cada una: cumplí / a medias / no, nota opcional, foto opcional. Meta de agua.
  - **Rutina:** la plantilla de su nivel; marcar hecha.
  - **Progreso:** línea de tiempo: peso, % cumplimiento por semana, días de rutina, fotos.
  - **Mis metas:** peso objetivo, calorías, agua, días que faltan del ciclo.
  - **Mi mes:** al terminar el ciclo, el resumen y el aviso de dieta nueva bloqueada con botón a WhatsApp de Camilo.
- Vista de celular y vista de computadora por separado.
- Horarios de comida: por defecto 7:00 / 10:00 / 13:00 / 16:00 / 19:30, editables por Camilo por paciente (decisión de Aurex).

## IA (DeepSeek)

- Proveedor: DeepSeek API. Modelo con entrada de imagen (as of 2026-11: `deepseek-v4-flash-vision-exp`, que según fuentes secundarias ya enruta a V4.1 Flash; **verificar el ID vigente en api-docs.deepseek.com antes de construir**). Precio publicado igual al de V4 Flash, ~USD 0.22 por millón de tokens de entrada y ~USD 0.66 por millón de salida; cada imagen cuenta como máximo 384 tokens según el anuncio oficial (otra fuente dice 1024).
- **Revisión de foto:** al subir una foto, una función del servidor manda la foto + el plato planeado para esa comida y pide JSON corto: qué parece haber, si coincide con lo planeado (sí / parcial / no), kcal aproximadas, una frase. Se guarda en la base. **Lo ve Camilo** en el panel; el paciente ve "foto recibida" (anti-meta: nada de consejo de IA sin revisión). Tope: 6 fotos por paciente por día.
- **Resumen del mes:** el cálculo (cumplimiento, comidas saltadas, cambio de peso, días de rutina, coincidencias de fotos) lo hace código. La IA solo redacta el texto amable "esto lograste / esto te faltó" a partir de esos números (1 llamada por paciente por mes). El texto solo puede hablar de esos números (sin consejos médicos), así que se muestra al paciente sin esperar a Camilo; Camilo lo ve en el panel y puede corregirlo (decisión de Aurex).
- **Chatbot de Camilo:** texto, mismo proveedor.
- Costo estimado (orden de magnitud): una foto ≈ 1000 tokens en total ≈ menos de USD 0.001. 50 pacientes × 6 fotos × 30 días ≈ 9000 fotos ≈ menos de USD 10 al mes. A confirmar con el precio vigente.
- Clave en `DEEPSEEK_API_KEY` (variables de Vercel de ambos proyectos). La crea Bryce en platform.deepseek.com.

## Datos nuevos (migración en el SQL Editor de WIOCRM)

- `nutri_patient_access`: paciente, hash del código, intentos, hash del token, vencimiento.
- `nutri_cycles`: paciente, plan, inicio, fin, estado (`borrador`, `activo`, `por_renovar`, `pagado`), resumen (números + texto).
- `nutri_food_logs`: paciente, ciclo, fecha, tiempo de comida, estado (cumplí/a medias/no), nota, ruta de foto, revisión IA (JSON).
- `nutri_exercise_templates`: cuenta, nivel, contenido.
- `nutri_exercise_logs`: paciente, fecha, hecho.
- Cambios: `nutri_leads` y `nutri_patients` con 5 niveles de actividad, objetivo, nivel de ejercicio; `nutri_meal_plans` con estado (borrador/publicado); condiciones nuevas en la semilla; topes por comida y reparto por condición en `nutri_conditions`.
- Bucket privado `nutri-fotos`; el paciente sube con URL firmada que emite una función del servidor; Camilo ve con URL firmada.

## Código compartido

El motor de cálculo y los tipos viven en `nutricion-app`. El repo nuevo copia `src/lib/nutricion/` (solo lo que muestra; los cálculos se hacen en el panel y en la base). Decisión de Aurex: copiar, no paquete compartido, por simplicidad; anotar en ambos README que se mantienen iguales.

## Decisiones de Aurex tras la revisión del constructor

- **Forma de la dieta:** plan semanal (7 días distintos, `plan_type = 'semanal'`) que se repite las 4 semanas del ciclo. El motor ya evita repetir platos entre días. Cada registro de comida apunta al ítem planeado (día de la semana + tiempo de comida), y la foto se compara con ese plato.
- **Si al motor le falta un plato:** el borrador se crea igual con el hueco marcado, y Camilo lo completa a mano antes de publicar. "Publicar al paciente" se bloquea mientras haya huecos.
- **Etiquetas nuevas** (blando/cocido, sin cáscara, sin azúcar añadido, bajo en sodio, verdura cruda, fruta con cáscara, menestra, carne roja, lácteo entero, alta fibra): las carga el constructor en la semilla, propone cuáles lleva cada plato del catálogo y las marca "por validar". Camilo las revisa en Platos antes de usar la app con pacientes reales.
- **Vesícula:** Camilo (2026-11-22) primero dijo "no hay una cantidad fija" y luego confirmó: tope duro de 5 g de grasa por comida. El tope gana sobre el 25 %.
- **Fin de ciclo sin pago (opción A, Bryce 2026-11-22):** el paciente sigue viendo su dieta vieja, su progreso y su historial; solo la dieta nueva queda bloqueada hasta que Camilo la publique.
- **Repo nuevo:** https://github.com/Wio7/nutriapp-pacientes (carpeta local `Wio\nutri-app`). El código inicial lo escribe Gemini CLI y Aurex lo revisa.
- **Acceso:** un código por paciente, que sirve en varios celulares y no cambia al renovar (Camilo lo puede regenerar). El código es único dentro de la cuenta: celular + código siempre da un solo paciente, aunque dos pacientes compartan el celular de la mamá. El token vale mientras el paciente exista y Camilo no lo revoque.
- **Ciclo:** dura 30 días y cuenta desde que Camilo publica la dieta. Si publica tarde, el ciclo empieza en esa fecha.
- **Datos existentes:** `ligera`→ligero y `moderada`→moderado. Se crea el campo `goal` (bajar / mantener / subir) más `goal_kcal_adjustment`. Los pacientes actuales quedan con `goal` según el signo de `goal_adjustment_pct`. Las dietas ya hechas no se recalculan.
- **IA, fallos y tope global:** si DeepSeek falla o se pasa el tope, la comida y la foto se guardan igual con la revisión "pendiente", y se reintenta luego. Además del tope por paciente, hay un tope mensual de fotos por cuenta (`IA_TOPE_FOTOS_MES`, por defecto 10 000). Al llegar ahí se deja de revisar y se le avisa a Camilo.
- **Rutina:** el nivel queda fijo todo el ciclo. Camilo lo sube al renovar si corresponde.

## Lo que queda al constructor

- Estructura interna de componentes y nombres de archivos.
- Textos exactos de pantallas (en español, tuteo, cortos).
- Cómo se ve la línea de tiempo (gráfico simple de peso + barras de cumplimiento).
- Manejo de errores de red al subir fotos (reintentar).

## Pendientes que decide Bryce o Camilo

- Clave de DeepSeek (Bryce la crea).
