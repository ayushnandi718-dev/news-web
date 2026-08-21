import { db } from "./db";
import { slugify } from "./text";

export async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base) || `story-${Date.now()}`;
  let n = 1;
  while (await db.article.findUnique({ where: { slug } })) {
    n++;
    slug = `${slugify(base).slice(0, 80)}-${n}`;
  }
  return slug;
}
