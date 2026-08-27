export function sanitizeNext(raw: string | null | undefined): string {
  if (!raw) return "/admin";
  if (!raw.startsWith("/admin") || raw.startsWith("//admin") || raw.includes("\\")) return "/admin";
  return raw;
}
