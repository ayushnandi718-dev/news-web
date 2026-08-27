import { describe, it, expect } from "vitest";
import {
  thumbUrlFromOriginal,
  isAllowedImage,
  extFor,
  MAX_UPLOAD_BYTES,
} from "@/lib/storage";

describe("isAllowedImage", () => {
  it("allows jpeg, png, webp, avif, gif", () => {
    expect(isAllowedImage("image/jpeg")).toBe(true);
    expect(isAllowedImage("image/png")).toBe(true);
    expect(isAllowedImage("image/webp")).toBe(true);
    expect(isAllowedImage("image/avif")).toBe(true);
    expect(isAllowedImage("image/gif")).toBe(true);
  });

  it("rejects non-image types", () => {
    expect(isAllowedImage("application/pdf")).toBe(false);
    expect(isAllowedImage("text/html")).toBe(false);
    expect(isAllowedImage("image/svg+xml")).toBe(false);
    expect(isAllowedImage("")).toBe(false);
  });
});

describe("extFor", () => {
  it("returns correct extension", () => {
    expect(extFor("image/jpeg")).toBe("jpg");
    expect(extFor("image/png")).toBe("png");
    expect(extFor("image/webp")).toBe("webp");
    expect(extFor("image/avif")).toBe("avif");
    expect(extFor("image/gif")).toBe("gif");
  });

  it("returns bin for unknown mime", () => {
    expect(extFor("image/svg+xml")).toBe("bin");
    expect(extFor("application/pdf")).toBe("bin");
  });
});

describe("MAX_UPLOAD_BYTES", () => {
  it("is 8 MB", () => {
    expect(MAX_UPLOAD_BYTES).toBe(8 * 1024 * 1024);
  });
});

describe("thumbUrlFromOriginal", () => {
  it("converts /uploads/2026/08/abc.webp → /uploads/2026/08/abc_thumb.webp", () => {
    expect(thumbUrlFromOriginal("/uploads/2026/08/abc.webp")).toBe(
      "/uploads/2026/08/abc_thumb.webp"
    );
  });

  it("works with jpg extension", () => {
    expect(thumbUrlFromOriginal("/uploads/2025/12/photo.jpg")).toBe(
      "/uploads/2025/12/photo_thumb.jpg"
    );
  });

  it("works with nested paths", () => {
    expect(thumbUrlFromOriginal("/uploads/2026/01/subfolder/image.png")).toBe(
      "/uploads/2026/01/subfolder/image_thumb.png"
    );
  });

  it("returns null for non-upload URLs", () => {
    expect(thumbUrlFromOriginal("https://example.com/image.webp")).toBeNull();
    expect(thumbUrlFromOriginal("/images/photo.webp")).toBeNull();
  });

  it("returns null for URLs without extension", () => {
    expect(thumbUrlFromOriginal("/uploads/2026/08/photo")).toBeNull();
  });

  it("handles filenames with multiple dots", () => {
    expect(thumbUrlFromOriginal("/uploads/2026/08/my.photo.v2.webp")).toBe(
      "/uploads/2026/08/my.photo.v2_thumb.webp"
    );
  });

  it("returns null for empty string", () => {
    expect(thumbUrlFromOriginal("")).toBeNull();
  });
});
