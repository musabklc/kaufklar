/** Vercel nimmt pro Anfrage höchstens 4,5 MB an – alle Bilder zusammen müssen darunter bleiben. */
export const MAX_UPLOAD_BYTES = 4_000_000;

/** Verkleinert Fotos im Browser (längste Seite max. 2400 px, JPEG) – Screenshots bleiben lesbar, der Upload klein. */
export async function compressImage(file: File): Promise<File> {
  const MAX = 2400;
  if (file.size < 500_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : file;
  } catch {
    return file; // Server prüft Größe und Format ohnehin
  }
}
