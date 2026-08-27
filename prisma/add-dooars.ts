import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  await db.category.upsert({
    where: { slug: "dooars" },
    update: {},
    create: {
      slug: "dooars",
      name: "Dooars",
      priority: 95,
    },
  });
  console.log("dooars category ready");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
