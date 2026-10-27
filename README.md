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

Es un modelo **YOLO11s-seg** de Ultralytics (tarea `segment`, entrada de 640 px) con 13 clases. Se entrenó en Google Colab con el notebook `backend/sacred_fruit_reentrenamiento.ipynb`, usando el dataset propio de Roboflow más tres datasets públicos de naranjas, mangos y tomates y unas 600 fotos sin fruta de COCO:

| Fruta   | Verde           | Maduro / madura   | Sobrepasado / sobrepasada |
| ------- | --------------- | ----------------- | ------------------------- |
| Banana  | `banana_verde`  | `banana_madura`   | `banana_sobrepasada`      |
| Mango   | `mango_verde`   | `mango_maduro`    | `mango_sobrepasado`       |
| Naranja | `naranja_verde` | `naranja_madura`  | `naranja_sobrepasada`     |
| Tomate  | `tomate_verde`  | `tomate_maduro`   | `tomate_sobrepasado`      |

Además existe la clase `defecto`, que marca las zonas dañadas de la fruta.

Cómo se calcula cada dato:

- **Fruta y estado**: la clase de fruta con más superficie detectada en la foto, después de descartar detecciones con poca confianza, muy chicas, con forma rectangular o que CLIP reconoce como otra cosa (otra fruta, una pelota, una cara).
- **Confianza**: promedio de la confianza de las detecciones de esa clase.
- **% de imperfección**: superficie de las máscaras `defecto` que cae sobre la fruta, dividida por la superficie total de fruta.
- **Calibre, peso y vida útil**: el modelo no los entrega. Se resuelven con reglas fijas por fruta y estado (`backend/main.py` y `src/services/fruitRules.ts`).
- **Recomendación logística**: regla según el estado y el nivel de imperfección (leve menos de 5 %, moderada hasta 12 %, elevada desde 12 %).

## Cómo levantar todo

Requisitos: Node.js 18 o superior y Python 3.10 o superior. La primera instalación del backend descarga PyTorch, así que tarda.

1. Backend (una terminal):

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # en Linux o Mac: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

2. Frontend (otra terminal, en la raíz del proyecto):

```bash
npm install
npm run dev
```

La app manda las fotos a `/api` y Vite las reenvía al backend en `http://localhost:8000`. Si el backend está en otra máquina, se puede cambiar con la variable `BACKEND_URL` antes de `npm run dev`, o escribir la dirección completa en Ajustes.

Otros comandos: `npm run build` compila y genera la PWA, `npm run preview` la sirve con el mismo proxy, `npm run lint` corre oxlint.

Vite no vigila `backend/`, `dist/`, `.venv/` ni los `.pt`. Sin eso, en Linux se caía con `ENOSPC` por la cantidad de archivos de PyTorch en `backend/.venv`.

### Modo demo

Se activa en Ajustes. Solo analiza las **muestras de prueba**, que traen su resultado fijo. Una foto propia en modo demo muestra un aviso: la app nunca inventa un resultado.

## Backend (FastAPI)

El servidor busca el modelo en `../best.pt` (el modelo anterior quedó como `best_v1.pt`). Variables de entorno:

| Variable | Por defecto | Para qué sirve |
| --- | --- | --- |
| `MODEL_PATH` | `../best.pt` | Archivo del modelo |
| `CONF_THRESHOLD` | `0.25` con CLIP, `0.5` sin CLIP | Confianza mínima para aceptar una fruta. Subilo si aparecen frutas donde no hay, bajalo si no detecta frutas reales |
| `CONF_BANANA`, `CONF_MANGO`, `CONF_NARANJA`, `CONF_TOMATE` | igual que `CONF_THRESHOLD` (mango `0.6` sin CLIP) | Umbral propio de cada fruta. Pisa a `CONF_THRESHOLD` solo para esa fruta |
| `DEFECT_CONF` | `0.25` | Confianza mínima para las zonas dañadas |
| `MIN_AREA` | `0.01` | Superficie mínima de una fruta (1 % de la foto) |
| `MAX_FILL` | `0.93` | Si la máscara llena más de este porcentaje de su recuadro, se descarta: las frutas son redondeadas y las paredes o techos son rectángulos |
| `RED_SWAP` | `0.5` | Si una "naranja" tiene más de esta proporción de color rojo, se corrige a tomate |
| `CLIP_VERIFY` | `1` | `1` revisa cada fruta detectada con CLIP; `0` lo apaga. Si los pesos no se pueden bajar, se apaga solo y el servidor sigue andando |
| `CLIP_MARGIN` | `0.25` | Cuánto tiene que ganarle "otra cosa" a la fruta detectada para descartarla |
| `CLIP_SWAP` | `0.6` | Si CLIP está así de seguro de que es otra de las cuatro frutas, corrige la fruta y deja el estado de madurez |
| `CLIP_MAX_CROPS` | `6` | Máximo de detecciones que revisa CLIP por foto (las más grandes) |
| `ALLOWED_ORIGINS` | `*` | CORS |

### Verificación con CLIP

Al arrancar, el backend carga CLIP (ViT-B-32, pesos `laion2b_s34b_b79k`, unos 600 MB que se bajan la primera vez). Recorta cada fruta detectada, con un 10 % de margen, y la compara contra textos de las cuatro frutas del proyecto, de otras frutas (manzana, limón, pera, frutilla, etc.) y de objetos (techo, pared, pelota, cara, caja, etc.).

- Si gana otra cosa, la detección se descarta y queda anotada en `verification.clip.rejected`.
- Si gana otra de las cuatro frutas con más de `CLIP_SWAP`, se corrige la fruta y se mantiene el estado.
- Mandarina y pomelo cuentan como naranja, y papaya y durazno como mango, porque CLIP no los distingue bien. Por eso una mandarina real se acepta como naranja.

En CPU tarda unos 120 ms por foto (340 ms como máximo en las pruebas).

### Medir el modelo

```bash
python evaluate.py                       # modelo ../best.pt con la configuración por defecto
python evaluate.py otro_modelo.pt        # otro modelo
python evaluate.py --conf 0.4            # umbral general
python evaluate.py --conf mango=0.6      # umbral de una fruta (se puede repetir)
python evaluate.py --no-clip             # sin CLIP
```

Pasa todas las fotos de `backend/tests/imagenes` por el mismo `/predict` de la app y guarda la tabla en `backend/tests/resultados.md`. Compara fruta y estado, marca si aparecieron zonas dañadas en las fotos con manchas y cuenta cuántas detecciones descartó cada filtro (`confianza`, `area`, `forma`, `clip`).

Los nombres de las fotos positivas empiezan con `fruta_estado_` (por ejemplo `naranja_sobrepasada_01.jpg`), y si llevan `manchas` se esperan zonas dañadas. Las fuentes y licencias están en `backend/tests/imagenes/FUENTES.md`.

Endpoints:

- `GET /health`: estado del servidor, tarea y clases del modelo.
- `POST /predict`: recibe `multipart/form-data` con `file` (la imagen) y `lot_id` (opcional). Responde 422 si no detecta ninguna fruta y 400 si la imagen no sirve. Con `?debug=true` agrega las detecciones descartadas y el motivo.

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
      "polygon": [[0.12, 0.4], [0.3, 0.22], [0.5, 0.6]],
      "polygons": [[[0.12, 0.4], [0.3, 0.22], [0.5, 0.6]]]
    }
  ],
  "verification": {
    "discarded": 1,
    "discarded_by": { "clip": 1 },
    "color_corrections": [],
    "clip": { "enabled": true, "checked": 2, "ms": 95, "rejected": [], "corrections": [] }
  }
}
```

Las coordenadas de `box` (x1, y1, x2, y2), `polygon` y `polygons` van normalizadas entre 0 y 1 respecto de la imagen ya girada según el EXIF, que es la misma que muestra la app. `polygons` trae un contorno por cada parte de la máscara (las partes de menos del 5 % se descartan), simplificado a 80 puntos como máximo. `polygon` es la parte más grande y se mantiene para el historial viejo. La respuesta 422 también trae `verification`, para saber qué filtro descartó cada detección.

### Conectar la app al backend

1. Abre **Ajustes** (barra inferior en el celular, engranaje arriba a la derecha en escritorio).
2. Deja **Modo demo** apagado y la dirección en `/api`.
3. Toca **Probar conexión**: debe decir que el modelo cargó 13 clases.

Si el backend no responde, la app muestra el error y no guarda ningún resultado.

## Probar en el celular

La cámara web necesita HTTPS. Una opción es un túnel de Cloudflare:

```bash
npx --yes cloudflared tunnel --url http://localhost:5173
```

Abre el enlace `https://<nombre>.trycloudflare.com` en el celular. Como las fotos van a `/api` por el mismo túnel, no hace falta exponer el backend aparte.

## Cómo se ve la app

- **Celular**: barra superior con el estado de conexión y la cantidad de escaneos, y barra inferior con Escanear, Historial y Ajustes.
- **Escritorio**: captura a la izquierda, resultado a la derecha (fijo al hacer scroll) y el historial abajo a lo ancho.
- **Colores de estado**: verde lima para VERDE, dorado para MADURO y terracota para SOBREPASADO. Cada estado también lleva icono y texto.
- **Etiqueta**: 80 mm, blanco y negro, una sola página. La impresión usa el bloque `@media print` de `src/index.css` y el elemento `#thermal-label-print-area`.

## Estructura

```text
.
├── best.pt                    # Modelo YOLO11s-seg reentrenado
├── best_v1.pt                 # Modelo anterior (YOLOv8n-seg), de respaldo
├── backend/
│   ├── main.py                # API FastAPI: /health y /predict
│   ├── evaluate.py            # Mide el modelo con fotos con y sin fruta
│   ├── sacred_fruit_reentrenamiento.ipynb  # Entrenamiento en Google Colab
│   ├── tests/imagenes/        # Fotos de prueba (positivas y negativas) y FUENTES.md
│   ├── tests/resultados.md    # Última tabla de evaluate.py
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
- **Backend**: FastAPI, Ultralytics YOLO y OpenCLIP.
