import { describe, it, expect } from "vitest";
import { editorialQualityCheck } from "@/lib/editorial-check";

const validArticle = {
  title: "Breaking news from Alipurduar about the floods",
  slug: "breaking-news-alipurduar-floods",
  excerpt: "Major flooding has been reported in multiple areas of Alipurduar district today.",
  content: "Heavy rainfall over the past three days has caused severe flooding in low-lying areas of Alipurduar. Residents have been evacuated to relief camps. The district administration has issued a red alert for the region. Water levels have risen significantly across multiple rivers in the Dooars region, threatening several villages and tea estates in the area. Emergency response teams have been deployed to the worst affected areas. Local authorities are coordinating relief operations with the help of disaster management teams. Schools and colleges in the affected areas have been temporarily closed as a precautionary measure.",
  featuredImage: "/uploads/2026/08/flood.webp",
  categoryId: "cat-123",
  authorId: "user-1",
  seoTitle: "Alipurduar Floods: Heavy Rain Causes Widespread Flooding",
  seoDescription: "Major flooding reported in Alipurduar district after three days of heavy rainfall.",
};

function messages(issues: { field: string; message: string; severity: string }[]) {
  return issues.map((i) => i.message);
}

describe("editorialQualityCheck", () => {
  it("passes for a well-formed article", () => {
    expect(editorialQualityCheck(validArticle)).toHaveLength(0);
  });

  it("fails when title is missing", () => {
    const msgs = messages(editorialQualityCheck({ ...validArticle, title: "" }));
    expect(msgs).toContainEqual(expect.stringContaining("Title"));
  });

  it("fails when title is too short", () => {
    const msgs = messages(editorialQualityCheck({ ...validArticle, title: "Short" }));
    expect(msgs).toContainEqual(expect.stringContaining("Title"));
  });

  it("fails when slug is missing", () => {
    const msgs = messages(editorialQualityCheck({ ...validArticle, slug: "" }));
    expect(msgs).toContainEqual(expect.stringContaining("Slug"));
  });

  it("fails when excerpt is missing", () => {
    const msgs = messages(editorialQualityCheck({ ...validArticle, excerpt: "" }));
    expect(msgs).toContainEqual(expect.stringContaining("Excerpt"));
  });

  it("fails when excerpt is too short", () => {
    const msgs = messages(editorialQualityCheck({ ...validArticle, excerpt: "Short" }));
    expect(msgs).toContainEqual(expect.stringContaining("Excerpt"));
  });

  it("fails when content is too short", () => {
    const msgs = messages(editorialQualityCheck({ ...validArticle, content: "Too short content" }));
    expect(msgs).toContainEqual(expect.stringContaining("Content"));
  });

  it("fails when content is empty", () => {
    const msgs = messages(editorialQualityCheck({ ...validArticle, content: "" }));
    expect(msgs).toContainEqual(expect.stringContaining("Content"));
  });

  it("fails when category is missing", () => {
    const msgs = messages(editorialQualityCheck({ ...validArticle, categoryId: "" }));
    expect(msgs).toContainEqual(expect.stringContaining("Category"));
  });

  it("warns when no featured image", () => {
    const issues = editorialQualityCheck({ ...validArticle, featuredImage: undefined });
    const msgs = messages(issues);
    expect(msgs).toContainEqual(expect.stringContaining("featured image"));
  });

  it("warns when no SEO title", () => {
    const issues = editorialQualityCheck({ ...validArticle, seoTitle: undefined });
    const msgs = messages(issues);
    expect(msgs).toContainEqual(expect.stringContaining("SEO title"));
  });

  it("warns when no SEO description", () => {
    const issues = editorialQualityCheck({ ...validArticle, seoDescription: undefined });
    const msgs = messages(issues);
    expect(msgs).toContainEqual(expect.stringContaining("SEO description"));
  });

  it("warns for very short articles", () => {
    const shortContent = "Word ".repeat(30);
    const issues = editorialQualityCheck({ ...validArticle, content: shortContent });
    const msgs = messages(issues);
    expect(msgs).toContainEqual(expect.stringContaining("very short"));
  });

  it("warns for very long titles", () => {
    const longTitle = "A".repeat(160);
    const issues = editorialQualityCheck({ ...validArticle, title: longTitle });
    const msgs = messages(issues);
    expect(msgs).toContainEqual(expect.stringContaining("very long"));
  });

  it("returns structured issues with field and severity", () => {
    const issues = editorialQualityCheck({ ...validArticle, title: "" });
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toHaveProperty("field");
    expect(issues[0]).toHaveProperty("message");
    expect(issues[0]).toHaveProperty("severity");
    expect(["error", "warning"]).toContain(issues[0].severity);
  });

  it("errors are severity 'error', warnings are 'warning'", () => {
    const issues = editorialQualityCheck({ ...validArticle, featuredImage: undefined });
    const imgIssue = issues.find((i) => i.field === "featuredImage");
    expect(imgIssue?.severity).toBe("warning");

    const errIssues = editorialQualityCheck({ ...validArticle, title: "" });
    expect(errIssues[0].severity).toBe("error");
  });

  it("passes with minimal valid fields (no blocking errors)", () => {
    const minimal = {
      title: "Valid headline that is long enough",
      slug: "valid-headline",
      excerpt: "This is a valid excerpt that is long enough to pass the quality check.",
      content: "This is valid content that is definitely long enough for the editor to accept it without any issues. We need at least fifty words to pass the quality check threshold so this article must contain more than just a few sentences. The additional text ensures we meet the editorial standards required for publishing on the platform.",
      categoryId: "cat-1",
      featuredImage: "/uploads/image.webp",
      seoTitle: "Valid headline",
      seoDescription: "A valid description.",
    };
    const issues = editorialQualityCheck(minimal);
    expect(issues).toHaveLength(0);
  });

  it("collects all issues at once", () => {
    const issues = editorialQualityCheck({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      categoryId: "",
    });
    expect(issues.length).toBeGreaterThanOrEqual(4);
  });

  it("warning-only issues have no severity 'error'", () => {
    const issues = editorialQualityCheck({
      title: "A valid article title that is long enough",
      slug: "valid-slug",
      excerpt: "This is a valid excerpt that is long enough.",
      content: "This is valid content that passes the minimum length requirement with ease. We need enough words to pass the fifty word threshold so let us write some more text here to ensure that.",
      categoryId: "cat-1",
      // Missing: featuredImage, seoTitle, seoDescription — all warnings
    });
    expect(issues.length).toBeGreaterThan(0);
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(0);
    const warnings = issues.filter((i) => i.severity === "warning");
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("missing title/excerpt/content/category are errors (blocking)", () => {
    const issues = editorialQualityCheck({
      title: "",
      slug: "some-slug",
      excerpt: "",
      content: "",
      categoryId: "",
    });
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors.length).toBeGreaterThanOrEqual(3);
    const errorFields = errors.map((i) => i.field);
    expect(errorFields).toContain("title");
    expect(errorFields).toContain("content");
    expect(errorFields).toContain("categoryId");
  });

  it("missing image/seo are warnings (non-blocking)", () => {
    const issues = editorialQualityCheck({
      title: "Valid headline long enough for quality",
      slug: "valid-headline",
      excerpt: "This excerpt is valid and long enough for the gate.",
      content: "This is valid article content that is well over the minimum required length and has more than fifty words to pass the word count warning threshold as well.",
      categoryId: "cat-1",
    });
    const errors = issues.filter((i) => i.severity === "error");
    const warnings = issues.filter((i) => i.severity === "warning");
    expect(errors).toHaveLength(0);
    expect(warnings.length).toBeGreaterThanOrEqual(0);
  });

  it("returns empty array for a perfect article (no errors, no warnings)", () => {
    const issues = editorialQualityCheck(validArticle);
    expect(issues).toHaveLength(0);
  });
});
