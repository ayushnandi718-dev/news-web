export const ROLES = ["OWNER", "EDITOR_IN_CHIEF", "EDITOR", "REPORTER", "AUTHOR", "MODERATOR"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "article.create",
  "article.edit.own",
  "article.edit.any",
  "article.review",
  "article.publish",
  "article.schedule",
  "article.delete.own",
  "article.delete.any",
  "article.manage_seo",
  "article.manage_corrections",
  "article.view_revisions",
  "breaking.manage",
  "live.manage",
  "ads.manage",
  "feature.manage",
  "category.manage",
  "category.create",
  "category.edit",
  "category.delete",
  "subcategory.manage",
  "subcategory.create",
  "subcategory.edit",
  "subcategory.delete",
  "region.manage",
  "region.create",
  "region.edit",
  "region.delete",
  "tag.manage",
  "media.upload",
  "media.delete",
  "media.manage",
  "comment.moderate",
  "comment.manage",
  "user.manage",
  "user.create",
  "user.edit",
  "user.delete",
  "user.view",
  "source.view",
  "source.manage",
  "source.create",
  "source.edit",
  "source.delete",
  "inbox.review",
  "inbox.manage",
  "dashboard.view",
  "audit.view",
  "analytics.view",
  "analytics.manage",
  "settings.manage",
  "system.admin",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const EDITORIAL_CORE: Permission[] = [
  "article.create",
  "article.edit.own",
  "article.delete.own",
  "media.upload",
  "dashboard.view",
];

const MATRIX: Record<Role, Permission[]> = {
  OWNER: [...PERMISSIONS],
  EDITOR_IN_CHIEF: [
    ...EDITORIAL_CORE,
    "article.edit.any",
    "article.review",
    "article.publish",
    "article.schedule",
    "article.delete.any",
    "article.manage_seo",
    "article.manage_corrections",
    "article.view_revisions",
      "breaking.manage",
      "live.manage",
      "ads.manage",
      "feature.manage",
      "category.manage",
      "category.create",
      "category.edit",
      "category.delete",
    "subcategory.manage",
    "subcategory.create",
    "subcategory.edit",
    "subcategory.delete",
    "region.manage",
    "region.create",
    "region.edit",
    "region.delete",
    "tag.manage",
    "media.delete",
    "media.manage",
    "comment.moderate",
    "comment.manage",
    "user.manage",
    "user.create",
    "user.edit",
    "user.delete",
    "user.view",
    "source.view",
    "source.manage",
    "source.create",
    "source.edit",
    "source.delete",
    "inbox.review",
    "inbox.manage",
    "audit.view",
    "analytics.view",
    "analytics.manage",
    "settings.manage",
  ],
  EDITOR: [
    ...EDITORIAL_CORE,
    "article.edit.any",
    "article.review",
    "article.publish",
    "article.schedule",
    "article.manage_seo",
    "article.manage_corrections",
    "article.view_revisions",
      "breaking.manage",
      "live.manage",
      "ads.manage",
      "feature.manage",
      "category.manage",
      "category.create",
      "category.edit",
      "subcategory.manage",
    "subcategory.create",
    "subcategory.edit",
    "region.manage",
    "region.create",
    "region.edit",
    "tag.manage",
    "media.delete",
    "comment.moderate",
    "comment.manage",
    "source.view",
    "source.manage",
    "source.create",
    "source.edit",
    "inbox.review",
    "inbox.manage",
    "analytics.view",
    "user.view",
  ],
  REPORTER: [
    ...EDITORIAL_CORE,
    "article.view_revisions",
    "tag.manage",
    "source.view",
  ],
  AUTHOR: [
    ...EDITORIAL_CORE,
    "article.view_revisions",
    "tag.manage",
    "source.view",
  ],
  MODERATOR: [
    "comment.moderate",
    "comment.manage",
    "dashboard.view",
    "user.view",
  ],
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function can(role: string, permission: Permission): boolean {
  if (!isRole(role)) return false;
  return MATRIX[role].includes(permission);
}

export function permissionsOf(role: string): Permission[] {
  return isRole(role) ? [...MATRIX[role]] : [];
}

export function canEditArticle(
  session: { id: string; role: string },
  article: { authorId: string | null; status: string }
): boolean {
  if (can(session.role, "article.edit.any")) return true;
  if (!can(session.role, "article.edit.own")) return false;
  return article.authorId === session.id && ["DRAFT", "NEW", "IN_REVIEW"].includes(article.status);
}

export function canDeleteArticle(
  session: { id: string; role: string },
  article: { authorId: string | null; status: string }
): boolean {
  if (can(session.role, "article.delete.any")) return true;
  return (
    can(session.role, "article.delete.own") &&
    article.authorId === session.id &&
    ["DRAFT", "NEW", "ARCHIVED"].includes(article.status)
  );
}

export function canManageSEO(session: { role: string }): boolean {
  return can(session.role, "article.manage_seo");
}

export function canManageCorrections(session: { role: string }): boolean {
  return can(session.role, "article.manage_corrections");
}

export function canViewRevisions(session: { role: string }): boolean {
  return can(session.role, "article.view_revisions");
}

export function canManageRegions(session: { role: string }): boolean {
  return can(session.role, "region.manage");
}

export function canManageSubcategories(session: { role: string }): boolean {
  return can(session.role, "subcategory.manage");
}

export function canManageCategories(session: { role: string }): boolean {
  return can(session.role, "category.manage");
}

export function canManageSources(session: { role: string }): boolean {
  return can(session.role, "source.manage");
}

export function canManageInbox(session: { role: string }): boolean {
  return can(session.role, "inbox.manage");
}

export function canManageLive(session: { role: string }): boolean {
  return can(session.role, "live.manage");
}

export function canManageAds(session: { role: string }): boolean {
  return can(session.role, "ads.manage");
}

export function canManageAnalytics(session: { role: string }): boolean {
  return can(session.role, "analytics.manage");
}

export function canManageUsers(session: { role: string }): boolean {
  return can(session.role, "user.manage");
}

export function canManageSystem(session: { role: string }): boolean {
  return can(session.role, "system.admin");
}
