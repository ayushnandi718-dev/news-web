/**
 * Generate placeholder PWA icons using sharp.
 * Run: npx tsx scripts/generate-icons.ts
 * Later replace with real logo when available.
 */
import sharp from "sharp";
import path from "path";
import fs from "fs";

const PUBLIC = path.join(__dirname, "..", "public");
const BRAND_RED = "#c8102e";
const WHITE = "#ffffff";

async function generateIcon(size: number, filename: string) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="${BRAND_RED}"/>
      <text
        x="50%" y="52%"
        dominant-baseline="central"
        text-anchor="middle"
        fill="${WHITE}"
        font-family="Noto Sans Bengali, sans-serif"
        font-weight="900"
        font-size="${size * 0.38}"
        letter-spacing="${size * 0.02}"
      >DK</text>
    </svg>
  `;

  const outPath = path.join(PUBLIC, filename);
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`  ✓ ${filename} (${size}x${size})`);
}

async function generateFavicon() {
  const size = 48;
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="${BRAND_RED}"/>
      <text
        x="50%" y="52%"
        dominant-baseline="central"
        text-anchor="middle"
        fill="${WHITE}"
        font-family="Noto Sans Bengali, sans-serif"
        font-weight="900"
        font-size="${size * 0.38}"
        letter-spacing="${size * 0.02}"
      >DK</text>
    </svg>
  `;

  const outPath = path.join(PUBLIC, "favicon.png");
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`  ✓ favicon.png (48x48)`);
}

async function main() {
  console.log("Generating PWA placeholder icons...\n");

  if (!fs.existsSync(PUBLIC)) {
    fs.mkdirSync(PUBLIC, { recursive: true });
  }

  await generateIcon(192, "icon-192.png");
  await generateIcon(512, "icon-512.png");
  await generateFavicon();

  console.log("\nDone! Icons are placeholders — replace with real logo later.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
