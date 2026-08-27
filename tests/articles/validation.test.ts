import { describe, it, expect } from "vitest";
import {
  createArticleSchema,
  updateArticleSchema,
  loginSchema,
  adCreateSchema,
  adUpdateSchema,
  breakingSchema,
  liveStreamCreateSchema,
  sourceSchema,
  categorySchema,
  tagSchema,
  userCreateSchema,
  commentSchema,
  passwordResetConfirmSchema,
  advertiseRequestSchema,
} from "@/lib/validation";

describe("createArticleSchema", () => {
  const valid = {
    title: "This is a valid article title that is long enough",
    excerpt: "This is a valid excerpt that is at least ten characters",
    content: "This is the article body content that needs to be at least thirty characters long.",
    categoryId: "cat-123",
  };

  it("accepts valid input", () => {
    const result = createArticleSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects title shorter than 6 chars", () => {
    const result = createArticleSchema.safeParse({ ...valid, title: "Short" });
    expect(result.success).toBe(false);
  });

  it("rejects title longer than 220 chars", () => {
    const result = createArticleSchema.safeParse({ ...valid, title: "x".repeat(221) });
    expect(result.success).toBe(false);
  });

  it("rejects excerpt shorter than 10 chars", () => {
    const result = createArticleSchema.safeParse({ ...valid, excerpt: "Short" });
    expect(result.success).toBe(false);
  });

  it("rejects content shorter than 30 chars", () => {
    const result = createArticleSchema.safeParse({ ...valid, content: "Too short" });
    expect(result.success).toBe(false);
  });

  it("defaults status to DRAFT", () => {
    const result = createArticleSchema.safeParse(valid);
    expect(result.success && result.data.status).toBe("DRAFT");
  });

  it("accepts valid featuredImage URL", () => {
    const result = createArticleSchema.safeParse({
      ...valid,
      featuredImage: "https://example.com/image.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("accepts relative featuredImage path", () => {
    const result = createArticleSchema.safeParse({
      ...valid,
      featuredImage: "/uploads/2026/08/photo.webp",
    });
    expect(result.success).toBe(true);
  });

  it("accepts tags array", () => {
    const result = createArticleSchema.safeParse({
      ...valid,
      tags: ["politics", "local"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects more than 8 tags", () => {
    const result = createArticleSchema.safeParse({
      ...valid,
      tags: Array.from({ length: 9 }, (_, i) => `tag${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("accepts geographicScope", () => {
    const result = createArticleSchema.safeParse({
      ...valid,
      geographicScope: "NATIONAL",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateArticleSchema", () => {
  it("accepts empty update (no fields)", () => {
    const result = updateArticleSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts action field", () => {
    const result = updateArticleSchema.safeParse({ action: "publish" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid action", () => {
    const result = updateArticleSchema.safeParse({ action: "invalid_action" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid actions", () => {
    const actions = [
      "publish", "unpublish", "feature", "unfeature",
      "mark_breaking", "remove_breaking", "archive", "restore",
      "submit_review", "approve", "reject",
    ];
    for (const action of actions) {
      const result = updateArticleSchema.safeParse({ action });
      expect(result.success).toBe(true);
    }
  });

  it("accepts override boolean", () => {
    const result = updateArticleSchema.safeParse({ override: true });
    expect(result.success).toBe(true);
  });

  it("accepts isFeatured boolean", () => {
    const result = updateArticleSchema.safeParse({ isFeatured: true });
    expect(result.success).toBe(true);
  });

  it("accepts all optional metadata fields", () => {
    const result = updateArticleSchema.safeParse({
      title: "Updated headline that is long enough",
      slug: "updated-headline",
      excerpt: "An updated excerpt that is at least ten characters",
      content: "Updated content that is at least thirty characters long for the validation.",
      featuredImage: "/uploads/img.webp",
      categoryId: "cat-456",
      subcategoryId: "sub-789",
      regionId: "reg-123",
      imageCaption: "Image caption text",
      imageCredit: "Photo credit",
      ogImage: "/uploads/og.webp",
      seoTitle: "SEO title for search",
      seoDescription: "SEO description for social sharing and search results.",
      sourceNotes: "Internal notes about source",
      geographicPriority: 2,
      geographicScope: "REGIONAL",
      district: "Alipurduar",
      state: "West Bengal",
      country: "India",
      isFeatured: true,
      editorialPriority: 3,
      tags: ["politics", "local"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts nullable fields as null", () => {
    const result = updateArticleSchema.safeParse({
      subcategoryId: null,
      regionId: null,
      featuredImage: null,
      seoTitle: null,
      seoDescription: null,
      ogImage: null,
      district: null,
      state: null,
      country: null,
      sourceNotes: null,
      imageCaption: null,
      imageCredit: null,
      scheduledAt: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty strings for optional string fields", () => {
    const result = updateArticleSchema.safeParse({
      excerpt: "Valid excerpt that passes validation",
      content: "Valid content that passes the thirty character minimum.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts Bengali slug with combining marks", () => {
    const result = updateArticleSchema.safeParse({
      slug: "ছেলেকে-শাসনের",
    });
    expect(result.success).toBe(true);
  });

  it("rejects slug shorter than 3 chars", () => {
    const result = updateArticleSchema.safeParse({ slug: "ab" });
    expect(result.success).toBe(false);
  });

  it("accepts a save-only payload (no action field)", () => {
    const result = updateArticleSchema.safeParse({
      title: "Just saving changes to this article",
      slug: "just-saving-changes",
      excerpt: "This is an excerpt that is long enough to pass.",
      content: "This is content that passes the minimum length requirement.",
      categoryId: "cat-123",
    });
    expect(result.success).toBe(true);
  });

  it("does not require excerpt or content on PATCH (optional)", () => {
    const result = updateArticleSchema.safeParse({
      title: "Only title change to an article",
    });
    expect(result.success).toBe(true);
  });
});

describe("adCreateSchema", () => {
  const valid = {
    internalName: "Test Ad Campaign",
  };

  it("accepts minimal valid input", () => {
    const result = adCreateSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects internalName shorter than 2 chars", () => {
    const result = adCreateSchema.safeParse({ internalName: "A" });
    expect(result.success).toBe(false);
  });

  it("defaults to DRAFT status", () => {
    const result = adCreateSchema.safeParse(valid);
    expect(result.success && result.data.status).toBe("DRAFT");
  });

  it("accepts payment fields", () => {
    const result = adCreateSchema.safeParse({
      ...valid,
      paymentStatus: "PAID",
      paymentDate: new Date().toISOString(),
      paymentNotes: "Paid via UPI",
    });
    expect(result.success).toBe(true);
  });
});

describe("breakingSchema", () => {
  it("accepts valid breaking input", () => {
    const result = breakingSchema.safeParse({ articleId: "art-123" });
    expect(result.success).toBe(true);
  });

  it("defaults minutes to 120", () => {
    const result = breakingSchema.safeParse({ articleId: "art-123" });
    expect(result.success && result.data.minutes).toBe(120);
  });

  it("rejects minutes < 5", () => {
    const result = breakingSchema.safeParse({ articleId: "art-123", minutes: 3 });
    expect(result.success).toBe(false);
  });

  it("rejects minutes > 720", () => {
    const result = breakingSchema.safeParse({ articleId: "art-123", minutes: 721 });
    expect(result.success).toBe(false);
  });
});

describe("liveStreamCreateSchema", () => {
  it("accepts valid live stream", () => {
    const result = liveStreamCreateSchema.safeParse({
      title: "Breaking News Live",
      url: "https://facebook.com/live/video123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid URL", () => {
    const result = liveStreamCreateSchema.safeParse({
      title: "Test",
      url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts platform enum", () => {
    const result = liveStreamCreateSchema.safeParse({
      title: "YouTube Live",
      url: "https://youtube.com/watch?v=abc",
      platform: "YOUTUBE",
    });
    expect(result.success).toBe(true);
  });
});

describe("sourceSchema", () => {
  it("accepts valid RSS source", () => {
    const result = sourceSchema.safeParse({
      name: "Test News RSS",
      url: "https://example.com/rss",
      type: "RSS",
    });
    expect(result.success).toBe(true);
  });

  it("defaults pollIntervalMinutes to 15", () => {
    const result = sourceSchema.safeParse({
      name: "Test Source",
      url: "https://example.com/feed",
    });
    expect(result.success && result.data.pollIntervalMinutes).toBe(15);
  });
});

describe("categorySchema", () => {
  it("accepts valid category", () => {
    const result = categorySchema.safeParse({ name: "Alipurduar" });
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 chars", () => {
    const result = categorySchema.safeParse({ name: "A" });
    expect(result.success).toBe(false);
  });

  it("accepts priority", () => {
    const result = categorySchema.safeParse({ name: "Sports", priority: 10 });
    expect(result.success).toBe(true);
  });
});

describe("userCreateSchema", () => {
  it("accepts valid user", () => {
    const result = userCreateSchema.safeParse({
      email: "reporter@newsroom.local",
      name: "Test Reporter",
      password: "securepass123",
      role: "REPORTER",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short password", () => {
    const result = userCreateSchema.safeParse({
      email: "test@example.com",
      name: "Test",
      password: "short",
      role: "REPORTER",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = userCreateSchema.safeParse({
      email: "test@example.com",
      name: "Test",
      password: "securepass123",
      role: "SUPERADMIN",
    });
    expect(result.success).toBe(false);
  });
});

describe("commentSchema", () => {
  it("accepts valid comment", () => {
    const result = commentSchema.safeParse({
      authorName: "Reader Name",
      body: "Great article!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short body", () => {
    const result = commentSchema.safeParse({
      authorName: "Reader",
      body: "Hi",
    });
    expect(result.success).toBe(false);
  });

  it("accepts parentId for replies", () => {
    const result = commentSchema.safeParse({
      authorName: "Reader",
      body: "I agree with this comment",
      parentId: "comment-123",
    });
    expect(result.success).toBe(true);
  });
});

describe("advertiseRequestSchema", () => {
  it("accepts valid request", () => {
    const result = advertiseRequestSchema.safeParse({
      name: "Business Owner",
      email: "business@example.com",
      message: "I want to advertise my shop in Alipurduar",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short message", () => {
    const result = advertiseRequestSchema.safeParse({
      name: "Business",
      email: "b@example.com",
      message: "Ad",
    });
    expect(result.success).toBe(false);
  });

  it("honeypot website field must be empty", () => {
    const result = advertiseRequestSchema.safeParse({
      name: "Bot",
      email: "bot@example.com",
      message: "I am a bot trying to spam",
      website: "https://spam.com",
    });
    expect(result.success).toBe(false);
  });
});

describe("passwordResetConfirmSchema", () => {
  it("accepts valid reset", () => {
    const result = passwordResetConfirmSchema.safeParse({
      token: "a".repeat(40),
      password: "newpassword123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short token", () => {
    const result = passwordResetConfirmSchema.safeParse({
      token: "short",
      password: "newpassword123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = passwordResetConfirmSchema.safeParse({
      token: "a".repeat(40),
      password: "short",
    });
    expect(result.success).toBe(false);
  });
});
