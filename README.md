# Proyecto-14-Inteligencia-Artificial-UCI-2026

## Proyecto 14: Clasificador Óptico de Calidad y Madurez de Frutas para Abasto/Mercados

- **Contexto local**: La inspección de calidad en centros de distribución como el Mercado Abasto se realiza manualmente, generando variaciones en el precio final.
- **Objetivo**: Clasificar el estado de madurez (Verde, Maduro, Sobrepasado) y el porcentaje de imperfecciones en frutas de alto consumo local (banana, mango, naranja y tomate).
- **Desafío técnico e investigación**: Segmentación de instancias para medir la extensión de manchas o daños físicos sobre la superficie de la fruta.
- **Entregable**: PWA donde se fotografía el lote de frutas y se imprime una etiqueta con la clasificación y la vida útil estimada en días.
- **Repositorio Oficial**: [https://github.com/MtTschlr/Proyecto-14-Inteligencia-Artificial-UCI-2026](https://github.com/MtTschlr/Proyecto-14-Inteligencia-Artificial-UCI-2026)

---

# Sacred Fruit: PWA de control de calidad de frutas

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8-purple?logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-green?logo=tailwindcss)
![FastAPI](https://img.shields.io/badge/FastAPI-backend-teal?logo=fastapi)

El operario fotografía el lote desde el celular, el modelo segmenta las frutas y sus zonas dañadas, y la app muestra la madurez, el porcentaje de imperfección, la vida útil estimada y una recomendación logística. Después se imprime una etiqueta térmica de 80 mm. El historial se guarda en el dispositivo y se exporta a Excel.

## El modelo (best.pt)

Es un modelo **YOLOv8n-seg** de Ultralytics (tarea `segment`, entrada de 640 px) con 13 clases:

| Fruta   | Verde           | Maduro / madura   | Sobrepasado / sobrepasada |
| ------- | --------------- | ----------------- | ------------------------- |
| Banana  | `banana_verde`  | `banana_madura`   | `banana_sobrepasada`      |
| Mango   | `mango_verde`   | `mango_maduro`    | `mango_sobrepasado`       |
| Naranja | `naranja_verde` | `naranja_madura`  | `naranja_sobrepasada`     |
| Tomate  | `tomate_verde`  | `tomate_maduro`   | `tomate_sobrepasado`      |

Además existe la clase `defecto`, que marca las zonas dañadas de la fruta.

Cómo se calcula cada dato:

- **Fruta y estado**: la clase de fruta con más superficie detectada en la foto.
- **Confianza**: promedio de la confianza de las detecciones de esa clase.
- **% de imperfección**: superficie de las máscaras `defecto` que cae sobre la fruta, dividida por la superficie total de fruta.
- **Calibre, peso y vida útil**: el modelo no los entrega. Se resuelven con reglas fijas por fruta y estado (`backend/main.py` y `src/services/fruitRules.ts`).
- **Recomendación logística**: regla según el estado y el nivel de imperfección (leve menos de 5 %, moderada hasta 12 %, elevada desde 12 %).

## Inicio rápido (solo frontend, modo demo)

Requisitos: Node.js 18 o superior.

```bash
npm install
npm run dev
```

Con la configuración por defecto la app corre en **modo demo**: no necesita servidor y los resultados son simulados (la zona de detecciones se marca como simulada). Las muestras rápidas llevan su propio resultado de prueba.

Otros comandos: `npm run build` compila y genera la PWA, `npm run lint` corre oxlint.

## Backend con el modelo real (FastAPI)

Requisitos: Python 3.10 o superior. La primera instalación descarga PyTorch, así que tarda.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # en Linux o Mac: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

El servidor busca el modelo en `../best.pt`. Para usar otro archivo: variable de entorno `MODEL_PATH`. Otras variables: `CONF_THRESHOLD` (por defecto 0.25) y `ALLOWED_ORIGINS` (por defecto `*`).

Endpoints:

- `GET /health`: estado del servidor, tarea y clases del modelo.
- `POST /predict`: recibe `multipart/form-data` con `file` (la imagen) y `lot_id` (opcional). Responde 422 si no detecta ninguna fruta.

Respuesta de `/predict`:

```json
{
  "id": "SCAN-1760000000000",
  "lot_id": "LOTE-1234",
  "fruit_type": "Banana",
  "state": "MADURO",
  "confidence": 0.93,
  "imperfection_percentage": 3.2,
  "imperfection_details": "2 zonas dañadas detectadas (3.2 % de la superficie)",
  "shelf_life_days": "2 a 4 días",
  "suggested_action": "Despacho inmediato a locales comerciales",
  "caliber": "Calibre A (más de 20 cm)",
  "estimated_weight": "Caja estándar 18 kg",
  "detections": [
    {
      "kind": "fruta",
      "label": "banana_madura",
      "confidence": 0.93,
      "box": [0.12, 0.2, 0.88, 0.8],
      "polygon": [[0.12, 0.4], [0.3, 0.22]]
    }
  ]
}
```

Las coordenadas de `box` (x1, y1, x2, y2) y `polygon` van normalizadas entre 0 y 1 respecto de la imagen original. La app dibuja las máscaras sobre la foto del resultado.

### Conectar la app al backend

1. Abre **Ajustes** (barra inferior en el celular, engranaje arriba a la derecha en escritorio).
2. Apaga **Modo demo** y escribe la dirección del backend, por ejemplo `http://192.168.1.20:8000`.
3. Toca **Probar conexión**: debe decir que el modelo cargó 13 clases.

Notas para el celular: si la app se abre por HTTPS (por ejemplo con el túnel de Cloudflare), el navegador bloquea llamadas a un backend `http://`. En ese caso hay que exponer el backend también por HTTPS. Si el backend falla o no responde, la app vuelve al modo demo y lo indica en el resultado.

## Probar en el celular

La cámara web necesita HTTPS. Una opción es un túnel de Cloudflare:

```bash
npx --yes cloudflared tunnel --url http://localhost:5173
```

Abre el enlace `https://<nombre>.trycloudflare.com` en el celular.

## Cómo se ve la app

- **Celular**: barra superior con el estado de conexión y la cantidad de escaneos, y barra inferior con Escanear, Historial y Ajustes.
- **Escritorio**: captura a la izquierda, resultado a la derecha (fijo al hacer scroll) y el historial abajo a lo ancho.
- **Colores de estado**: verde lima para VERDE, dorado para MADURO y terracota para SOBREPASADO. Cada estado también lleva icono y texto.
- **Etiqueta**: 80 mm, blanco y negro, una sola página. La impresión usa el bloque `@media print` de `src/index.css` y el elemento `#thermal-label-print-area`.

## Estructura

```text
.
├── best.pt                    # Modelo YOLOv8-seg
├── backend/
│   ├── main.py                # API FastAPI: /health y /predict
│   └── requirements.txt
├── public/                    # Favicon, icono sacred-apple y recursos PWA
├── scripts/
│   └── generate-icons.mjs     # Genera favicon.svg, favicon.png y sacred-apple*.png
├── src/
│   ├── components/            # Interfaz: captura, resultado, historial, etiqueta, ajustes
│   ├── lib/                   # Estilos de estado y animaciones
│   ├── services/
│   │   ├── api.ts             # Llamada al backend y modo demo
│   │   └── fruitRules.ts      # Reglas de calibre, peso, vida útil y recomendación
│   ├── types/index.ts
│   ├── App.tsx
│   └── index.css              # Tema (paleta, tipografías) y estilos de impresión
├── index.html
└── vite.config.ts             # Vite y manifest de la PWA
```

Para regenerar los iconos: `node scripts/generate-icons.mjs`.

## Tecnologías

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, `vite-plugin-pwa`.
- **Tipografías**: Fraunces (títulos), Figtree (texto) e IBM Plex Mono (lotes y cifras), desde Google Fonts.
- **Iconos**: [Flaticon UIcons](https://www.flaticon.es/) (estilo regular redondeado).
- **Exportación**: `xlsx` (SheetJS).
- **Backend**: FastAPI y Ultralytics YOLO.
