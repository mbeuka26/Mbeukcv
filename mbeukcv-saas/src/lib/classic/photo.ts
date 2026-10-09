/** Valide et normalise une data URL photo pour inclusion HTML. */
export function normalizePhotoDataUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const compact = value.trim().replace(/\s/g, '');
  if (compact.length > 2_800_000) return null;
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,[a-z0-9+/=]+$/i.test(compact)) return null;
  return compact;
}

export function photoImgTag(dataUrl: string | null | undefined, style: string): string {
  const safe = normalizePhotoDataUrl(dataUrl);
  if (!safe) return '';
  const attr = safe.replace(/"/g, '&quot;');
  return `<img src="${attr}" alt="" style="${style}">`;
}

/** Réduit la photo pour stockage / aperçu (évite iframe srcDoc trop lourd → écran blanc). */
export async function resizePhotoFile(file: File, maxEdge = 480): Promise<string | null> {
  if (!file.type.startsWith('image/') || file.size > 4_000_000) return null;
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('lecture impossible'));
    reader.readAsDataURL(file);
  });
  if (!dataUrl) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height, 1));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(normalizePhotoDataUrl(dataUrl));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(normalizePhotoDataUrl(canvas.toDataURL('image/jpeg', 0.88)));
    };
    img.onerror = () => resolve(normalizePhotoDataUrl(dataUrl));
    img.src = dataUrl;
  });
}
