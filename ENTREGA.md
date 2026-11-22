# Entrega: App del Paciente NutriApp (Wio7/nutriapp-pacientes)

## 1. Qué se hizo, archivo por archivo

- `.env.example`: Plantilla de variables de entorno con Supabase, DeepSeek, límites y modo demo documentados.
- `.gitignore`: Ignora node_modules, .next, .env*.local y archivos de build.
- `eslint.config.mjs`: Configuración de ESLint para Next.js 16 con FlatConfig y reglas de Core Web Vitals.
- `next.config.ts`: Configuración de Next.js con Turbopack y loader de Tailwind CSS 4.
- `package.json`: Definición de dependencias compatibles (Next 16.4.3, React 19.3.0, Supabase 2.49+, Tailwind 4, Vitest 3, Lucide, OpenAI).
- `README.md`: Documentación en español con instrucciones de desarrollo local, modo demo y despliegue en Vercel.
- `tsconfig.json`: Configuración de TypeScript con alias `@/*` apuntando a `./src/*` y tipado estricto.
- `vitest.config.ts`: Configuración del test runner Vitest con soporte de alias `@/*` y entorno Node.
- `public/apple-touch-icon.png`: Icono de acceso directo para dispositivos iOS/Safari.
- `public/icon-192.png`: Icono PWA estándar de 192x192 px copiado del repositorio base.
- `public/icon-512.png`: Icono PWA de alta resolución de 512x512 px.
- `public/icon-maskable-512.png`: Icono PWA con área de seguridad maskable para Android.
- `supabase/migrations/20261122_app_paciente.sql`: Migración SQL completa con tablas, RLS, bucket privado y funciones SECURITY DEFINER para el paciente.
- `src/app/favicon.ico`: Favicon oficial de la marca NutriApp.
- `src/app/globals.css`: Estilos globales con Tailwind 4, tema de color verde (#047857), fondo (#f3f9f5) y accesibilidad.
- `src/app/layout.tsx`: Layout raíz HTML con metadatos PWA y script para capturar el evento `beforeinstallprompt`.
- `src/app/manifest.ts`: Manifiesto web dinámico de la PWA configurado para instalación en dispositivos móviles y escritorio.
- `src/app/page.tsx`: Página de entrada raíz que redirige automáticamente a `/hoy` si hay sesión o a `/entrar` si no.
- `src/app/entrar/page.tsx`: Pantalla de inicio de sesión con celular peruano y código de 6 dígitos, diseñada para móvil y escritorio.
- `src/app/(app)/layout.tsx`: Layout autenticado que provee navegación lateral en escritorio y barra inferior en móvil por separado.
- `src/app/(app)/hoy/page.tsx`: Vista principal de las comidas del día con horarios, macros, medida casera y meta de agua diaria.
- `src/app/(app)/hoy/tarjeta-comida-wrapper.tsx`: Componente cliente que comprime fotos a máx. 1024 px y gestiona el registro de comidas.
- `src/app/(app)/rutina/page.tsx`: Página de rutina de ejercicio según el nivel asignado al paciente.
- `src/app/(app)/rutina/rutina-cliente.tsx`: Componente interactivo para listar los ejercicios y marcar la rutina como completada en el día.
- `src/app/(app)/progreso/page.tsx`: Vista de seguimiento con histórico de mediciones y cumplimiento de hábitos.
- `src/app/(app)/progreso/progreso-cliente.tsx`: Componente con formulario de registro de peso, gráfico de evolución y barras semanales.
- `src/app/(app)/metas/page.tsx`: Tablero de objetivos con peso meta, calorías diarias, litros de agua y días restantes del ciclo.
- `src/app/(app)/mi-mes/page.tsx`: Página de cierre de ciclo de 30 días con balance del mes y bloqueo de nueva dieta hasta pago.
- `src/app/(app)/mi-mes/mi-mes-cliente.tsx`: Componente con resumen redactado por IA, tarjeta de dieta bloqueada y botón directo a WhatsApp de Camilo.
- `src/app/api/entrar/route.ts`: Endpoint que valida celular y código mediante función SQL `nutri_paciente_entrar` y emite cookie httpOnly.
- `src/app/api/salir/route.ts`: Endpoint que invalida el token de sesión y elimina la cookie httpOnly del navegador.
- `src/app/api/registrar-comida/route.ts`: Endpoint para registrar el cumplimiento de un tiempo de comida (cumplí / a medias / no) y nota.
- `src/app/api/registrar-peso/route.ts`: Endpoint para guardar nuevas mediciones de peso corporal (rango 25 a 350 kg).
- `src/app/api/marcar-rutina/route.ts`: Endpoint para marcar si la rutina del día fue realizada.
- `src/app/api/fotos/route.ts`: Endpoint que valida topes, almacena la foto en el bucket privado `nutri-fotos` y solicita revisión a DeepSeek Vision.
- `src/app/api/resumen-mes/route.ts`: Endpoint que calcula las métricas del mes en código y pide a DeepSeek redactar el mensaje de balance.
- `src/components/boton-instalar.tsx`: Botón universal de instalación de la PWA compatible con Chrome/Android, iOS Safari y Desktop.
- `src/components/grafico-peso.tsx`: Gráfico de línea interactivo con Recharts adaptado para evitar problemas de hidratación SSR.
- `src/components/nav-inferior.tsx`: Barra de navegación fija inferior para dispositivos móviles con 5 accesos rápidos.
- `src/components/nav-lateral.tsx`: Menú lateral fijo para pantallas de escritorio con accesos, botón de instalar y cerrar sesión.
- `src/components/tarjeta-comida.tsx`: Tarjeta expandible por comida con estado, notas, subida de foto y feedback visual.
- `src/components/ui.tsx`: Biblioteca de componentes reutilizables (Boton, Campo, Tarjeta, Insignia, Aviso, Separador) en verde #047857.
- `src/lib/demo.ts`: Conjunto de datos simulados y utilidades para ejecutar y revisar toda la app en local sin conectar Supabase.
- `src/lib/etiquetas.ts`: Constantes de tiempos de comida, horarios por defecto y formateadores de fechas en español de Perú.
- `src/lib/instalacion.ts`: Lógica de detección de plataforma para guiar la instalación de la PWA según el navegador.
- `src/lib/marca.ts`: Configuración de identidad del nutricionista Camilo Villafranca y su número de WhatsApp oficial.
- `src/lib/supabase.ts`: Cliente de Supabase inicializado de forma segura con fallback para evitar errores en build estático.
- `src/lib/token.ts`: Utilidades del lado del servidor para leer, escribir y revocar el token de sesión en cookies seguras.
- `src/lib/ia/deepseek.ts`: Integración con la API de DeepSeek, control de topes (6/día y 10000/mes), parseador y métricas del mes.
- `src/lib/nutricion/calculos.ts`: Motor de cálculos nutricionales con fórmulas Harris-Benedict, factores de actividad y validaciones.
- `src/lib/nutricion/types.ts`: Tipos TypeScript unificados para nutrición, pacientes, registros, estados de ciclo y revisiones de IA.
- `src/lib/__tests__/auth-token.test.ts`: Pruebas unitarias de validación de celulares peruanos, códigos de 6 dígitos, hash y ventana de reintentos.
- `src/lib/__tests__/deepseek-parseo.test.ts`: Pruebas de parseo de respuestas JSON de DeepSeek Vision con soporte de markdown y fallbacks.
- `src/lib/__tests__/ia-topes.test.ts`: Pruebas unitarias de cumplimiento de topes por paciente (6/día) y mensuales por cuenta (10 000).
- `src/lib/__tests__/resumen-mes.test.ts`: Pruebas del cálculo aritmético de porcentajes de cumplimiento, variación de peso y adherencia.

---

## 2. Qué dejé a medias o qué supuse

- **Migración SQL sin ejecutar:** Tal como especifican las instrucciones de `GEMINI.md`, el archivo `supabase/migrations/20261122_app_paciente.sql` fue generado y estructurado meticulosamente, pero **no fue ejecutado** en la base de datos de producción porque Aurex debe revisarlo previamente.
- **Suposición sobre cuenta de Camilo:** Se utilizó el UUID `88cf5ef8-5803-461b-b0c3-ed8905977337` como ID por defecto de la cuenta de Camilo en WIOCRM, coincidiendo con la migración y la configuración del repo de origen.
- **Suposición del formato de respuesta de IA:** Se configuró un prompt estricto con salida JSON pura y un extractor con tolerancia a bloques markdown (````json ... ````) por si el modelo de DeepSeek devuelve el JSON con formato de código.
- **Bucket `nutri-fotos`:** Se configuró como bucket privado (`public: false`) conforme a la Ley 29733 de Protección de Datos Personales de Perú. Para el modo local/demo, la app opera sin bloquearse si el bucket aún no ha sido creado en el proyecto.

---

## 3. ID de modelo de DeepSeek verificado

- **ID verificado:** `deepseek-flash`
- **Fuente:** Documentación oficial en [api-docs.deepseek.com](https://api-docs.deepseek.com).
- **Detalle de la verificación:** La documentación oficial indica que el soporte nativo de visión multimodal se encuentra integrado en el modelo de producción **`deepseek-flash`** (respaldado por la arquitectura `DeepSeek-V4.1-Flash`). El identificador experimental anterior (`deepseek-v4-flash-vision-exp`) ha sido unificado y redirigido automáticamente a `deepseek-flash`. La variable se configuró como `DEEPSEEK_MODELO_VISION=deepseek-flash` en `.env.example`.

---

## 4. Cómo probarla en 3 pasos

1. **Clonar e instalar dependencias:**
   ```bash
   cd "c:\Users\Bryce\Downloads\Telegram Desktop\Wio\nutri-app"
   npm install
   ```
2. **Ejecutar las pruebas unitarias automatizadas (todas pasando):**
   ```bash
   npm test
   ```
3. **Iniciar en modo demo y probar las pantallas en el navegador:**
   Crea un archivo `.env.local` con `NEXT_PUBLIC_DEMO_MODE=1` (o copia de `.env.example`) y ejecuta:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000/entrar](http://localhost:3000/entrar). Haz clic en **"Ver versión demo"** para navegar por:
   - **Hoy (`/hoy`):** Las 5 comidas con hora, macros, medidas caseras, meta de agua y botones interactivos para marcar cumplimiento y simular fotos.
   - **Rutina (`/rutina`):** Plantilla de ejercicios de su nivel y botón para marcar completada.
   - **Progreso (`/progreso`):** Registro de peso en vivo, gráfico con Recharts y cumplimiento semanal.
   - **Metas (`/metas`):** Días del ciclo de 30 días, peso objetivo, calorías y agua.
   - **Mi mes (`/mi-mes`):** Balance de fin de ciclo y aviso de nueva dieta bloqueada con botón directo a WhatsApp de Camilo.
