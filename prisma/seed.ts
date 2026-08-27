import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Create default admin user (credentials from env where available)
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@newsroom.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: hashedPassword,
      name: "Admin User",
      role: "OWNER",
      active: true,
    },
  });
  console.log("Created admin user:", admin.email);

  // Create Categories
  const categories = await Promise.all([
    // Main categories
    prisma.category.upsert({
      where: { slug: "breaking" },
      update: {},
      create: {
        slug: "breaking",
        name: "Breaking",
        description: "Breaking news stories",
        priority: 100,
        type: "STANDARD",
      },
    }),
    prisma.category.upsert({
      where: { slug: "alipurduar" },
      update: {},
      create: {
        slug: "alipurduar",
        name: "Alipurduar",
        description: "Local news from Alipurduar region",
        priority: 95,
        type: "STANDARD",
      },
    }),
    prisma.category.upsert({
      where: { slug: "north-bengal" },
      update: {},
      create: {
        slug: "north-bengal",
        name: "North Bengal",
        description: "News from North Bengal region",
        priority: 90,
        type: "STANDARD",
      },
    }),
    prisma.category.upsert({
      where: { slug: "west-bengal" },
      update: {},
      create: {
        slug: "west-bengal",
        name: "West Bengal",
        description: "State news from West Bengal",
        priority: 85,
        type: "STANDARD",
      },
    }),
    prisma.category.upsert({
      where: { slug: "india" },
      update: {},
      create: {
        slug: "india",
        name: "India",
        description: "National news from across India",
        priority: 80,
        type: "STANDARD",
      },
    }),
    prisma.category.upsert({
      where: { slug: "world" },
      update: {},
      create: {
        slug: "world",
        name: "World",
        description: "International news",
        priority: 75,
        type: "STANDARD",
      },
    }),
    prisma.category.upsert({
      where: { slug: "politics" },
      update: {},
      create: {
        slug: "politics",
        name: "Politics",
        description: "Political news and analysis",
        priority: 70,
        type: "STANDARD",
      },
    }),
    prisma.category.upsert({
      where: { slug: "business" },
      update: {},
      create: {
        slug: "business",
        name: "Business",
        description: "Business and economic news",
        priority: 65,
        type: "STANDARD",
      },
    }),
    prisma.category.upsert({
      where: { slug: "sports" },
      update: {},
      create: {
        slug: "sports",
        name: "Sports",
        description: "Sports news and coverage",
        priority: 60,
        type: "SPORTS",
      },
    }),
    prisma.category.upsert({
      where: { slug: "entertainment" },
      update: {},
      create: {
        slug: "entertainment",
        name: "Entertainment",
        description: "Entertainment news and features",
        priority: 55,
        type: "STANDARD",
      },
    }),
    prisma.category.upsert({
      where: { slug: "technology" },
      update: {},
      create: {
        slug: "technology",
        name: "Technology",
        description: "Technology news and updates",
        priority: 50,
        type: "STANDARD",
      },
    }),
    prisma.category.upsert({
      where: { slug: "education" },
      update: {},
      create: {
        slug: "education",
        name: "Education",
        description: "Education news and updates",
        priority: 45,
        type: "STANDARD",
      },
    }),
    prisma.category.upsert({
      where: { slug: "health" },
      update: {},
      create: {
        slug: "health",
        name: "Health",
        description: "Health news and updates",
        priority: 40,
        type: "STANDARD",
      },
    }),
    prisma.category.upsert({
      where: { slug: "science" },
      update: {},
      create: {
        slug: "science",
        name: "Science",
        description: "Science news and discoveries",
        priority: 35,
        type: "STANDARD",
      },
    }),
    prisma.category.upsert({
      where: { slug: "lifestyle" },
      update: {},
      create: {
        slug: "lifestyle",
        name: "Lifestyle",
        description: "Lifestyle and features",
        priority: 30,
        type: "STANDARD",
      },
    }),
    prisma.category.upsert({
      where: { slug: "data" },
      update: {},
      create: {
        slug: "data",
        name: "Data",
        description: "Data services and information",
        priority: 25,
        type: "DATA",
      },
    }),
    prisma.category.upsert({
      where: { slug: "videos" },
      update: {},
      create: {
        slug: "videos",
        name: "Videos",
        description: "Video content",
        priority: 20,
        type: "STANDARD",
      },
    }),
    prisma.category.upsert({
      where: { slug: "special" },
      update: {},
      create: {
        slug: "special",
        name: "Special",
        description: "Special features and content",
        priority: 15,
        type: "SPECIAL",
      },
    }),
  ]);

  console.log("Created categories:", categories.length);

  // Create Sports Subcategories
  const sportsCategory = categories.find(c => c.slug === "sports");
  if (sportsCategory) {
    const sportsSubcategories = await Promise.all([
      prisma.subcategory.upsert({
        where: { slug: "cricket" },
        update: {},
        create: {
          slug: "cricket",
          name: "Cricket",
          categoryId: sportsCategory.id,
          priority: 100,
        },
      }),
      prisma.subcategory.upsert({
        where: { slug: "football" },
        update: {},
        create: {
          slug: "football",
          name: "Football",
          categoryId: sportsCategory.id,
          priority: 90,
        },
      }),
      prisma.subcategory.upsert({
        where: { slug: "tennis" },
        update: {},
        create: {
          slug: "tennis",
          name: "Tennis",
          categoryId: sportsCategory.id,
          priority: 80,
        },
      }),
      prisma.subcategory.upsert({
        where: { slug: "other-sports" },
        update: {},
        create: {
          slug: "other-sports",
          name: "Other Sports",
          categoryId: sportsCategory.id,
          priority: 70,
        },
      }),
      prisma.subcategory.upsert({
        where: { slug: "live" },
        update: {},
        create: {
          slug: "live",
          name: "Live",
          categoryId: sportsCategory.id,
          priority: 60,
        },
      }),
      prisma.subcategory.upsert({
        where: { slug: "results" },
        update: {},
        create: {
          slug: "results",
          name: "Results",
          categoryId: sportsCategory.id,
          priority: 50,
        },
      }),
      prisma.subcategory.upsert({
        where: { slug: "schedule" },
        update: {},
        create: {
          slug: "schedule",
          name: "Schedule",
          categoryId: sportsCategory.id,
          priority: 40,
        },
      }),
    ]);
    console.log("Created sports subcategories:", sportsSubcategories.length);
  }

  // Create Data Subcategories
  const dataCategory = categories.find(c => c.slug === "data");
  if (dataCategory) {
    const dataSubcategories = await Promise.all([
      prisma.subcategory.upsert({
        where: { slug: "weather" },
        update: {},
        create: {
          slug: "weather",
          name: "Weather",
          categoryId: dataCategory.id,
          priority: 100,
        },
      }),
      prisma.subcategory.upsert({
        where: { slug: "stock-market" },
        update: {},
        create: {
          slug: "stock-market",
          name: "Stock Market",
          categoryId: dataCategory.id,
          priority: 90,
        },
      }),
      prisma.subcategory.upsert({
        where: { slug: "gold" },
        update: {},
        create: {
          slug: "gold",
          name: "Gold",
          categoryId: dataCategory.id,
          priority: 80,
        },
      }),
      prisma.subcategory.upsert({
        where: { slug: "silver" },
        update: {},
        create: {
          slug: "silver",
          name: "Silver",
          categoryId: dataCategory.id,
          priority: 70,
        },
      }),
      prisma.subcategory.upsert({
        where: { slug: "fuel" },
        update: {},
        create: {
          slug: "fuel",
          name: "Fuel",
          categoryId: dataCategory.id,
          priority: 60,
        },
      }),
    ]);
    console.log("Created data subcategories:", dataSubcategories.length);
  }

  // Create Special Subcategories
  const specialCategory = categories.find(c => c.slug === "special");
  if (specialCategory) {
    const specialSubcategories = await Promise.all([
      prisma.subcategory.upsert({
        where: { slug: "explainers" },
        update: {},
        create: {
          slug: "explainers",
          name: "Explainers",
          categoryId: specialCategory.id,
          priority: 100,
        },
      }),
      prisma.subcategory.upsert({
        where: { slug: "opinion" },
        update: {},
        create: {
          slug: "opinion",
          name: "Opinion",
          categoryId: specialCategory.id,
          priority: 90,
        },
      }),
      prisma.subcategory.upsert({
        where: { slug: "web-stories" },
        update: {},
        create: {
          slug: "web-stories",
          name: "Web Stories",
          categoryId: specialCategory.id,
          priority: 80,
        },
      }),
      prisma.subcategory.upsert({
        where: { slug: "e-paper" },
        update: {},
        create: {
          slug: "e-paper",
          name: "E-paper",
          categoryId: specialCategory.id,
          priority: 70,
        },
      }),
    ]);
    console.log("Created special subcategories:", specialSubcategories.length);
  }

  // Create Geographic Regions
  // Create Alipurduar parent region
  const alipurduarRegion = await prisma.region.upsert({
    where: { slug: "alipurduar-region" },
    update: {},
    create: {
      slug: "alipurduar-region",
      name: "Alipurduar",
      type: "DIVISION",
      district: "Alipurduar",
      state: "West Bengal",
      country: "India",
      priority: 100,
    },
  });

  // Create Alipurduar sub-regions
  const alipurduarSubRegions = await Promise.all([
    prisma.region.upsert({
      where: { slug: "alipurduar-town" },
      update: {},
      create: {
        slug: "alipurduar-town",
        name: "Alipurduar Town",
        type: "TOWN",
        parentId: alipurduarRegion.id,
        district: "Alipurduar",
        state: "West Bengal",
        country: "India",
        priority: 100,
      },
    }),
    prisma.region.upsert({
      where: { slug: "falakata" },
      update: {},
      create: {
        slug: "falakata",
        name: "Falakata",
        type: "TOWN",
        parentId: alipurduarRegion.id,
        district: "Alipurduar",
        state: "West Bengal",
        country: "India",
        priority: 90,
      },
    }),
    prisma.region.upsert({
      where: { slug: "madarihat" },
      update: {},
      create: {
        slug: "madarihat",
        name: "Madarihat",
        type: "TOWN",
        parentId: alipurduarRegion.id,
        district: "Alipurduar",
        state: "West Bengal",
        country: "India",
        priority: 80,
      },
    }),
    prisma.region.upsert({
      where: { slug: "kalchini" },
      update: {},
      create: {
        slug: "kalchini",
        name: "Kalchini",
        type: "TOWN",
        parentId: alipurduarRegion.id,
        district: "Alipurduar",
        state: "West Bengal",
        country: "India",
        priority: 70,
      },
    }),
    prisma.region.upsert({
      where: { slug: "kumargram" },
      update: {},
      create: {
        slug: "kumargram",
        name: "Kumargram",
        type: "TOWN",
        parentId: alipurduarRegion.id,
        district: "Alipurduar",
        state: "West Bengal",
        country: "India",
        priority: 60,
      },
    }),
    prisma.region.upsert({
      where: { slug: "birpara" },
      update: {},
      create: {
        slug: "birpara",
        name: "Birpara",
        type: "TOWN",
        parentId: alipurduarRegion.id,
        district: "Alipurduar",
        state: "West Bengal",
        country: "India",
        priority: 50,
      },
    }),
  ]);

  // Create North Bengal parent region
  const northBengalRegion = await prisma.region.upsert({
    where: { slug: "north-bengal-region" },
    update: {},
    create: {
      slug: "north-bengal-region",
      name: "North Bengal",
      type: "DIVISION",
      state: "West Bengal",
      country: "India",
      priority: 90,
    },
  });

  // Create North Bengal districts
  const northBengalDistricts = await Promise.all([
    prisma.region.upsert({
      where: { slug: "cooch-behar" },
      update: {},
      create: {
        slug: "cooch-behar",
        name: "Cooch Behar",
        type: "DISTRICT",
        parentId: northBengalRegion.id,
        district: "Cooch Behar",
        state: "West Bengal",
        country: "India",
        priority: 100,
      },
    }),
    prisma.region.upsert({
      where: { slug: "jalpaiguri" },
      update: {},
      create: {
        slug: "jalpaiguri",
        name: "Jalpaiguri",
        type: "DISTRICT",
        parentId: northBengalRegion.id,
        district: "Jalpaiguri",
        state: "West Bengal",
        country: "India",
        priority: 90,
      },
    }),
    prisma.region.upsert({
      where: { slug: "darjeeling" },
      update: {},
      create: {
        slug: "darjeeling",
        name: "Darjeeling",
        type: "DISTRICT",
        parentId: northBengalRegion.id,
        district: "Darjeeling",
        state: "West Bengal",
        country: "India",
        priority: 80,
      },
    }),
    prisma.region.upsert({
      where: { slug: "kalimpong" },
      update: {},
      create: {
        slug: "kalimpong",
        name: "Kalimpong",
        type: "DISTRICT",
        parentId: northBengalRegion.id,
        district: "Kalimpong",
        state: "West Bengal",
        country: "India",
        priority: 70,
      },
    }),
    prisma.region.upsert({
      where: { slug: "siliguri" },
      update: {},
      create: {
        slug: "siliguri",
        name: "Siliguri",
        type: "TOWN",
        parentId: northBengalRegion.id,
        district: "Darjeeling",
        state: "West Bengal",
        country: "India",
        priority: 85,
      },
    }),
    prisma.region.upsert({
      where: { slug: "uttar-dinajpur" },
      update: {},
      create: {
        slug: "uttar-dinajpur",
        name: "Uttar Dinajpur",
        type: "DISTRICT",
        parentId: northBengalRegion.id,
        district: "Uttar Dinajpur",
        state: "West Bengal",
        country: "India",
        priority: 60,
      },
    }),
    prisma.region.upsert({
      where: { slug: "dakshin-dinajpur" },
      update: {},
      create: {
        slug: "dakshin-dinajpur",
        name: "Dakshin Dinajpur",
        type: "DISTRICT",
        parentId: northBengalRegion.id,
        district: "Dakshin Dinajpur",
        state: "West Bengal",
        country: "India",
        priority: 50,
      },
    }),
    prisma.region.upsert({
      where: { slug: "malda" },
      update: {},
      create: {
        slug: "malda",
        name: "Malda",
        type: "DISTRICT",
        parentId: northBengalRegion.id,
        district: "Malda",
        state: "West Bengal",
        country: "India",
        priority: 40,
      },
    }),
  ]);

  // Create West Bengal region
  const westBengalRegion = await prisma.region.upsert({
    where: { slug: "west-bengal-region" },
    update: {},
    create: {
      slug: "west-bengal-region",
      name: "West Bengal",
      type: "STATE",
      state: "West Bengal",
      country: "India",
      priority: 80,
    },
  });

  // Create India region
  const indiaRegion = await prisma.region.upsert({
    where: { slug: "india-region" },
    update: {},
    create: {
      slug: "india-region",
      name: "India",
      type: "COUNTRY",
      country: "India",
      priority: 70,
    },
  });

  // Create World region
  const worldRegion = await prisma.region.upsert({
    where: { slug: "world-region" },
    update: {},
    create: {
      slug: "world-region",
      name: "World",
      type: "COUNTRY",
      country: "International",
      priority: 60,
    },
  });

  console.log("Created geographic regions");
  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });