import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function isAllowedImage(mime: string): boolean {
  return mime in ALLOWED_MIME;
}

export function extFor(mime: string): string {
  return ALLOWED_MIME[mime] ?? "bin";
}

export async function saveUpload(buffer: Buffer, mime: string): Promise<{ url: string; filePath: string }> {
  const now = new Date();
  const yyyy = now.getUTCFullYear().toString();
  const mm = (now.getUTCMonth() + 1).toString().padStart(2, "0");
  const dir = path.join(UPLOAD_DIR, yyyy, mm);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}.${extFor(mime)}`;
  const filePath = path.join(dir, name);
  await writeFile(filePath, buffer);
  return { url: `/uploads/${yyyy}/${mm}/${name}`, filePath };
}

export async function deleteUploadByUrl(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) return;
  const rel = url.replace("/uploads/", "");
  const filePath = path.join(UPLOAD_DIR, rel);
  try {
    await unlink(filePath);
  } catch {}
}
