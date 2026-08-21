import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "NewsWeb — Latest News, Breaking News",
    template: "%s | NewsWeb",
  },
  description: "Real-time fresh news: breaking news, latest stories, trending topics and archives.",
  openGraph: {
    siteName: "NewsWeb",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="pb-16 md:pb-0">
        <SiteHeader />
        {children}
        <SiteFooter />
        <BottomNav />
      </body>
    </html>
  );
}
