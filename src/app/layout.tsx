import type { Metadata, Viewport } from "next";
import { Noto_Sans_Bengali } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import BottomNav from "@/components/BottomNav";
import HideOnAdmin from "@/components/HideOnAdmin";
import ThemeProvider from "@/components/ThemeProvider";
import LiveNotification from "@/components/LiveNotification";
import InstallBanner from "@/components/InstallBanner";
import { PushProvider } from "@/components/PushProvider";
import { BRAND, siteUrl, ogImageUrl } from "@/lib/brand";
import { getSiteSettings } from "@/lib/settings";

// Individual pages set their own `revalidate` or `dynamic` exports.
// This layout no longer forces all pages to be dynamic.

const plexBengali = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bengali",
  display: "swap",
});

const defaultTitle = `${BRAND.bn} | ${BRAND.en} — আলিপুরদুয়ারের সর্বশেষ বাংলা সংবাদ`;
const defaultDescription = `${BRAND.tagline} আলিপুরদুয়ার, ডুয়ার্স ও উত্তরবঙ্গের সর্বশেষ বাংলা সংবাদ — ব্রেকিং নিউজ, রাজনীতি, খেলা, ব্যবসা ও বিনোদন।`;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#c8102e",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: defaultTitle,
    template: `%s | ${BRAND.bn}`,
  },
  description: defaultDescription,
  applicationName: BRAND.bn,
  manifest: "/manifest.json",
  keywords: [
    `${BRAND.bn}`,
    "আলিপুরদুয়ার খবর",
    "ডুয়ার্স খবর",
    "উত্তরবঙ্গ সংবাদ",
    "বাংলা নিউজ",
    "আলিপুরদুয়ার সংবাদ",
    "Alipurduar news",
    "Dooars news",
    "North Bengal news",
    "West Bengal bangla news",
    "Bengali news",
    "ব্রেকিং নিউজ",
    "আজকের খবর",
  ],
  authors: [{ name: BRAND.bn, url: siteUrl() }],
  creator: BRAND.bn,
  publisher: BRAND.bn,
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": `${siteUrl()}/feed.xml` },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    siteName: BRAND.bn,
    type: "website",
    locale: "bn_IN",
    alternateLocale: ["en_IN", "hi_IN"],
    title: defaultTitle,
    description: defaultDescription,
    url: siteUrl(),
    images: [
      {
        url: ogImageUrl(),
        width: 1200,
        height: 630,
        alt: `${BRAND.bn} - আলিপুরদুয়ারের সর্বশেষ বাংলা সংবাদ`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: [ogImageUrl()],
    creator: BRAND.twitter,
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <html lang="bn" className={`${plexBengali.variable}`} suppressHydrationWarning>
      <body className="pb-16 md:pb-0 bg-paper text-ink dark:bg-gray-950 dark:text-gray-100" style={{ fontSize: "var(--dk-font-size, 16px)" }}>
        {process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID && !process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID.includes("XXXX") && (
          <Script
            id="adsbygoogle-init"
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID}`}
            crossOrigin="anonymous"
          />
        )}
        <ThemeProvider>
          <PushProvider>
            <HideOnAdmin>
              <LiveNotification />
              <SiteHeader settings={settings} />
            </HideOnAdmin>
            {children}
            <HideOnAdmin>
              <InstallBanner />
              <SiteFooter settings={settings} />
              <BottomNav />
            </HideOnAdmin>
          </PushProvider>
        </ThemeProvider>
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        `}</Script>
      </body>
    </html>
  );
}
