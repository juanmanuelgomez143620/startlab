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

1. Subir el proyecto a GitHub
2. Importar en [vercel.com](https://vercel.com)
3. Agregar las variables de entorno en el panel de Vercel
4. Deploy automático

> **Importante:** En Supabase → Authentication → URL Configuration, agregar tu URL de Vercel en Site URL y Redirect URLs.

## Supabase

Ejecutar el SQL del archivo `_legacy/supabase-emprendeplan.sql` en el SQL Editor de Supabase para crear todas las tablas.

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
