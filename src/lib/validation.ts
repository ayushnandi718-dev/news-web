import { z } from "zod";
import { ARTICLE_STATUSES } from "./config";

export const articleStatusSchema = z.enum(ARTICLE_STATUSES);

const imageUrlSchema = z
  .string()
  .url()
  .or(z.string().regex(/^\/\S+$/, "Must be a site-relative path starting with /"));

export const createArticleSchema = z.object({
  title: z.string().min(6).max(220),
  slug: z.string().min(3).max(120).regex(/^[\p{L}\p{N}-]+$/u).optional(),
  excerpt: z.string().min(10).max(500),
  content: z.string().min(30),
  featuredImage: imageUrlSchema.optional().nullable(),
  categoryId: z.string().min(1),
  subcategoryId: z.string().optional().nullable(),
  regionId: z.string().optional().nullable(),
  status: articleStatusSchema.default("DRAFT"),
  scheduledAt: z.coerce.date().optional().nullable(),
  isBreaking: z.boolean().default(false),
  breakingMinutes: z.number().int().min(5).max(720).optional(),
  isFeatured: z.boolean().default(false),
  editorialPriority: z.number().int().min(0).max(3).default(0),
  geographicPriority: z.number().int().min(0).max(3).default(0),
  geographicScope: z.enum(["LOCAL", "REGIONAL", "STATE", "NATIONAL", "INTERNATIONAL"]).default("LOCAL"),
  district: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  sourceName: z.string().max(120).optional().nullable(),
  sourceUrl: z.string().url().optional().nullable(),
  sourceNotes: z.string().max(500).optional().nullable(),
  imageCaption: z.string().max(300).optional().nullable(),
  imageCredit: z.string().max(120).optional().nullable(),
  seoTitle: z.string().max(220).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  ogImage: imageUrlSchema.optional().nullable(),
  tags: z.array(z.string().min(2).max(40)).max(8).default([]),
});

export const updateArticleSchema = z.object({
  title: z.string().min(6).max(220).optional(),
  slug: z.string().min(3).max(120).regex(/^[\p{L}\p{N}-]+$/u).optional(),
  excerpt: z.string().min(10).max(500).optional(),
  content: z.string().min(30).optional(),
  featuredImage: imageUrlSchema.nullable().optional(),
  categoryId: z.string().min(1).optional(),
  subcategoryId: z.string().optional().nullable(),
  regionId: z.string().optional().nullable(),
  action: z
    .enum([
      "publish",
      "unpublish",
      "feature",
      "unfeature",
      "mark_breaking",
      "remove_breaking",
      "archive",
      "restore",
      "submit_review",
      "approve",
      "reject",
    ])
    .optional(),
  breakingMinutes: z.number().int().min(5).max(720).optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
  editorialPriority: z.number().int().min(0).max(3).optional(),
  geographicPriority: z.number().int().min(0).max(3).optional(),
  geographicScope: z.enum(["LOCAL", "REGIONAL", "STATE", "NATIONAL", "INTERNATIONAL"]).optional(),
  district: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  sourceNotes: z.string().max(500).optional().nullable(),
  imageCaption: z.string().max(300).optional().nullable(),
  imageCredit: z.string().max(120).optional().nullable(),
  seoTitle: z.string().max(220).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  ogImage: imageUrlSchema.optional().nullable(),
  status: articleStatusSchema.optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const breakingSchema = z.object({
  articleId: z.string().min(1),
  minutes: z.number().int().min(5).max(720).default(120),
  priority: z.number().int().min(0).max(3).default(1),
});

export const breakingUpdateSchema = z.object({
  extendMinutes: z.number().int().min(1).max(720).optional(),
  priority: z.number().int().min(0).max(3).optional(),
  endNow: z.boolean().optional(),
});

export const sourceSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(["RSS", "API", "MANUAL"]).default("RSS"),
  url: z.string().url(),
  authorized: z.boolean().default(false),
  active: z.boolean().default(true),
  pollIntervalMinutes: z.number().int().min(5).max(1440).default(15),
  defaultCategorySlug: z.string().optional().nullable(),
});

export const inboxActionSchema = z.object({
  action: z.enum(["create_draft", "reject", "convert_duplicate"]),
  categoryId: z.string().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(2).max(60),
  slug: z.string().regex(/^[\p{L}\p{N}-]+$/u).optional(),
  description: z.string().max(300).optional().nullable(),
  priority: z.number().int().min(0).max(100).default(0),
  type: z.enum(["STANDARD", "SPORTS", "DATA", "SPECIAL"]).default("STANDARD"),
  parentId: z.string().optional().nullable(),
  freshnessOverrides: z
    .object({
      multiplier: z.number().positive().optional(),
      bands: z.record(z.number()).optional(),
    })
    .optional()
    .nullable(),
});

export const subcategorySchema = z.object({
  name: z.string().min(2).max(60),
  slug: z.string().regex(/^[\p{L}\p{N}-]+$/u).optional(),
  description: z.string().max(300).optional().nullable(),
  priority: z.number().int().min(0).max(100).default(0),
  categoryId: z.string().min(1),
});

export const regionSchema = z.object({
  name: z.string().min(2).max(60),
  slug: z.string().regex(/^[\p{L}\p{N}-]+$/u).optional(),
  type: z.enum(["TOWN", "DISTRICT", "DIVISION", "STATE", "COUNTRY", "CUSTOM"]).default("CUSTOM"),
  parentId: z.string().optional().nullable(),
  district: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  priority: z.number().int().min(0).max(100).default(0),
});

export const tagSchema = z.object({
  name: z.string().min(2).max(40),
  slug: z.string().regex(/^[\p{L}\p{N}-]+$/u).optional(),
});

export const userCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80),
  password: z.string().min(8),
  role: z.enum(["OWNER", "EDITOR_IN_CHIEF", "EDITOR", "REPORTER", "AUTHOR", "MODERATOR"]),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  role: z.enum(["OWNER", "EDITOR_IN_CHIEF", "EDITOR", "REPORTER", "AUTHOR", "MODERATOR"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export const commentSchema = z.object({
  authorName: z.string().min(2).max(60),
  body: z.string().min(3).max(2000),
  parentId: z.string().optional(),
});

export const mediaMetaSchema = z.object({
  alt: z.string().max(200).optional(),
  caption: z.string().max(300).optional(),
  credit: z.string().max(120).optional(),
});
