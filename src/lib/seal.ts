import { createHmac, timingSafeEqual } from "node:crypto";
import type { Vehicle } from "./types.ts";

/**
 * Siegel für ausgelesene Inseratsdaten: /api/extract unterschreibt die preisrelevanten Felder,
 * /api/analyze schreibt nur gesiegelte, unveränderte Daten in den Preisindex. Schutz vor erfundenen Preisen.
 */
const fields = (v: Vehicle) => [v.make, v.model, v.firstRegistration, v.mileageKm, v.powerKw, v.fuel, v.priceEur, v.listingUrl].map((x) => String(x ?? "")).join("|");

export function sealVehicle(v: Vehicle, secret: string): string {
  return createHmac("sha256", secret).update(fields(v)).digest("hex");
}

export function verifySeal(v: Vehicle, seal: string | null | undefined, secret: string): boolean {
  if (!seal || !/^[0-9a-f]{64}$/.test(seal)) return false;
  return timingSafeEqual(Buffer.from(seal, "hex"), Buffer.from(sealVehicle(v, secret), "hex"));
}

export const sealSecret = () => process.env.SEAL_SECRET || process.env.SUPABASE_SECRET_KEY || "";
