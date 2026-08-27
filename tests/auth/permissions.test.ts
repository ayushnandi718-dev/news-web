import { describe, it, expect } from "vitest";
import {
  ROLES,
  can,
  permissionsOf,
  canEditArticle,
  canDeleteArticle,
  canManageCategories,
  canManageUsers,
  canManageAds,
  canManageLive,
  canManageSources,
  canManageInbox,
  canManageRegions,
  canManageSubcategories,
  canManageAnalytics,
  canManageSystem,
  canManageSEO,
  canManageCorrections,
  canViewRevisions,
  isRole,
} from "@/lib/permissions";
import type { Role } from "@/lib/permissions";

describe("isRole", () => {
  it("validates known roles", () => {
    expect(isRole("OWNER")).toBe(true);
    expect(isRole("EDITOR")).toBe(true);
    expect(isRole("REPORTER")).toBe(true);
    expect(isRole("MODERATOR")).toBe(true);
  });

  it("rejects unknown roles", () => {
    expect(isRole("admin")).toBe(false);
    expect(isRole("SUPERADMIN")).toBe(false);
    expect(isRole("")).toBe(false);
  });
});

describe("can — permission matrix", () => {
  describe("OWNER has all permissions", () => {
    const allPerms = permissionsOf("OWNER");
    it("has article.create", () => {
      expect(can("OWNER", "article.create")).toBe(true);
    });
    it("has article.publish", () => {
      expect(can("OWNER", "article.publish")).toBe(true);
    });
    it("has user.manage", () => {
      expect(can("OWNER", "user.manage")).toBe(true);
    });
    it("has system.admin", () => {
      expect(can("OWNER", "system.admin")).toBe(true);
    });
    it("permissionsOf returns all permissions", () => {
      expect(allPerms.length).toBeGreaterThan(40);
    });
  });

  describe("EDITOR_IN_CHIEF", () => {
    it("can publish articles", () => {
      expect(can("EDITOR_IN_CHIEF", "article.publish")).toBe(true);
    });
    it("can edit any article", () => {
      expect(can("EDITOR_IN_CHIEF", "article.edit.any")).toBe(true);
    });
    it("can manage users", () => {
      expect(can("EDITOR_IN_CHIEF", "user.manage")).toBe(true);
    });
    it("cannot system.admin", () => {
      expect(can("EDITOR_IN_CHIEF", "system.admin")).toBe(false);
    });
  });

  describe("EDITOR", () => {
    it("can publish articles", () => {
      expect(can("EDITOR", "article.publish")).toBe(true);
    });
    it("can review articles", () => {
      expect(can("EDITOR", "article.review")).toBe(true);
    });
    it("can edit any article", () => {
      expect(can("EDITOR", "article.edit.any")).toBe(true);
    });
    it("cannot delete any article", () => {
      expect(can("EDITOR", "article.delete.any")).toBe(false);
    });
    it("cannot manage users", () => {
      expect(can("EDITOR", "user.manage")).toBe(false);
    });
  });

  describe("REPORTER", () => {
    it("can create articles", () => {
      expect(can("REPORTER", "article.create")).toBe(true);
    });
    it("can edit own articles", () => {
      expect(can("REPORTER", "article.edit.own")).toBe(true);
    });
    it("cannot publish articles", () => {
      expect(can("REPORTER", "article.publish")).toBe(false);
    });
    it("cannot edit any article", () => {
      expect(can("REPORTER", "article.edit.any")).toBe(false);
    });
    it("cannot review articles", () => {
      expect(can("REPORTER", "article.review")).toBe(false);
    });
  });

  describe("AUTHOR", () => {
    it("can create articles", () => {
      expect(can("AUTHOR", "article.create")).toBe(true);
    });
    it("can edit own articles", () => {
      expect(can("AUTHOR", "article.edit.own")).toBe(true);
    });
    it("cannot publish", () => {
      expect(can("AUTHOR", "article.publish")).toBe(false);
    });
    it("cannot upload media", () => {
      // AUTHOR gets EDITORIAL_CORE which includes media.upload
      expect(can("AUTHOR", "media.upload")).toBe(true);
    });
  });

  describe("MODERATOR", () => {
    it("can moderate comments", () => {
      expect(can("MODERATOR", "comment.moderate")).toBe(true);
    });
    it("cannot create articles", () => {
      expect(can("MODERATOR", "article.create")).toBe(false);
    });
    it("cannot publish", () => {
      expect(can("MODERATOR", "article.publish")).toBe(false);
    });
    it("can view dashboard", () => {
      expect(can("MODERATOR", "dashboard.view")).toBe(true);
    });
  });

  describe("invalid role", () => {
    it("returns false for any permission", () => {
      expect(can("HACKER", "article.publish")).toBe(false);
      expect(can("GHOST", "system.admin")).toBe(false);
    });
  });
});

describe("canEditArticle", () => {
  const ownArticle = { authorId: "user-1", status: "DRAFT" };
  const othersArticle = { authorId: "user-2", status: "DRAFT" };

  it("OWNER can edit any article", () => {
    expect(canEditArticle({ id: "user-1", role: "OWNER" }, othersArticle)).toBe(true);
  });

  it("EDITOR_IN_CHIEF can edit any article", () => {
    expect(canEditArticle({ id: "user-1", role: "EDITOR_IN_CHIEF" }, othersArticle)).toBe(true);
  });

  it("REPORTER can edit own DRAFT", () => {
    expect(canEditArticle({ id: "user-1", role: "REPORTER" }, ownArticle)).toBe(true);
  });

  it("REPORTER cannot edit others' articles", () => {
    expect(canEditArticle({ id: "user-1", role: "REPORTER" }, othersArticle)).toBe(false);
  });

  it("REPORTER cannot edit published articles even if own", () => {
    expect(
      canEditArticle({ id: "user-1", role: "REPORTER" }, { authorId: "user-1", status: "PUBLISHED" })
    ).toBe(false);
  });

  it("REPORTER can edit own IN_REVIEW articles", () => {
    expect(
      canEditArticle({ id: "user-1", role: "REPORTER" }, { authorId: "user-1", status: "IN_REVIEW" })
    ).toBe(true);
  });
});

describe("canDeleteArticle", () => {
  it("OWNER can delete any article", () => {
    expect(canDeleteArticle({ id: "u1", role: "OWNER" }, { authorId: "u2", status: "PUBLISHED" })).toBe(true);
  });

  it("REPORTER can delete own DRAFT", () => {
    expect(canDeleteArticle({ id: "u1", role: "REPORTER" }, { authorId: "u1", status: "DRAFT" })).toBe(true);
  });

  it("REPORTER cannot delete own PUBLISHED", () => {
    expect(
      canDeleteArticle({ id: "u1", role: "REPORTER" }, { authorId: "u1", status: "PUBLISHED" })
    ).toBe(false);
  });

  it("REPORTER can delete own ARCHIVED", () => {
    expect(
      canDeleteArticle({ id: "u1", role: "REPORTER" }, { authorId: "u1", status: "ARCHIVED" })
    ).toBe(true);
  });

  it("REPORTER cannot delete others' articles", () => {
    expect(
      canDeleteArticle({ id: "u1", role: "REPORTER" }, { authorId: "u2", status: "DRAFT" })
    ).toBe(false);
  });
});

describe("helper permission checks", () => {
  it("canManageCategories for OWNER", () => {
    expect(canManageCategories({ role: "OWNER" })).toBe(true);
  });

  it("canManageCategories for REPORTER", () => {
    expect(canManageCategories({ role: "REPORTER" })).toBe(false);
  });

  it("canManageUsers for EDITOR_IN_CHIEF", () => {
    expect(canManageUsers({ role: "EDITOR_IN_CHIEF" })).toBe(true);
  });

  it("canManageUsers for EDITOR", () => {
    expect(canManageUsers({ role: "EDITOR" })).toBe(false);
  });

  it("canManageSystem only for OWNER", () => {
    for (const role of ROLES) {
      const expected = role === "OWNER";
      expect(canManageSystem({ role })).toBe(expected);
    }
  });

  it("canManageSEO for EDITOR", () => {
    expect(canManageSEO({ role: "EDITOR" })).toBe(true);
  });

  it("canManageSEO for REPORTER", () => {
    expect(canManageSEO({ role: "REPORTER" })).toBe(false);
  });
});
