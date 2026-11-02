/** مسار ملف من مجلد public مع دعم GitHub Pages base path */
export function publicAsset(path: string): string {
  const normalized = path.replace(/^\//, "");
  return `${import.meta.env.BASE_URL}${normalized}`;
}
