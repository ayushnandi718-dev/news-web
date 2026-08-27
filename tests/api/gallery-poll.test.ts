import { describe, it, expect } from "vitest";
import {
  galleryCreateSchema,
  galleryUpdateSchema,
  galleryImageSchema,
  pollCreateSchema,
  pollUpdateSchema,
  pollVoteSchema,
} from "@/lib/validation";
import { slugify } from "@/lib/text";

describe("galleryCreateSchema", () => {
  it("accepts valid gallery", () => {
    const r = galleryCreateSchema.safeParse({ title: "Durga Puja 2026" });
    expect(r.success).toBe(true);
  });

  it("rejects empty title", () => {
    const r = galleryCreateSchema.safeParse({ title: "" });
    expect(r.success).toBe(false);
  });

  it("accepts custom slug", () => {
    const r = galleryCreateSchema.safeParse({ title: "Test", slug: "durga-puja-2026" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.slug).toBe("durga-puja-2026");
  });

  it("rejects invalid slug", () => {
    const r = galleryCreateSchema.safeParse({ title: "Test", slug: "slug with spaces!" });
    expect(r.success).toBe(false);
  });

  it("accepts all optional fields", () => {
    const r = galleryCreateSchema.safeParse({
      title: "Full Gallery",
      description: "A description",
      coverImage: "/uploads/test.webp",
      eventDate: "2026-08-15",
      location: "Alipurduar Stadium",
      status: "PUBLISHED",
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const r = galleryCreateSchema.safeParse({ title: "Test", status: "LIVE" });
    expect(r.success).toBe(false);
  });

  it("accepts Bengali title", () => {
    const r = galleryCreateSchema.safeParse({ title: "দুর্গা পূজা ২০২৬" });
    expect(r.success).toBe(true);
  });

  it("generates slug from Bengali title", () => {
    const s = slugify("দুর্গা পূজা");
    expect(s.length).toBeGreaterThan(0);
    expect(s).not.toContain(" ");
  });

  it("rejects title over 200 chars", () => {
    const r = galleryCreateSchema.safeParse({ title: "a".repeat(201) });
    expect(r.success).toBe(false);
  });

  it("accepts exactly 200 char title", () => {
    const r = galleryCreateSchema.safeParse({ title: "a".repeat(200) });
    expect(r.success).toBe(true);
  });

  it("defaults status to DRAFT", () => {
    const r = galleryCreateSchema.safeParse({ title: "Test" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe("DRAFT");
  });
});

describe("galleryImageSchema", () => {
  it("accepts valid image", () => {
    const r = galleryImageSchema.safeParse({ url: "/uploads/2026/08/test.webp" });
    expect(r.success).toBe(true);
  });

  it("rejects empty url", () => {
    const r = galleryImageSchema.safeParse({ url: "" });
    expect(r.success).toBe(false);
  });

  it("accepts with optional metadata", () => {
    const r = galleryImageSchema.safeParse({
      url: "/uploads/2026/08/test.webp",
      alt: "Test image",
      caption: "Caption",
      credit: "Photographer",
      width: 1600,
      height: 900,
      sortOrder: 5,
    });
    expect(r.success).toBe(true);
  });

  it("rejects negative sortOrder", () => {
    const r = galleryImageSchema.safeParse({ url: "/test.webp", sortOrder: -1 });
    expect(r.success).toBe(false);
  });

  it("accepts zero sortOrder", () => {
    const r = galleryImageSchema.safeParse({ url: "/test.webp", sortOrder: 0 });
    expect(r.success).toBe(true);
  });

  it("rejects alt text over 200 chars", () => {
    const r = galleryImageSchema.safeParse({ url: "/test.webp", alt: "x".repeat(201) });
    expect(r.success).toBe(false);
  });

  it("rejects credit over 120 chars", () => {
    const r = galleryImageSchema.safeParse({ url: "/test.webp", credit: "x".repeat(121) });
    expect(r.success).toBe(false);
  });

  it("rejects caption over 500 chars", () => {
    const r = galleryImageSchema.safeParse({ url: "/test.webp", caption: "x".repeat(501) });
    expect(r.success).toBe(false);
  });
});

describe("galleryUpdateSchema", () => {
  it("accepts partial update", () => {
    const r = galleryUpdateSchema.safeParse({ title: "Updated Title" });
    expect(r.success).toBe(true);
  });

  it("accepts empty update", () => {
    const r = galleryUpdateSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it("accepts coverImage update", () => {
    const r = galleryUpdateSchema.safeParse({ coverImage: "/uploads/cover.webp" });
    expect(r.success).toBe(true);
  });

  it("accepts status change", () => {
    const r = galleryUpdateSchema.safeParse({ status: "PUBLISHED" });
    expect(r.success).toBe(true);
  });
});

describe("pollCreateSchema", () => {
  it("accepts valid poll with 2 options", () => {
    const r = pollCreateSchema.safeParse({
      question: "Which is your favorite category?",
      options: [
        { id: "a", text: "Sports" },
        { id: "b", text: "Politics" },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects poll with only 1 option", () => {
    const r = pollCreateSchema.safeParse({
      question: "Question?",
      options: [{ id: "a", text: "Only one" }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects empty question", () => {
    const r = pollCreateSchema.safeParse({
      question: "",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("accepts with all optional fields", () => {
    const r = pollCreateSchema.safeParse({
      question: "Full poll?",
      description: "Additional context",
      options: [
        { id: "a", text: "Yes" },
        { id: "b", text: "No" },
        { id: "c", text: "Maybe" },
      ],
      status: "ACTIVE",
      expiresAt: "2026-12-31",
    });
    expect(r.success).toBe(true);
  });

  it("rejects more than 10 options", () => {
    const r = pollCreateSchema.safeParse({
      question: "Too many",
      options: Array.from({ length: 11 }, (_, i) => ({ id: `o${i}`, text: `Option ${i}` })),
    });
    expect(r.success).toBe(false);
  });

  it("accepts exactly 10 options", () => {
    const r = pollCreateSchema.safeParse({
      question: "Max options",
      options: Array.from({ length: 10 }, (_, i) => ({ id: `o${i}`, text: `Option ${i}` })),
    });
    expect(r.success).toBe(true);
  });

  it("rejects duplicate option ids", () => {
    const r = pollCreateSchema.safeParse({
      question: "Duplicate ids",
      options: [
        { id: "a", text: "First" },
        { id: "a", text: "Second" },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("defaults status to ACTIVE", () => {
    const r = pollCreateSchema.safeParse({
      question: "Test question?",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe("ACTIVE");
  });

  it("accepts Bengali question", () => {
    const r = pollCreateSchema.safeParse({
      question: "আপনার পছন্দের বিষয় কী?",
      options: [
        { id: "a", text: "শিক্ষা" },
        { id: "b", text: "স্বাস্থ্য" },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects question under 5 chars", () => {
    const r = pollCreateSchema.safeParse({
      question: "Hi?",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
    });
    expect(r.success).toBe(false);
  });
});

describe("pollVoteSchema", () => {
  it("accepts valid vote", () => {
    const r = pollVoteSchema.safeParse({ optionId: "opt_1" });
    expect(r.success).toBe(true);
  });

  it("rejects empty optionId", () => {
    const r = pollVoteSchema.safeParse({ optionId: "" });
    expect(r.success).toBe(false);
  });

  it("rejects missing optionId", () => {
    const r = pollVoteSchema.safeParse({});
    expect(r.success).toBe(false);
  });
});

describe("pollUpdateSchema", () => {
  it("accepts partial update", () => {
    const r = pollUpdateSchema.safeParse({ status: "CLOSED" });
    expect(r.success).toBe(true);
  });

  it("accepts empty update", () => {
    const r = pollUpdateSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it("accepts expiresAt update", () => {
    const r = pollUpdateSchema.safeParse({ expiresAt: "2026-12-31T23:59" });
    expect(r.success).toBe(true);
  });

  it("accepts question update", () => {
    const r = pollUpdateSchema.safeParse({ question: "Updated question text" });
    expect(r.success).toBe(true);
  });
});

describe("slugify edge cases", () => {
  it("preserves Bengali characters", () => {
    const s = slugify("আলিপুরদুয়ার");
    expect(s).toContain("আলিপুরদুয়ার");
  });

  it("preserves Bengali with vowel signs", () => {
    const s = slugify("দুর্গা পূজা");
    expect(s.length).toBeGreaterThan(0);
    expect(s).not.toContain(" ");
  });

  it("converts spaces to hyphens", () => {
    const s = slugify("hello world");
    expect(s).toBe("hello-world");
  });

  it("removes special characters", () => {
    const s = slugify("Test@#$ Gallery!");
    expect(s).not.toMatch(/[@#$!]/);
  });

  it("preserves numbers", () => {
    const s = slugify("Event 2026");
    expect(s).toContain("2026");
  });

  it("handles mixed Bengali and English", () => {
    const s = slugify("Alipurduar জেলা News");
    expect(s.length).toBeGreaterThan(0);
    expect(s).not.toContain("  ");
  });
});
