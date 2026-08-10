# Proyecto-14-Inteligencia-Artificial-UCI-2026

## Proyecto 14: Clasificador Óptico de Calidad y Madurez de Frutas para Abasto/Mercados

> 📌 **Estado del Proyecto**: De momento **solo incluye el Frontend (PWA)**. Próximamente se implementará e integrará la API del Backend con el modelo de IA.

- **Contexto local**: La inspección de calidad en centros de distribución como el Mercado Abasto se realiza manualmente, generando variaciones en el precio final.
- **Objetivo**: Clasificar el estado de madurez (Verde, Maduro, Sobrepasado) y el porcentaje de imperfecciones en frutas de alto consumo local (mangas, bananas, tomates).
- **Desafío técnico e investigación**: Visión computacional combinando clasificación multiclase y regresión de área para medir la extensión de manchas o daños físicos en el producto.
- **Entregable**: PWA donde se fotografía el lote de frutas y se expide una etiqueta con la clasificación y vida útil estimada en días.
- **Repositorio Oficial**: [https://github.com/MtTschlr/Proyecto-14-Inteligencia-Artificial-UCI-2026](https://github.com/MtTschlr/Proyecto-14-Inteligencia-Artificial-UCI-2026)

---

# Sacred Fruit 🍏 — PWA de Control de Calidad de Frutas

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.2-purple?logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-emerald?logo=tailwindcss)
![PWA Ready](https://img.shields.io/badge/PWA-Ready-success?logo=pwa)

**Sacred Fruit** es una Progressive Web App (PWA) moderna e interactiva diseñada para la inspección, control de calidad y clasificación de frutas en tiempo real. Permite capturar imágenes con la cámara de dispositivos móviles o subir archivos, gestionar lotes de producción, imprimir etiquetas térmicas de 80mm y exportar reportes en Excel.

---

## 🌟 Características Principales

- 📸 **Visor de Cámara Estilo iOS**: Visor en pantalla completa adaptado para dispositivos móviles y Safari en iOS, con disparador táctil circular y selector para rotar cámara (frontal / trasera).
- 🔍 **Análisis Diferido**: Permite previsualizar la fotografía o seleccionar muestras rápidas antes de presionar el botón de **Analizar**.
- 🎨 **Diseño Moderno Verde Pastel**: Interfaz limpia, responsiva y táctil en tonos verdes pastel (`emerald`) pensada para operarios en campo y planta de empaque.
- 🏷️ **Impresión Térmica de Etiquetas (80mm)**: Generación automática de etiquetas térmicas formateadas para impresoras portátiles de 80mm con código de barras y nivel de madurez/calidad.
- 📊 **Historial y Exportación a Excel (`.xlsx`)**: Almacenamiento local de lecturas y exportación de reportes de calidad compatibles con Microsoft Excel.
- 🔌 **Integración FastAPI & Modo Demo**: Conexión lista para recibir inferencias de modelos de inteligencia artificial mediante API o funcionar en modo simulado sin servidor.
- 📱 **Soporte PWA Instalable**: Instalable en la pantalla de inicio de iPhone y Android con manifiesto completo e iconos adaptados (`apple-touch-icon`).

---

## 🚀 Inicio Rápido

### Requisitos Previos
- **Node.js** v18 o superior
- **npm** (incluido con Node.js)

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone <URL_DEL_REPOSITORIO>
cd sacred-fruit
npm install
```

### 2. Ejecutar en servidor de desarrollo local

```bash
npm run dev
```

La aplicación estará disponible localmente en `http://localhost:3000`.

---

## 📲 Probar en Dispositivos Móviles (Celular en red Wi-Fi)

Para acceder desde Safari en tu celular y permitir el uso de la cámara WebRTC en un entorno seguro HTTPS:

### Opción con Cloudflare Tunnel (Recomendada)
```bash
npx --yes cloudflared tunnel --url http://localhost:3000
```
Copia el enlace generado `https://<nombre>.trycloudflare.com` e ingrésalo desde el navegador de tu celular.

---

## 🛠️ Estructura del Proyecto

```text
sacred-fruit/
├── public/                  # Favicon, imágenes y manifiesto PWA
│   ├── favicon.svg
│   ├── sacred-apple.png
│   └── icons.svg
├── src/
│   ├── components/          # Componentes de la interfaz de usuario
│   │   ├── CaptureArea.tsx  # Visor de cámara a pantalla completa e ingreso de lote
│   │   ├── CustomIcons.tsx  # Iconografía vectorial personalizada
│   │   ├── Header.tsx       # Barra de navegación principal
│   │   ├── HistoryList.tsx  # Historial de escaneos y exportador Excel
│   │   ├── LabelModal.tsx   # Modal e impresión de etiqueta térmica de 80mm
│   │   └── ResultSection.tsx# Tarjeta de resultados e inferencia
│   ├── services/
│   │   └── api.ts           # Servicio de clasificación y fallback mock
│   ├── types/
│   │   └── index.ts         # Tipos e interfaces de TypeScript
│   ├── App.tsx              # Componente raíz de la aplicación
│   ├── index.css            # Estilos globales con Tailwind CSS v4
│   └── main.tsx             # Punto de entrada de React
├── index.html               # Plantilla HTML con metas para iOS PWA
├── vite.config.ts           # Configuración de Vite y plugin PWA
└── package.json
```

---

## ⚙️ Tecnologías Empleadas

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Estilos**: [Tailwind CSS v4](https://tailwindcss.com/)
- **PWA**: `@vitejs/plugin-pwa`
- **Exportación de Datos**: `xlsx` (SheetJS)
