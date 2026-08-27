export type NewsroomItem = {
  id: string;
  type: "imported" | "article";
  title: string;
  status: string;
  image: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  sourceUrl?: string;
  sourceName?: string;
  sourceType?: string;
  slug?: string;
  excerpt?: string;
  views?: number;
  isBreaking?: boolean;
  isFeatured?: boolean;
  publishedAt?: string | null;
  authorName?: string | null;
};

export type TabId =
  | "all"
  | "new"
  | "drafts"
  | "review"
  | "approved"
  | "scheduled"
  | "published"
  | "archived";

export type TabDef = {
  id: TabId;
  label: string;
  filter: (item: NewsroomItem) => boolean;
};

export const TABS: TabDef[] = [
  { id: "all", label: "All", filter: () => true },
  {
    id: "new",
    label: "New",
    filter: (i) =>
      (i.type === "imported" && (i.status === "PENDING" || i.status === "DUPLICATE_CANDIDATE")) ||
      (i.type === "article" && i.status === "NEW"),
  },
  {
    id: "drafts",
    label: "Drafts",
    filter: (i) => i.type === "article" && i.status === "DRAFT",
  },
  {
    id: "review",
    label: "In Review",
    filter: (i) => i.type === "article" && i.status === "IN_REVIEW",
  },
  {
    id: "approved",
    label: "Approved",
    filter: (i) => i.type === "article" && i.status === "APPROVED",
  },
  {
    id: "scheduled",
    label: "Scheduled",
    filter: (i) => i.type === "article" && i.status === "SCHEDULED",
  },
  {
    id: "published",
    label: "Published",
    filter: (i) =>
      i.type === "article" &&
      (i.status === "PUBLISHED" || i.status === "OLDER"),
  },
  {
    id: "archived",
    label: "Archived",
    filter: (i) => i.type === "article" && i.status === "ARCHIVED",
  },
];

export function normalizeImported(raw: Record<string, unknown>): NewsroomItem {
  const src = (raw.source ?? {}) as Record<string, unknown>;
  return {
    id: String(raw.id),
    type: "imported",
    title: String(raw.title),
    status: String(raw.status ?? "PENDING"),
    image: (raw.imageUrl as string) ?? null,
    category: null,
    createdAt: String(raw.fetchedAt),
    updatedAt: String(raw.fetchedAt),
    sourceUrl: String(raw.url),
    sourceName: String(src.name ?? ""),
    sourceType: String(src.type ?? ""),
  };
}

export function normalizeArticle(raw: Record<string, unknown>): NewsroomItem {
  const cat = (raw.category ?? null) as Record<string, unknown> | null;
  const author = (raw.author ?? null) as Record<string, unknown> | null;
  return {
    id: String(raw.id),
    type: "article",
    title: String(raw.title),
    status: String(raw.status),
    image: (raw.featuredImage as string) ?? null,
    category: cat ? String(cat.name) : null,
    createdAt: String(raw.createdAt),
    updatedAt: String(raw.updatedAt),
    slug: String(raw.slug),
    excerpt: String(raw.excerpt ?? ""),
    views: typeof raw.views === "number" ? raw.views : 0,
    isBreaking: Boolean(raw.isBreaking),
    isFeatured: Boolean(raw.isFeatured),
    publishedAt: (raw.publishedAt as string) ?? null,
    authorName: author ? String(author.name) : null,
  };
}
