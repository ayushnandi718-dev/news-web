export interface EditorialIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
}

/**
 * Editorial quality gate — validates an article before it can be published.
 * Returns structured issues with field references and severity.
 */
export function editorialQualityCheck(article: {
  title?: string | null;
  slug?: string | null;
  excerpt?: string | null;
  content?: string | null;
  featuredImage?: string | null;
  categoryId?: string | null;
  authorId?: string | null;
  sourceUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  geographicScope?: string | null;
}): EditorialIssue[] {
  const issues: EditorialIssue[] = [];

  if (!article.title || article.title.trim().length < 10) {
    issues.push({ field: "title", message: "Title must be at least 10 characters", severity: "error" });
  }
  if (!article.slug) {
    issues.push({ field: "slug", message: "Slug is missing", severity: "error" });
  }
  if (!article.excerpt || article.excerpt.trim().length < 20) {
    issues.push({ field: "excerpt", message: "Excerpt must be at least 20 characters (shown on cards and social previews)", severity: "error" });
  }
  if (!article.content || article.content.trim().length < 100) {
    const len = article.content?.trim().length || 0;
    issues.push({ field: "content", message: `Content must be at least 100 characters (currently ${len})`, severity: "error" });
  }
  if (!article.categoryId) {
    issues.push({ field: "categoryId", message: "Category is required", severity: "error" });
  }
  if (!article.featuredImage) {
    issues.push({ field: "featuredImage", message: "No featured image — article cards will appear without a thumbnail", severity: "warning" });
  }
  if (!article.seoTitle) {
    issues.push({ field: "seoTitle", message: "No SEO title — will default to article headline", severity: "warning" });
  }
  if (!article.seoDescription) {
    issues.push({ field: "seoDescription", message: "No SEO description — will default to excerpt", severity: "warning" });
  }
  const contentWords = (article.content || "").trim().split(/\s+/).filter(Boolean).length;
  if (contentWords < 50) {
    issues.push({ field: "content", message: `Article is very short (${contentWords} words) — consider expanding`, severity: "warning" });
  }
  if (article.title && article.title.trim().length > 150) {
    issues.push({ field: "title", message: `Title is very long (${article.title.trim().length} chars) — may be truncated in search results`, severity: "warning" });
  }

  return issues;
}
