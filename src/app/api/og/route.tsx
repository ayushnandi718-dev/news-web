import { BRAND } from "@/lib/brand";
import { readFileSync } from "fs";
import { join } from "path";

let fontCache: ArrayBuffer | null = null;

function bengaliFont(): ArrayBuffer {
  if (!fontCache) {
    fontCache = readFileSync(
      join(process.cwd(), "src", "assets", "fonts", "NotoSansBengali-Bold.ttf")
    ).buffer as ArrayBuffer;
  }
  return fontCache;
}

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const square = searchParams.get("square") === "1";
  const title = (searchParams.get("title") || "").slice(0, 120);
  const subtitle = (searchParams.get("subtitle") || "").slice(0, 80);

  const width = square ? 512 : 1200;
  const height = square ? 512 : 630;
  const brandSize = square ? 96 : 128;
  const pad = square ? 48 : 80;

  const font = bengaliFont();
  const { ImageResponse } = await import("next/og");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f7f5f0 0%, #eeebe1 100%)",
          padding: pad,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 16,
            background: "#c8102e",
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: brandSize,
            fontWeight: 700,
            color: "#c8102e",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          {BRAND.bn}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: square ? 24 : 30,
            fontWeight: 600,
            color: "#8a8577",
            letterSpacing: "0.18em",
            marginTop: 8,
          }}
        >
          {BRAND.en}
        </div>
        {title ? (
          <div
            style={{
              display: "flex",
              fontSize: square ? 32 : 54,
              fontWeight: 700,
              color: "#131c2e",
              lineHeight: 1.25,
              marginTop: 36,
              maxHeight: square ? 260 : 330,
              overflow: "hidden",
            }}
          >
            {title}
          </div>
        ) : null}
        {!square ? (
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#5b5648",
              marginTop: title ? 28 : 40,
              borderTop: "2px solid #c8102e",
              paddingTop: 16,
            }}
          >
            {subtitle || BRAND.tagline}
          </div>
        ) : null}
      </div>
    ),
    {
      width,
      height,
      fonts: [
        {
          name: "Bengali",
          data: font,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );
}
