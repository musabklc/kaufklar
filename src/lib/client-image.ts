/** Im Browser auf max. `max` px verkleinern und als JPEG neu speichern – spart Upload und entfernt EXIF-Daten (z. B. GPS-Ort). */
export async function shrinkPhoto(file: File, max = 1600): Promise<File | null> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.82));
    return blob ? new File([blob], "foto.jpg", { type: "image/jpeg" }) : null;
  } catch {
    return null;
  }
}
