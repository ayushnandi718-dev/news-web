"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="bn">
      <body style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#faf9f5", color: "#1e293b" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem", textAlign: "center" }}>
          <div style={{ maxWidth: 440 }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>⚠️</div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>
              কিছু ভুল হয়েছে
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              সাইটে একটি সমস্যা হয়েছে। আমরা এটি সমাধান করার চেষ্টা করছি।
              <br />
              অনুগ্রহ করে কিছুক্ষণ পরে আবার চেষ্টা করুন।
            </p>
            {error.digest && (
              <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "1rem", fontFamily: "monospace" }}>
                Error: {error.digest}
              </p>
            )}
            <button
              onClick={() => reset()}
              style={{
                backgroundColor: "#c8102e",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                padding: "0.625rem 1.5rem",
                fontSize: "0.875rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              আবার চেষ্টা করুন
            </button>
            <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "1.5rem" }}>
              <a href="/" style={{ color: "#c8102e", textDecoration: "underline" }}>
                হোমপেজে ফিরুন
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
