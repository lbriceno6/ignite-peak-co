// Client-side image normalization & WebP compression for catalog images.
// Goals:
//  - Square 1:1 canvas at consistent size
//  - Product centered, ~70-80% of area (when background is solid we can crop to bbox and pad)
//  - Output WebP (or PNG if transparent), target ≤ 250 KB, hard limit 400 KB

export type OptimizeOptions = {
  /** Output mime type. Use image/png to preserve transparency. */
  format?: "image/webp" | "image/png" | "image/jpeg";
  /** Output canvas size (square). */
  size?: number;
  /** Starting quality (0..1). Lowered iteratively until target size met. */
  quality?: number;
  /** Target file size in KB (soft). */
  targetKB?: number;
  /** Hard limit in KB. Will keep compressing past target until hit. */
  hardLimitKB?: number;
  /** If true, crop to product bounding box (detected by non-background pixels) and pad. */
  normalizeFrame?: boolean;
  /** Fraction of canvas the product should fill (0..1). */
  productFill?: number;
  /** Background fill color when output is opaque. */
  backgroundColor?: string;
  /** Treat near-white as background when normalizeFrame is true. */
  whiteBackground?: boolean;
};

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function detectBBox(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  whiteBg: boolean,
): { x: number; y: number; w: number; h: number } | null {
  const { data } = ctx.getImageData(0, 0, w, h);
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      let isFg = false;
      if (whiteBg) {
        // Non-white & opaque pixel
        const r = data[i], g = data[i + 1], b = data[i + 2];
        isFg = a > 16 && !(r > 240 && g > 240 && b > 240);
      } else {
        // Use alpha
        isFg = a > 16;
      }
      if (isFg) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), type, quality),
  );
}

/**
 * Normalize framing (optional) and compress to WebP/PNG within size budget.
 * Accepts data URLs or http(s) URLs (must be CORS-enabled).
 */
export async function optimizeForCatalog(
  src: string,
  opts: OptimizeOptions = {},
): Promise<{ blob: Blob; dataUrl: string; sizeKB: number; type: string }> {
  const {
    format = "image/webp",
    size = 1200,
    quality = 0.86,
    targetKB = 250,
    hardLimitKB = 400,
    normalizeFrame = true,
    productFill = 0.78,
    backgroundColor = "#FFFFFF",
    whiteBackground = true,
  } = opts;

  const img = await loadImage(src);

  // Step 1: draw original to a working canvas to detect bbox.
  const work = document.createElement("canvas");
  work.width = img.naturalWidth || img.width;
  work.height = img.naturalHeight || img.height;
  const wctx = work.getContext("2d")!;
  wctx.drawImage(img, 0, 0);

  let sx = 0, sy = 0, sw = work.width, sh = work.height;
  if (normalizeFrame) {
    try {
      const bbox = detectBBox(wctx, work.width, work.height, whiteBackground && format !== "image/png");
      if (bbox && bbox.w > 8 && bbox.h > 8) {
        sx = bbox.x; sy = bbox.y; sw = bbox.w; sh = bbox.h;
      }
    } catch {
      // Tainted canvas (CORS) — skip normalize.
    }
  }

  // Step 2: draw onto square canvas, scaled so the longer side equals productFill * size.
  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const octx = out.getContext("2d")!;
  if (format !== "image/png") {
    octx.fillStyle = backgroundColor;
    octx.fillRect(0, 0, size, size);
  }
  const maxSide = Math.max(sw, sh);
  const scale = (productFill * size) / maxSide;
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (size - dw) / 2;
  const dy = (size - dh) / 2;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(work, sx, sy, sw, sh, dx, dy, dw, dh);

  // Step 3: iteratively compress until under hardLimitKB (aim for targetKB).
  let q = quality;
  let blob = await canvasToBlob(out, format, q);
  let sizeKB = blob.size / 1024;
  // Bring under target first.
  while (sizeKB > targetKB && q > 0.5) {
    q -= 0.06;
    blob = await canvasToBlob(out, format, q);
    sizeKB = blob.size / 1024;
  }
  // Hard limit fallback.
  while (sizeKB > hardLimitKB && q > 0.35) {
    q -= 0.05;
    blob = await canvasToBlob(out, format, q);
    sizeKB = blob.size / 1024;
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

  return { blob, dataUrl, sizeKB, type: blob.type || format };
}
