export function sessionSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "dev-secret-change-me";
  return new TextEncoder().encode(secret.padEnd(32, "0"));
}
