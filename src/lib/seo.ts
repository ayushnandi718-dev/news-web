/**
 * World-Class SEO Utilities for News Platform
 * Implements comprehensive SEO strategies for local news dominance
 */

import { BRAND, ogImageUrl } from "./brand";

export interface SeoMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonical?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

export interface LocalBusinessData {
  name: string;
  description: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  telephone: string;
  email: string;
  url: string;
  sameAs?: string[];
  openingHours?: string[];
  priceRange?: string;
}

export interface NewsArticleSchema {
  headline: string;
  description: string;
  image: string[];
  datePublished: string;
  dateModified: string;
  author: {
    '@type': 'Person';
    name: string;
  };
  publisher: {
    '@type': 'Organization';
    name: string;
    logo: string;
  };
  mainEntityOfPage: string;
  articleSection?: string;
  wordCount?: number;
}

/**
 * Generate comprehensive structured data for NewsArticle
 */
export function generateNewsArticleSchema(data: NewsArticleSchema): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    ...data,
  };
  return JSON.stringify(schema);
}

/**
 * Generate Organization schema for local business SEO
 */
export function generateOrganizationSchema(businessData: LocalBusinessData): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: businessData.name,
    description: businessData.description,
    url: businessData.url,
    telephone: businessData.telephone,
    email: businessData.email,
    address: {
      '@type': 'PostalAddress',
      ...businessData.address,
    },
    sameAs: businessData.sameAs || [],
    logo: `${businessData.url}/logo.png`,
    foundingDate: '2024',
    areaServed: [
      {
        '@type': 'City',
        name: 'Alipurduar',
      },
      {
        '@type': 'AdministrativeArea',
        name: 'West Bengal',
      },
      {
        '@type': 'Country',
        name: 'India',
      },
    ],
  };
  return JSON.stringify(schema);
}

/**
 * Generate WebSite schema for sitelinks search
 */
export function generateWebSiteSchema(siteUrl: string, siteName: string): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: siteUrl,
    description: `${siteName} - আলিপুরদুয়ারের সর্বশেষ বাংলা সংবাদ`,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      url: siteUrl,
    },
  };
  return JSON.stringify(schema);
}

/**
 * Generate BreadcrumbList schema
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; item: string }>): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  };
  return JSON.stringify(schema);
}

/**
 * Generate FAQPage schema for SEO content
 */
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
  return JSON.stringify(schema);
}

/**
 * Generate CollectionPage schema for category pages
 */
export function generateCollectionPageSchema(
  name: string,
  description: string,
  url: string,
  items: Array<{ name: string; url: string; datePublished?: string }>
): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url,
    hasPart: items.map(item => ({
      '@type': 'NewsArticle',
      name: item.name,
      url: item.url,
      datePublished: item.datePublished,
    })),
  };
  return JSON.stringify(schema);
}

/**
 * Generate Place schema for local SEO
 */
export function generatePlaceSchema(
  name: string,
  description: string,
  url: string,
  address: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  },
  geo: {
    latitude: number;
    longitude: number;
  }
): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name,
    description,
    url,
    address: {
      '@type': 'PostalAddress',
      ...address,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: geo.latitude,
      longitude: geo.longitude,
    },
  };
  return JSON.stringify(schema);
}

/**
 * Generate Person schema for authors
 */
export function generatePersonSchema(
  name: string,
  jobTitle: string,
  url: string,
  worksFor: string,
  sameAs?: string[]
): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    jobTitle,
    url,
    worksFor: {
      '@type': 'Organization',
      name: worksFor,
    },
    sameAs: sameAs || [],
  };
  return JSON.stringify(schema);
}

/**
 * Generate ImageObject schema for better image SEO
 */
export function generateImageObjectSchema(
  url: string,
  caption: string,
  width: number,
  height: number,
  author?: string
): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    url,
    caption,
    width,
    height,
    author: author ? {
      '@type': 'Person',
      name: author,
    } : undefined,
  };
  return JSON.stringify(schema);
}

/**
 * Generate VideoObject schema for video content
 */
export function generateVideoObjectSchema(
  name: string,
  description: string,
  thumbnailUrl: string,
  uploadDate: string,
  duration: string,
  contentUrl: string
): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name,
    description,
    thumbnailUrl,
    uploadDate,
    duration,
    contentUrl,
  };
  return JSON.stringify(schema);
}

/**
 * Generate AboutPage schema for site information
 */
export function generateAboutPageSchema(
  siteName: string,
  description: string,
  url: string,
  foundingDate: string
): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    mainEntity: {
      '@type': 'Organization',
      name: siteName,
      description,
      url,
      foundingDate,
    },
  };
  return JSON.stringify(schema);
}

/**
 * Optimized meta tag generator
 */
export function generateMetaTags(seoData: SeoMetadata, siteUrl: string) {
  const baseMeta = {
    title: seoData.title,
    description: seoData.description,
    keywords: seoData.keywords.join(', '),
    robots: seoData.noindex ? 'noindex' : 'index',
    ...(seoData.nofollow && { follow: 'nofollow' }),
    ...(seoData.canonical && { canonical: seoData.canonical }),
  };

  const openGraph = {
    'og:title': seoData.ogTitle || seoData.title,
    'og:description': seoData.ogDescription || seoData.description,
    'og:image': seoData.ogImage || ogImageUrl(),
    'og:type': 'website',
    'og:locale': 'bn_IN',
    'og:site_name': BRAND.bn,
  };

  const twitter = {
    'twitter:card': 'summary_large_image',
    'twitter:title': seoData.twitterTitle || seoData.title,
    'twitter:description': seoData.twitterDescription || seoData.description,
    'twitter:image': seoData.twitterImage || seoData.ogImage || `${siteUrl}/og-image.jpg`,
  };

  return { baseMeta, openGraph, twitter };
}

/**
 * Local SEO keywords generator for Alipurduar/Dooars region
 */
export function generateLocalKeywords(category: string, location: string = 'Alipurduar'): string[] {
  const baseKeywords = [
    `${location} news`,
    `${location} খবর`,
    `Dooars news`,
    `North Bengal news`,
    `West Bengal news`,
    `Bengali news`,
  ];

  const categoryKeywords = {
    politics: ['politics', 'রাজনীতি', 'election', 'ভোট'],
    sports: ['sports', 'খেলা', 'cricket', 'football', 'ক্রিকেট', 'ফুটবল'],
    business: ['business', 'ব্যবসা', 'economy', 'অর্থনীতি', 'market', 'বাজার'],
    entertainment: ['entertainment', 'বিনোদন', 'cinema', 'সিনেমা', 'music', 'সঙ্গীত'],
    technology: ['technology', 'প্রযুক্তি', 'tech', 'gadgets', 'গ্যাজেট'],
    health: ['health', 'স্বাস্থ্য', 'medical', 'চিকিৎসা'],
    education: ['education', 'শিক্ষা', 'school', 'college', 'স্কুল', 'কলেজ'],
  };

  const categorySpecific = categoryKeywords[category as keyof typeof categoryKeywords] || [];
  
  return [...baseKeywords, ...categorySpecific.map(k => `${location} ${k}`)];
}

/**
 * Generate hreflang tags for multilingual SEO
 */
export function generateHreflangTags(
  baseUrl: string,
  currentPath: string,
  availableLocales: Array<{ lang: string; url: string }>
) {
  return availableLocales.map(locale => ({
    rel: 'alternate',
    hrefLang: locale.lang,
    href: `${baseUrl}${locale.url}${currentPath}`,
  }));
}

/**
 * Generate ItemList schema for article lists
 */
export function generateItemListSchema(
  name: string,
  items: Array<{ name: string; url: string; position: number }>
): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: items.map(item => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.name,
      url: item.url,
    })),
  };
  return JSON.stringify(schema);
}

/**
 * Generate WebPage schema for static pages
 */
export function generateWebPageSchema(
  name: string,
  description: string,
  url: string,
  dateModified?: string
): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: BRAND.bn,
      url: url.split('/').slice(0, 3).join('/'),
    },
    ...(dateModified && { dateModified }),
  };
  return JSON.stringify(schema);
}
