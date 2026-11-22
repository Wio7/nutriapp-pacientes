# NutriApp Pacientes

App web instalable (PWA) para los pacientes del nutricionista Camilo Villafranca (Perú).
Permite ver las comidas del día con horarios, plato y macros, registrar cumplimiento (cumplí / a medias / no), subir fotos revisadas por IA (DeepSeek), registrar el peso, seguir la rutina de ejercicios según el nivel asignado y revisar el balance al cierre del ciclo mensual de 30 días.

Todo el texto de la app está en español de Perú, tuteo y frases cortas.

---

## Características

- **Acceso sin Supabase Auth:** Los pacientes ingresan con su celular peruano (`+519XXXXXXXX`) y el código de 6 dígitos que les entrega Camilo. El token se gestiona mediante cookie `httpOnly` con funciones SQL `SECURITY DEFINER`.
- **Comidas de Hoy:** 5 tiempos de comida (`desayuno`, `media_manana`, `almuerzo`, `media_tarde`, `cena`) con horario, plato, medidas caseras, macros y meta de agua diaria (35 ml × kg).
- **Subida de fotos con IA:** Compresión en el cliente a máx. 1024 px antes de subir al bucket privado `nutri-fotos`. DeepSeek Vision compara la foto con el plato planeado. Tope de 6 fotos por paciente por día y 10 000 fotos al mes por cuenta. El paciente solo ve "foto recibida" (Ley 29733 de Protección de Datos Personales).
- **Rutina personalizada:** Ejercicios asignados al nivel del paciente (`nivel_cero`, `principiante`, `con_experiencia`, `avanzado`) con opción de marcar realizada cada día.
- **Progreso:** Gráfico interactivo de evolución de peso, estadísticas de rutina y barras de cumplimiento semanal.
- **Mis metas:** Días restantes del ciclo de 30 días, peso objetivo, calorías y agua.
- **Mi mes (Opción A):** Al cumplirse los 30 días, muestra el balance redactado amablemente por IA y deja la dieta nueva en estado "lista, bloqueada", con botón directo al WhatsApp de Camilo (+51 952 686 162) para coordinar el pago sin perder acceso a su historial.
- **PWA instalable:** Botón de instalación para Android, iPhone (instrucciones Safari) y escritorio.
- **Diseño responsive:** Vistas optimizadas para celular y computadora por separado.

---

## Cómo correrla en local

### 1. Requisitos
- Node.js 20 o superior
- npm

### 2. Instalación de dependencias
```bash
npm install
```

### 3. Modo Demo (sin necesidad de Supabase)
Copia `.env.example` a `.env.local` y activa el modo demo:
```bash
cp .env.example .env.local
```
Asegúrate de que contenga:
```env
NEXT_PUBLIC_DEMO_MODE=1
```

Inicia el servidor de desarrollo:
```bash
npm run dev
```
Abre en tu navegador [http://localhost:3000](http://localhost:3000).
Podrás entrar a `/entrar` y hacer clic en **"Ver versión demo"** o **"Entrar a mi plan"** para recorrer todas las pantallas con datos de prueba realistas.

### 4. Pruebas unitarias
```bash
npm test
```
Ejecuta la suite de Vitest:
- Canje de código y token (validación de celular, código de 6 dígitos, SHA-256, intentos fallidos).
- Topes de IA (6 fotos/día por paciente y 10 000 fotos/mes por cuenta).
- Cálculo de métricas del mes (porcentaje de cumplimiento, comidas saltadas, cambio de peso, días de rutina).
- Parseo seguro de respuestas de DeepSeek Vision.

### 5. Compilación de producción
```bash
npm run build
```

---

## Despliegue en Vercel

1. Sube el código al repositorio `https://github.com/Wio7/nutriapp-pacientes.git` en la rama `main`.
2. Conecta el repositorio en Vercel.
3. Configura las siguientes variables de entorno en el proyecto de Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase de WIOCRM.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave pública `anon` de Supabase (nunca la clave `service_role`).
   - `NEXT_PUBLIC_WIOCRM_ACCOUNT_ID`: `88cf5ef8-5803-461b-b0c3-ed8905977337` (cuenta de Camilo).
   - `NEXT_PUBLIC_NUTRI_NOMBRE`: `Camilo Villafranca`
   - `NEXT_PUBLIC_NUTRI_WHATSAPP`: `51952686162`
   - `DEEPSEEK_API_KEY`: Clave creada en [platform.deepseek.com](https://platform.deepseek.com).
   - `DEEPSEEK_MODELO_VISION`: `deepseek-flash`
   - `IA_TOPE_FOTOS_MES`: `10000`
4. Despliega en producción en la rama `main`. Vercel compilará la app automáticamente.
