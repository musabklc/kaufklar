import { z } from "zod";

type Json = { [k: string]: unknown };

/**
 * zod → JSON-Schema im von Gemini unterstützten Umfang.
 * Nullbare Enums werden zu nullbaren Strings mit Werteliste in der Beschreibung – sonst könnte das Modell
 * bei unbekannten Angaben nicht `null` liefern und würde gezwungen, einen Wert zu raten.
 */
export function toGeminiSchema(schema: z.ZodType): Json {
  const raw = z.toJSONSchema(schema) as Json;
  delete raw.$schema;
  return walk(raw) as Json;
}

function walk(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(walk);
  if (!node || typeof node !== "object") return node;
  const n = node as Json;
  const any = n.anyOf as Json[] | undefined;
  if (any?.length === 2 && any.some((a) => a.type === "null")) {
    const inner = walk(any.find((a) => a.type !== "null")) as Json;
    const out: Json = { ...inner, type: [inner.type, "null"] };
    if (inner.enum) {
      out.description = [n.description ?? inner.description, `Erlaubte Werte: ${(inner.enum as string[]).join(" | ")} oder null.`].filter(Boolean).join(" ");
      delete out.enum;
    } else if (n.description) out.description = n.description;
    return out;
  }
  return Object.fromEntries(Object.entries(n).map(([k, v]) => [k, walk(v)]));
}

/** Validiert die KI-Antwort; ungültige Enum-Werte werden zu `null` statt die ganze Antwort zu verwerfen. */
export function parseLenient<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> | null {
  const value = data;
  for (let i = 0; i < 10; i++) {
    const r = schema.safeParse(value);
    if (r.success) return r.data;
    const fixable = r.error.issues.filter((iss) => iss.code === "invalid_value" && iss.path.length);
    if (!fixable.length) return null;
    for (const iss of fixable) setPath(value, iss.path, null);
  }
  return null;
}

function setPath(obj: unknown, path: PropertyKey[], val: unknown) {
  let cur = obj as Record<PropertyKey, unknown>;
  for (const key of path.slice(0, -1)) cur = cur?.[key] as Record<PropertyKey, unknown>;
  if (cur) cur[path[path.length - 1]] = val;
}
