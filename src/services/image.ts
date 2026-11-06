export interface PreparedImage {
  previewUrl: string | null;
  upload: Blob;
  name: string;
}

const UPLOAD_MAX_SIDE = 1600;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen'));
    img.src = src;
  });
}

function drawScaled(img: HTMLImageElement, maxSide: number, quality: number): Promise<Blob | null> {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

// Si el navegador no puede abrir el archivo, se manda tal cual y el servidor dice qué tiene de malo.
export async function prepareFile(file: File): Promise<PreparedImage> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const big = Math.max(img.naturalWidth, img.naturalHeight) > UPLOAD_MAX_SIDE;
    const blob = big || file.size > 4 * 1024 * 1024 ? await drawScaled(img, UPLOAD_MAX_SIDE, 0.9) : null;
    const upload = blob ?? file;
    return { previewUrl: URL.createObjectURL(upload), upload, name: file.name || 'foto.jpg' };
  } catch {
    return { previewUrl: null, upload: file, name: file.name || 'archivo' };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function prepareUrl(url: string, name: string): Promise<PreparedImage> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudo cargar la muestra');
  const blob = await res.blob();
  return { previewUrl: URL.createObjectURL(blob), upload: blob, name };
}

export async function thumbnailDataUrl(src: string, maxSide = 640, quality = 0.78): Promise<string> {
  try {
    const img = await loadImage(src);
    const blob = await drawScaled(img, maxSide, quality);
    if (!blob) return '';
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}
