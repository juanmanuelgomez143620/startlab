# EmprendePlan 🚀

**Herramienta pedagógica para Plan de Negocios Estudiantil**  
Desarrollada por **Juan Manuel Gómez** — Prof. en Ciencias Económicas | Lic. en Educación | Experto en Tecnología Educativa

---

## Stack

- **React 18** + **TypeScript** + **Vite**
- **Zustand** para estado global con persistencia local
- **Supabase** para auth y base de datos en la nube
- **Chart.js** + react-chartjs-2 para gráficos
- **jsPDF** para exportación en PDF
- Deploy en **Vercel**

---

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# 3. Ejecutar en desarrollo
npm run dev

# 4. Build de producción
npm run build
```

## Variables de entorno (.env)

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_AUTHOR_PHOTO=https://url-foto-autor.jpg
```

## Deploy en Vercel

1. Importar el repo `startlab` en [vercel.com](https://vercel.com) (Framework: **Vite**, se detecta solo; build `npm run build`, output `dist`)
2. En *Settings → Environment Variables* cargar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Production + Preview)
3. Deploy (cada push a `main` redeploya automáticamente)

> **Importante:** En Supabase → Authentication → URL Configuration, poner la URL de Vercel en **Site URL** y agregar `https://<tu-app>.vercel.app/**` en **Redirect URLs** (si no, los mails de confirmación apuntan a localhost).

## Supabase

El esquema completo (tablas, RLS, funciones RPC, triggers y realtime) está en
`supabase/migrations/20261114000000_schema_inicial.sql`. Para un proyecto nuevo, ejecutarlo
completo en el SQL Editor. Ya está aplicado en el proyecto `emprendeplan` (`kjstvkculajcljsbvlnn`).

Los archivos de `_legacy/` son históricos y **no** deben ejecutarse.

## Estructura del proyecto

```
src/
├── components/     # UI primitivos (Btn, Card, Toast, etc.)
├── hooks/          # useAuth, useProject
├── lib/            # calculos.ts, supabase.ts, pdfExport.ts
├── pages/          # Una página por sección del plan
├── store/          # Zustand store global
└── types/          # TypeScript types
```

## Correcciones en cálculos financieros (v3)

- ✅ Costos fijos: ya no se duplican (se distribuyen correctamente en 4 semanas = 1 mes)
- ✅ Margen de contribución: calculado sobre precio, no sobre costo
- ✅ Punto de equilibrio: usa precio/costo del formulario financiero unificado
- ✅ Validación de división por cero en todos los cálculos
- ✅ Sincronización automática: tabla de gastos fijos → punto de equilibrio
