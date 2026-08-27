import { z } from "zod";
import { ARTICLE_STATUSES } from "./config";

export const articleStatusSchema = z.enum(ARTICLE_STATUSES);

const imageUrlSchema = z
  .string()
  .url()
  .or(z.string().regex(/^\/\S+$/, "Must be a site-relative path starting with /"));

export const createArticleSchema = z.object({
  title: z.string().min(6).max(220),
  slug: z.string().min(3).max(120).regex(/^[\p{L}\p{M}\p{N}-]+$/u).optional(),
  excerpt: z.string().min(10).max(500),
  content: z.string().min(30).max(100_000),
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
  slug: z.string().min(3).max(120).regex(/^[\p{L}\p{M}\p{N}-]+$/u).optional(),
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
  isFeatured: z.boolean().optional(),
  editorialPriority: z.number().int().min(0).max(3).optional(),
  geographicPriority: z.number().int().min(0).max(3).optional(),
  geographicScope: z.enum(["LOCAL", "REGIONAL", "STATE", "NATIONAL", "INTERNATIONAL"]).optional(),
  district: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  /** Publish truncated imports despite the editorial gate (OWNER-level escape hatch). */
  override: z.boolean().optional(),
  country: z.string().max(100).optional().nullable(),
  sourceNotes: z.string().max(500).optional().nullable(),
  imageCaption: z.string().max(300).optional().nullable(),
  imageCredit: z.string().max(120).optional().nullable(),
  seoTitle: z.string().max(220).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  ogImage: imageUrlSchema.optional().nullable(),
  status: articleStatusSchema.optional(),
  tags: z.array(z.string().min(2).max(40)).max(8).optional(),
});

export const AD_PLACEMENTS = ["HOME_TOP", "HOME_SIDEBAR", "CATEGORY_TOP", "OTHER"] as const;
export const AD_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "PENDING_PAYMENT",
  "PAID",
  "APPROVED",
  "ACTIVE",
  "PAUSED",
  "EXPIRED",
  "REJECTED",
] as const;
export const AD_TYPES = [
  "HOME_BANNER",
  "CATEGORY_BANNER",
  "SPONSORED_NEWS",
  "BREAKING_TICKER",
  "LIVE_STREAM_SPONSORSHIP",
  "SOCIAL_MEDIA_PROMOTION",
] as const;
export const AD_SIZES = ["SMALL", "MEDIUM", "LARGE", "FULL_WIDTH"] as const;

export const adCreateSchema = z.object({
  internalName: z.string().trim().min(2).max(120),
  slug: z.string().min(2).max(120).regex(/^[\p{L}\p{M}\p{N}-]+$/u).optional(),
  advertiserName: z.string().trim().max(120).default(""),
  businessName: z.string().trim().max(160).optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().trim().max(24).optional().nullable(),
  title: z.string().trim().max(160).default(""),
  description: z.string().max(20000).default(""),
  imageUrl: z
    .string()
    .max(4000)
    .refine((v) => v === "" || /^https?:\/\/\S+/.test(v) || /^\/\S+/.test(v), "Invalid url")
    .optional()
    .nullable(),
  destinationUrl: z
    .string()
    .max(4000)
    .refine((v) => v === "" || /^https?:\/\/\S+/.test(v) || /^\/\S+/.test(v), "Invalid url")
    .optional()
    .nullable(),
  type: z.enum(AD_TYPES).default("HOME_BANNER"),
  placement: z.enum(AD_PLACEMENTS).default("HOME_TOP"),
  size: z.enum(AD_SIZES).default("MEDIUM"),
  price: z.coerce.number().min(0).max(99_999_999).default(0),
  priority: z.number().int().min(0).max(9999).default(0),
  status: z.enum(AD_STATUSES).default("DRAFT"),
  startDate: z.coerce.date().nullish(),
  endDate: z.coerce.date().nullish(),
  requestId: z.string().cuid().optional().nullable(),
  paymentStatus: z.enum(["UNPAID", "PARTIAL", "PAID"]).default("UNPAID"),
  paymentDate: z.coerce.date().nullish(),
  paymentNotes: z.string().max(500).optional().nullable(),
});

export const adUpdateSchema = adCreateSchema.partial().extend({
  resetCounters: z.boolean().optional(),
  paymentStatus: z.enum(["UNPAID", "PARTIAL", "PAID"]).optional(),
  paymentDate: z.coerce.date().nullish(),
  paymentNotes: z.string().max(500).optional().nullable(),
});

export const advertiseRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  businessName: z.string().trim().max(160).optional().nullable(),
  email: z.string().email(),
  phone: z.string().trim().max(24).optional().nullable(),
  type: z.enum(AD_TYPES).default("HOME_BANNER"),
  message: z.string().trim().min(10).max(3000),
  bannerUrl: z.string().optional().nullable(),
  needsBannerDesign: z.coerce.boolean().default(false),
  website: z.string().max(0).optional(), // honeypot — must stay empty
});

export const adRequestStatusSchema = z.object({
  status: z.enum(["PENDING_REVIEW", "REVIEWED", "REJECTED"]),
});

export const pricingRowSchema = z.object({
  type: z.enum(AD_TYPES),
  placement: z.enum(AD_PLACEMENTS),
  size: z.enum(AD_SIZES),
  basePrice: z.coerce.number().min(0).max(99_999_999),
  active: z.boolean().default(true),
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

export const liveStreamCreateSchema = z.object({
  title: z.string().trim().min(2).max(200),
  url: z.string().url().max(2000),
  bannerUrl: z.string().url().max(4000).nullish(),
  platform: z.enum(["FACEBOOK", "YOUTUBE", "OTHER"]).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const liveStreamUpdateSchema = liveStreamCreateSchema.partial().extend({
  refetchMeta: z.boolean().optional(),
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
  action: z.enum(["create_draft", "reject", "convert_duplicate", "publish"]),
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

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(20).max(128),
  password: z.string().min(8).max(128),
});

export const rememberLoginSchema = loginSchema.extend({
  rememberMe: z.boolean().optional(),
});

export const galleryCreateSchema = z.object({
  title: z.string().min(2).max(200),
  slug: z.string().min(2).max(120).regex(/^[\p{L}\p{M}\p{N}-]+$/u).optional(),
  description: z.string().max(2000).optional().nullable(),
  coverImage: z.string().max(4000).optional().nullable(),
  eventDate: z.coerce.date().nullish(),
  location: z.string().max(200).optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

export const galleryUpdateSchema = galleryCreateSchema.partial();

export const galleryImageSchema = z.object({
  url: z.string().min(1).max(4000),
  thumbUrl: z.string().max(4000).optional().nullable(),
  alt: z.string().max(200).optional().nullable(),
  caption: z.string().max(500).optional().nullable(),
  credit: z.string().max(120).optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  size: z.number().int().positive().optional().nullable(),
  mime: z.string().max(50).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
});

export const pollOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(200),
});

export const pollCreateSchema = z.object({
  question: z.string().min(5).max(500),
  slug: z.string().min(2).max(120).regex(/^[\p{L}\p{M}\p{N}-]+$/u).optional(),
  description: z.string().max(2000).optional().nullable(),
  options: z.array(pollOptionSchema).min(2).max(10),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]).default("ACTIVE"),
  expiresAt: z.coerce.date().nullish(),
});

export const pollUpdateSchema = pollCreateSchema.partial();

export const pollVoteSchema = z.object({
  optionId: z.string().min(1),
});
