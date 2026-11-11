/** Öffentliche Adresse der Seite (Vercel setzt VERCEL_PROJECT_PRODUCTION_URL automatisch). */
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000";
