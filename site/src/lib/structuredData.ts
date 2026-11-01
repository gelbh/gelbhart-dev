import { CANONICAL_BASE_URL, DEFAULT_META_DESCRIPTION, assetUrl, socialImageDimensions } from "./page";

type JsonObject = Record<string, unknown>;
type DateLike = Date | string;

const SAME_AS = ["https://www.linkedin.com/in/tomer-gelbhart/", "https://github.com/gelbh"];

const present = <T>(v: T | null | undefined | false): v is T =>
  v !== null && v !== undefined && v !== false && !(typeof v === "string" && v.trim() === "");

const isAbsolute = (url: string | null | undefined): url is string => present(url) && url.startsWith("http");

const absolute = (url: string) => (isAbsolute(url) ? url : `${CANONICAL_BASE_URL}${url}`);

const absoluteAsset = (url: string) => (isAbsolute(url) ? url : assetUrl(url));

const iso8601 = (d: DateLike) => (typeof d === "string" ? d : d.toISOString().replace(/\.\d{3}Z$/, "Z"));

export function personStructuredData(): JsonObject {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Tomer Gelbhart",
    url: CANONICAL_BASE_URL,
    jobTitle: ["Full-Stack Developer", "MSc Computer Science Student"],
    alumniOf: {
      "@type": "EducationalOrganization",
      name: "University College Dublin",
    },
    knowsAbout: [
      "Ruby on Rails",
      "JavaScript",
      "Python",
      "Java",
      "Full-Stack Development",
      "Web Development",
      "API Integration",
      "Machine Learning",
      "Cloud Computing",
    ],
    sameAs: [...SAME_AS],
  };
}

export function websiteStructuredData(): JsonObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "gelbhart.dev",
    url: CANONICAL_BASE_URL,
    description: DEFAULT_META_DESCRIPTION,
    author: {
      "@type": "Person",
      name: "Tomer Gelbhart",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${CANONICAL_BASE_URL}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationStructuredData(): JsonObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "gelbhart.dev",
    url: CANONICAL_BASE_URL,
    logo: assetUrl("logos/source/logo_social.svg"),
    description: "Personal portfolio and development projects by Tomer Gelbhart",
    founder: {
      "@type": "Person",
      name: "Tomer Gelbhart",
    },
    sameAs: [...SAME_AS],
  };
}

// normalize_breadcrumb_url: absolute, no query, fragment or port, no trailing slash except root.
export function normalizeBreadcrumbUrl(url: string | null | undefined): string | null {
  if (!present(url)) return null;
  const raw = String(url);
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const uri = new URL(raw);
      let path = uri.pathname || "/";
      if (path !== "/") path = path.replace(/\/$/, "");
      return `${uri.protocol}//${uri.hostname}${path}`;
    } catch {
      const cleaned = raw.trim().replace(/\?.*$/, "").replace(/#.*$/, "");
      return cleaned.startsWith("http://") || cleaned.startsWith("https://")
        ? cleaned
        : `${CANONICAL_BASE_URL}${cleaned.startsWith("/") ? cleaned : `/${cleaned}`}`;
    }
  }
  let path = raw.startsWith("/") ? raw : `/${raw}`;
  path = path.split("?")[0].split("#")[0];
  if (path !== "/") path = path.replace(/\/$/, "");
  return `${CANONICAL_BASE_URL}${path}`;
}

export interface BreadcrumbItem {
  name: string;
  url?: string | null;
}

// Items without a url fall back to the current page URL.
export function breadcrumbStructuredData(items: BreadcrumbItem[], currentUrl?: string): JsonObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items
      .map((item, index) => {
        const normalized = normalizeBreadcrumbUrl(item.url ?? currentUrl);
        if (!present(normalized)) return null;
        return {
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: {
            "@id": normalized,
            name: item.name,
          },
        };
      })
      .filter((x) => x !== null),
  };
}

export interface SoftwareApplicationOptions {
  name: string;
  description: string;
  url: string;
  applicationCategory?: string;
  operatingSystem?: string;
  offers?: Record<string, unknown>;
}

export function softwareApplicationStructuredData({
  name,
  description,
  url,
  applicationCategory = "WebApplication",
  operatingSystem = "Web",
  offers = {},
}: SoftwareApplicationOptions): JsonObject {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description,
    url,
    applicationCategory,
    operatingSystem,
    offers:
      Object.keys(offers).length > 0
        ? { "@type": "Offer", ...offers }
        : { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author: {
      "@type": "Person",
      name: "Tomer Gelbhart",
      url: CANONICAL_BASE_URL,
    },
  };
}

export function contactPageStructuredData(): JsonObject {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact - gelbhart.dev",
    url: `${CANONICAL_BASE_URL}/contact`,
    description:
      "Get in touch with Tomer Gelbhart for internship opportunities, web development projects, or collaboration.",
    mainEntity: {
      "@type": "Person",
      name: "Tomer Gelbhart",
      email: "tomer@gelbhart.dev",
      url: CANONICAL_BASE_URL,
    },
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqStructuredData(questions: FaqItem[]): JsonObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((qa) => ({
      "@type": "Question",
      name: qa.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: qa.answer,
      },
    })),
  };
}

type Author = string | Record<string, unknown>;

const authorFor = (author: Author) =>
  typeof author === "object" ? author : { "@type": "Person", name: String(author) };

const publisher = () => ({
  "@type": "Organization",
  name: "gelbhart.dev",
  logo: {
    "@type": "ImageObject",
    url: assetUrl("logos/source/logo_social.svg"),
  },
});

export interface WebpageOptions {
  name: string;
  url: string;
  description?: string | null;
  datePublished?: DateLike | null;
  dateModified?: DateLike | null;
  author?: Author | null;
}

export function webpageStructuredData({
  name,
  url,
  description,
  datePublished,
  dateModified,
  author,
}: WebpageOptions): JsonObject {
  const data: JsonObject = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    url: absolute(url),
  };

  if (present(description)) data.description = description;
  if (present(datePublished)) data.datePublished = iso8601(datePublished);
  if (present(dateModified)) data.dateModified = iso8601(dateModified);

  data.author = present(author)
    ? authorFor(author)
    : { "@type": "Person", name: "Tomer Gelbhart", url: CANONICAL_BASE_URL };

  data.publisher = publisher();

  if (url === "/" || url === CANONICAL_BASE_URL || url === `${CANONICAL_BASE_URL}/`) {
    data.mainEntity = { "@type": "WebSite", "@id": CANONICAL_BASE_URL };
  }

  return data;
}

export type ImageInput = string | { url: string; width?: number; height?: number };

export interface ArticleOptions {
  title: string;
  url: string;
  description: string;
  datePublished?: DateLike | null;
  dateModified?: DateLike | null;
  image?: ImageInput | null;
  author?: Author | null;
  keywords?: string | null;
}

export function articleStructuredData({
  title,
  url,
  description,
  datePublished,
  dateModified,
  image,
  author,
  keywords,
}: ArticleOptions): JsonObject {
  const data: JsonObject = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    url: absolute(url),
    description,
  };

  if (present(datePublished)) data.datePublished = iso8601(datePublished);
  if (present(dateModified)) data.dateModified = iso8601(dateModified);
  if (present(keywords)) data.keywords = keywords;

  data.author = present(author)
    ? authorFor(author)
    : { "@type": "Person", name: "Tomer Gelbhart", url: CANONICAL_BASE_URL, sameAs: [...SAME_AS] };

  data.publisher = publisher();

  if (present(image)) {
    const imageUrl = typeof image === "object" ? image.url : image;
    const dims =
      typeof image === "object" && image.width ? { width: image.width, height: image.height } : socialImageDimensions();
    data.image = {
      "@type": "ImageObject",
      url: absoluteAsset(imageUrl),
      width: dims.width,
      height: dims.height,
    };
  }

  return data;
}

export interface ImageObjectOptions {
  url: string;
  width?: number | null;
  height?: number | null;
  caption?: string | null;
  altText?: string | null;
  contentUrl?: string | null;
}

export function imageObjectStructuredData({
  url,
  width,
  height,
  caption,
  altText,
  contentUrl,
}: ImageObjectOptions): JsonObject {
  const dims = width && height ? { width, height } : socialImageDimensions();
  const data: JsonObject = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    url: absoluteAsset(url),
    width: dims.width,
    height: dims.height,
  };

  if (present(caption)) data.caption = caption;
  if (present(altText)) data.alternateName = altText;
  if (present(contentUrl)) data.contentUrl = absoluteAsset(contentUrl);

  data.license = CANONICAL_BASE_URL;

  return data;
}

// Escape <, > and & so the payload cannot close the script tag.
export function jsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/[\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16)}`);
}
