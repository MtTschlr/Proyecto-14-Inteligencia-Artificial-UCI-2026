# Proyecto-14-Inteligencia-Artificial-UCI-2026

## Proyecto 14: Clasificador Óptico de Calidad y Madurez de Frutas para Abasto/Mercados

- **Contexto local**: La inspección de calidad en centros de distribución como el Mercado Abasto se realiza manualmente, generando variaciones en el precio final.
- **Objetivo**: Clasificar el estado de madurez (Verde, Maduro, Sobrepasado) y el porcentaje de imperfecciones en frutas de alto consumo local (banana, mango, naranja y tomate).
- **Desafío técnico e investigación**: Segmentación de instancias para medir la extensión de manchas o daños físicos sobre la superficie de la fruta.
- **Entregable**: PWA donde se fotografía el lote de frutas y se imprime una etiqueta con la clasificación y la vida útil estimada en días.
- **Repositorio Oficial**: [https://github.com/MtTschlr/Proyecto-14-Inteligencia-Artificial-UCI-2026](https://github.com/MtTschlr/Proyecto-14-Inteligencia-Artificial-UCI-2026)

---

# Sacred Fruit

El operario saca una foto del lote con el celular. El modelo marca cada fruta y sus zonas dañadas, y la app muestra la fruta, el estado de madurez, la confianza, el porcentaje de imperfección, la vida útil y qué hacer con el lote. Un panel explica cómo se llegó a esa respuesta. Después se puede imprimir una etiqueta térmica de 80 mm. El historial queda guardado en el dispositivo y se exporta a Excel.

## El modelo (best.pt)

Es un modelo **YOLO11s-seg** de Ultralytics (tarea `segment`, entrada de 640 px) con 13 clases. Se entrenó en Google Colab con el notebook `backend/sacred_fruit_reentrenamiento.ipynb`, usando el dataset propio de Roboflow (con las fotos reales nuevas), siete datasets públicos de Roboflow Universe con fotos reales de las cuatro frutas (incluida fruta pasada) y fotos sin fruta de COCO:

| Fruta   | Verde           | Maduro / madura   | Sobrepasado / sobrepasada |
| ------- | --------------- | ----------------- | ------------------------- |
| Banana  | `banana_verde`  | `banana_madura`   | `banana_sobrepasada`      |
| Mango   | `mango_verde`   | `mango_maduro`    | `mango_sobrepasado`       |
| Naranja | `naranja_verde` | `naranja_madura`  | `naranja_sobrepasada`     |
| Tomate  | `tomate_verde`  | `tomate_maduro`   | `tomate_sobrepasado`      |

Además existe la clase `defecto`, que marca las zonas dañadas de la fruta.

La versión actual (v4) es un ajuste fino de 30 épocas sobre la anterior (v3). Suma dos datasets públicos con defectos ya marcados (naranjas y tomates de `mcf-wascl/fruit-ptiqf`, y bananas golpeadas de `h2sagings-workspace/banana-uuiln`). Esos datasets marcan la fruta pero no su estado: el estado lo puso el modelo v3, y las fotos donde no estaba seguro se descartaron.

`best_v2.pt` es el modelo anterior y queda como **respaldo**: si `best.pt` no deja ninguna fruta después de los filtros, la misma foto se analiza con `best_v2.pt`.

### Resultados

Medido con `backend/evaluate.py` sobre las 69 fotos de `backend/tests/imagenes` (35 con fruta y 34 sin fruta). El detalle completo, con las matrices de confusión y los gráficos, está en [docs/evaluacion.md](docs/evaluacion.md).

| Variante | Fruta correcta | Fruta y estado | Fotos sin fruta rechazadas | Latencia media |
| --- | --- | --- | --- | --- |
| CLIP + respaldo (la que usa la app) | 34/35 | 30/35 | 34/34 | 212 ms |
| CLIP sin respaldo | 29/35 | 26/35 | 34/34 | 176 ms |
| Sin CLIP + respaldo | 23/35 | 21/35 | 24/34 | 183 ms |
| Sin CLIP ni respaldo | 19/35 | 17/35 | 25/34 | 129 ms |

Las latencias son de una notebook con CPU y cambian según el equipo.

Lo que todavía falla, y no se arregla con reglas:

- La clase `defecto` llega a mAP50 0,88 en validación, pero en las 6 fotos de prueba con manchas, sacadas de internet, no marca zonas. Hacen falta fotos propias con las manchas marcadas en Roboflow.
- La fruta pasada a veces sale como madura o verde (recall de "sobrepasado": 0,62).
- Un mango fotografiado muy de cerca puede salir como naranja.

### Cómo se calcula cada dato

- **Fruta y estado**: la clase con más superficie detectada, después de descartar las detecciones con poca confianza, muy chicas, con forma rectangular o que CLIP reconoce como otra cosa.
- **Confianza**: promedio de la confianza de las detecciones de esa clase.
- **% de imperfección**: superficie de las máscaras `defecto` que cae sobre la fruta, dividida por la superficie total de fruta.
- **Calibre, embalaje y vida útil**: el modelo no los entrega. Salen de reglas fijas por fruta y estado (`backend/app/rules.py`).
- **Recomendación logística**: regla según el estado y el nivel de imperfección (leve menos de 5 %, moderada hasta 12 %, elevada desde 12 %).

## Cómo levantar todo

### Con Docker (recomendado para la demo)

Requisitos: Docker con Compose 2.24 o superior.

```bash
cp .env.example .env        # opcional: solo si querés cambiar algo
docker compose up --build
```

- App: <http://localhost:8080>
- API y Swagger: <http://localhost:8000/docs>

El primer build tarda porque baja PyTorch para CPU y los pesos de CLIP. Después de eso el contenedor arranca sin internet. Los modelos `best.pt` y `best_v2.pt` se montan desde la raíz del proyecto en modo lectura, así que para cambiar de modelo alcanza con reemplazar el archivo y reiniciar.

El frontend espera a que el backend esté sano (`depends_on` con `service_healthy`). Antes de aceptar fotos, el backend carga los dos modelos y CLIP y hace una inferencia de prueba; en la notebook donde se probó eso tarda unos 5 segundos (sin Docker). El healthcheck le da hasta 2 minutos de margen.

Para probar la API desde la terminal:

```bash
curl http://localhost:8000/health
curl -F "file=@backend/tests/imagenes/positivas/tomate_maduro_01.jpg" -F lot_id=LOTE-1 http://localhost:8080/api/predict
```

### Sin Docker

Requisitos: Node.js 18 o superior y Python 3.11.

Backend, en una terminal:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate                     # en Linux o Mac: source .venv/bin/activate
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements-dev.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

La primera vez CLIP baja unos 600 MB de pesos. Si no hay internet, el servidor arranca igual sin CLIP y `/health` lo informa con `"status": "degradado"`.

Frontend, en otra terminal y en la raíz del proyecto:

```bash
npm install
npm run dev
```

La app manda las fotos a `/api` y Vite las pasa al backend en `http://localhost:8000`. Si el backend está en otra máquina, se cambia con la variable `BACKEND_URL` antes de `npm run dev`, o escribiendo la dirección en la pestaña **Sistema**.

Otros comandos: `npm run build` compila la PWA, `npm run preview` la sirve con el mismo proxy y `npm run lint` corre oxlint.

### Probar en el celular

El botón **Sacar foto** abre la cámara del teléfono con un `input` de archivo, que funciona también por HTTP en la red local: alcanza con abrir `http://<ip-de-la-compu>:8080`. Para instalar la PWA hace falta HTTPS; una opción es un túnel de Cloudflare:

```bash
npx --yes cloudflared tunnel --url http://localhost:8080
```

## La app

- **Analizar**: foto con la cámara, desde la galería o arrastrándola (en escritorio). También hay 8 fotos de prueba, incluida una pelota para mostrar el rechazo.
- **Resultado**: la foto con las máscaras de cada fruta (coloreadas por estado) y de las zonas dañadas, con capas que se prenden y apagan y control de opacidad. Al lado, la ficha con fruta, estado, confianza, imperfección, vida útil, recomendación, calibre y embalaje, y si la foto tiene más de una clase, cuánto ocupa cada una.
- **Cómo se decidió**: qué modelo respondió, qué descartaron los filtros, qué descartó o corrigió CLIP y la lista de detecciones descartadas con su motivo. Sale de `verification` y del modo `debug` de `/predict`.
- **Historial**: queda en el dispositivo, con filtros por lote, estado y fruta, y exportación a Excel.
- **Sistema**: estado del servidor, dirección del backend, clases y umbrales activos del modelo, y créditos.

Casos límite con su propia pantalla: sin fruta, objeto que no es fruta (dice qué parece), varias frutas, foto oscura o movida, archivo que no es imagen, imagen dañada o demasiado grande, servidor caído, demora excesiva y sin internet. Con el servidor caído o sin conexión, las fotos de prueba ofrecen el **resultado guardado**: lo que el modelo respondió con esa misma foto cuando se generaron las muestras, marcado como tal.

## Backend (FastAPI)

### Endpoints

La documentación completa, con modelos de respuesta y ejemplos, está en `/docs` (Swagger).

| Método | Ruta | Qué hace |
| --- | --- | --- |
| `GET` | `/health` | Estado del servidor, si CLIP cargó y si hay respaldo |
| `GET` | `/model/info` | Clases y versión de los modelos, umbrales activos, configuración de CLIP y límites |
| `POST` | `/predict` | Analiza una foto (`multipart/form-data`, campos `file` y `lot_id`). Con `?debug=true` suma las detecciones descartadas |

Errores de `/predict`. Todos traen `detail` (mensaje para la app), `code` y `hint`:

| Código | `code` | Cuándo |
| --- | --- | --- |
| 400 | `imagen_corrupta`, `imagen_chica`, `archivo_vacio`, `solicitud_invalida` | La imagen no se puede abrir, es muy chica, llegó vacía o falta el archivo |
| 413 | `archivo_muy_grande`, `imagen_muy_grande` | Pesa más de `MAX_UPLOAD_MB` o tiene más de `MAX_PIXELS` píxeles |
| 415 | `no_es_imagen`, `formato_no_soportado` | No es una imagen, o es HEIC/AVIF |
| 422 | `sin_fruta` | No quedó ninguna fruta. `reason` dice por qué: `sin_deteccion`, `no_es_fruta`, `muy_chica`, `forma` o `confianza_baja` |

Cada respuesta trae `elapsed_ms` en el cuerpo y el encabezado `X-Process-Time-Ms`. También trae `quality` con el brillo y la nitidez de la foto, y avisa si está oscura o movida. Ese aviso no cambia el resultado del modelo.

Las coordenadas de `box` y de los polígonos van normalizadas entre 0 y 1, respecto de la imagen ya girada según el EXIF.

### Verificación con CLIP

Al arrancar, el backend carga CLIP (ViT-B-32, pesos `laion2b_s34b_b79k`). Recorta cada fruta detectada con un 10 % de margen y la compara contra textos de las cuatro frutas, de otras frutas y verduras (manzana, limón, pera, frutilla, calabaza, morrón, papa, cebolla, etc.) y de objetos (techo, pared, pelota, cara, caja, etc.).

- Si gana otra cosa, la detección se descarta.
- Si gana otra de las cuatro frutas con más de `CLIP_SWAP`, se corrige la fruta y se mantiene el estado.
- Mandarina y pomelo cuentan como naranja, y papaya y durazno como mango, porque CLIP no los distingue bien.
- Revisa solo las 6 detecciones más grandes; el resto sigue lo que se decidió para su misma clase.

### Variables de entorno

Todas están explicadas en [.env.example](.env.example).

| Variable | Por defecto | Para qué sirve |
| --- | --- | --- |
| `MODEL_PATH` | `../best.pt` | Modelo principal |
| `MODEL_VERSION` | `v4` | Versión que informa `/model/info` |
| `FALLBACK_MODEL_PATH` | `../best_v2.pt` | Modelo de respaldo. Con `none` se apaga |
| `CONF_THRESHOLD` | `0.25` con CLIP, `0.5` sin CLIP | Confianza mínima para aceptar una fruta |
| `CONF_BANANA`, `CONF_MANGO`, `CONF_NARANJA`, `CONF_TOMATE` | igual que `CONF_THRESHOLD` (mango `0.6` sin CLIP) | Umbral propio de cada fruta |
| `DEFECT_CONF` | `0.25` | Confianza mínima de una zona dañada |
| `MIN_AREA` | `0.01` | Superficie mínima de una fruta (1 % de la foto) |
| `MIN_CLUSTER` | `0.05` | Si 3 o más frutas chicas juntas cubren este porcentaje, se conservan (racimos) |
| `MAX_FILL` | `0.93` | Si la máscara llena más que esto de su recuadro, se descarta (paredes, cajas) |
| `RED_SWAP` | `0.5` | Si una "naranja" tiene más que esta proporción de rojo, pasa a tomate |
| `CLIP_VERIFY` | `1` | `0` apaga CLIP |
| `CLIP_MARGIN` | `0.25` | Cuánto tiene que ganarle "otra cosa" a la fruta para descartarla |
| `CLIP_SWAP` | `0.6` | Seguridad mínima de CLIP para corregir la fruta |
| `CLIP_MAX_CROPS` | `6` | Recortes que revisa CLIP por foto |
| `MAX_UPLOAD_MB` | `10` | Peso máximo de la foto |
| `MAX_PIXELS` | `40000000` | Píxeles máximos de la foto |
| `MAX_SIDE` | `1600` | Lado máximo con el que se analiza la foto |
| `WARMUP` | `1` | Inferencia de prueba al arrancar |
| `ALLOWED_ORIGINS` | `*` | CORS |
| `FRONTEND_PORT`, `BACKEND_PORT` | `8080`, `8000` | Puertos de Docker Compose |

### Tests y evaluación

```bash
cd backend
python -m pytest                       # 15 tests de la API
python evaluate.py                     # las 4 variantes, tablas en docs/evaluacion.md y gráficos en docs/figuras/
python evaluate.py --sin-variantes     # solo la configuración principal
python evaluate.py otro_modelo.pt      # otro modelo
python evaluate.py --conf mango=0.6    # cambiar un umbral (se puede repetir)
python scripts/generar_muestras.py     # vuelve a generar las fotos de prueba y sus resultados guardados
```

Los nombres de las fotos con fruta empiezan con `fruta_estado_` (por ejemplo `naranja_sobrepasada_01.jpg`) y, si llevan `manchas`, se esperan zonas dañadas. Las fuentes y licencias están en `backend/tests/imagenes/FUENTES.md`.

## Estructura

```text
.
├── best.pt                         # Modelo YOLO11s-seg (v4)
├── best_v2.pt                      # Modelo de respaldo (v2)
├── docker-compose.yml              # Backend y frontend
├── Dockerfile                      # Frontend: compila con Node y sirve con Nginx
├── nginx/default.conf.template     # Nginx: archivos de la app y proxy de /api al backend
├── .env.example                    # Todas las variables, explicadas
├── backend/
│   ├── Dockerfile                  # Python 3.11 slim, PyTorch CPU, CLIP incluido, usuario sin privilegios
│   ├── app/
│   │   ├── main.py                 # Crea la app, carga los modelos al arrancar
│   │   ├── config.py               # Variables de entorno
│   │   ├── models.py               # Carga de YOLO, respaldo y CLIP
│   │   ├── engine.py               # Pipeline: detección, filtros, CLIP, respaldo y armado de la respuesta
│   │   ├── clip_verifier.py        # Textos y verificación con CLIP
│   │   ├── postprocess.py          # Polígonos, recortes y color
│   │   ├── images.py               # Validación de la foto y avisos de calidad
│   │   ├── rules.py                # Calibre, embalaje, vida útil y recomendación
│   │   ├── labels.py               # Nombres de clases
│   │   ├── schemas.py              # Modelos Pydantic de Swagger
│   │   ├── errors.py               # Formato de los errores
│   │   └── routers/                # /predict, /health y /model/info
│   ├── tests/                      # Tests con pytest y fotos de prueba (imagenes/)
│   ├── scripts/generar_muestras.py # Fotos de prueba de la app y sus resultados guardados
│   ├── evaluate.py                 # Métricas y gráficos
│   ├── requirements.txt            # Dependencias del servidor
│   ├── requirements-dev.txt        # Más pytest, httpx y matplotlib
│   └── sacred_fruit_reentrenamiento.ipynb
├── docs/
│   ├── evaluacion.md               # Última evaluación completa
│   └── figuras/                    # Matrices de confusión, F1, variantes y latencia
├── public/
│   ├── muestras/                   # Fotos de prueba y muestras.json
│   └── sacred-apple*.png, favicon* # Íconos de la PWA
├── scripts/generate-icons.mjs      # Regenera los íconos de la PWA
└── src/
    ├── App.tsx                     # Fases del análisis y pestañas
    ├── components/                 # Visor, máscaras, ficha, decisión, avisos, historial, sistema, etiqueta
    ├── lib/                        # Estilos de estado y estado del servidor
    ├── services/                   # API, preparación de la foto, historial y Excel
    └── types/
```

## Tecnologías y créditos

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4 y `vite-plugin-pwa`. Excel con `xlsx` (SheetJS).
- **Backend**: FastAPI, Ultralytics YOLO, OpenCLIP y PyTorch para CPU.
- **Tipografías**: Bricolage Grotesque, Atkinson Hyperlegible Next y Spline Sans Mono (SIL Open Font License), incluidas en la app con Fontsource, así que funcionan sin internet.
- **Íconos**: [Uicons de Flaticon](https://www.flaticon.es/uicons), estilo bold rounded. La licencia pide atribución; está en el pie de la app y en la pestaña Sistema.
- **Fotos de prueba**: Wikimedia Commons, con autor y licencia en `backend/tests/imagenes/FUENTES.md` y en la pestaña Sistema.
