// Port of app/helpers/application_helper.rb. Object key order follows the Ruby hash order.

export const CANONICAL_BASE_URL = "https://gelbhart.dev";
export const DEFAULT_META_DESCRIPTION =
  "Personal portfolio and development projects by Tomer Gelbhart. " +
  "Full-stack developer specializing in Ruby on Rails and modern web applications.";

type JsonObject = Record<string, unknown>;
type DateLike = Date | string;

const SAME_AS = ["https://www.linkedin.com/in/tomer-gelbhart/", "https://github.com/gelbh"];

const present = (v: unknown): boolean =>
  v !== null && v !== undefined && v !== false && !(typeof v === "string" && v.trim() === "");

const isAbsolute = (url: string | undefined | null): url is string => present(url) && url!.startsWith("http");

const absolute = (url: string) => (isAbsolute(url) ? url : `${CANONICAL_BASE_URL}${url}`);

// Ruby Time#iso8601: seconds precision, no milliseconds.
const iso8601 = (d: DateLike) => (typeof d === "string" ? d : d.toISOString().replace(/\.\d{3}Z$/, "Z"));

// Rails asset_url against the production host; the static build serves assets undigested.
export function assetUrl(path: string): string {
  return path.startsWith("/") ? `${CANONICAL_BASE_URL}${path}` : `${CANONICAL_BASE_URL}/assets/${path}`;
}

// ERB::Util.html_escape, which content_for applies to plain strings before the layout reads them.
export function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function pageTitle(title: string): string {
  const baseTitle = "gelbhart.dev";
  return title === "" ? baseTitle : `${title} | ${baseTitle}`;
}

// Rails request.path for a built page: build.format "file" gives Astro.url.pathname like /index.html or /contact.html.
export function requestPath(pathname: string): string {
  const path = pathname.replace(/\.html$/, "").replace(/\/index$/, "");
  return path === "" ? "/" : path;
}

export function canonicalUrl(path: string): string {
  return `${CANONICAL_BASE_URL}${path || "/"}`;
}

// meta_description: String#truncate(157, separator: " ", omission: "") then strip.
export function metaDescription(description: string): string {
  if (description.length <= 157) return description.trim();
  const stop = description.lastIndexOf(" ", 157);
  return description.slice(0, stop === -1 ? 157 : stop).trim();
}

// og_type for a request path when the page does not set one.
export function ogTypeFor(path: string): string {
  if (path === "/") return "website";
  if (path === "/contact") return "profile";
  return /\/projects\/(video-captioner|nasa-exoplanet-explorer|hevy-tracker)/.test(path) ? "article" : "website";
}

export const socialImageUrl = () => assetUrl("logos/social/logo_social.png");
export const socialImageDimensions = () => ({ width: 1200, height: 630 });

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

// Items without a url fall back to the current page URL (Rails used request.original_url).
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
  if (present(datePublished)) data.datePublished = iso8601(datePublished!);
  if (present(dateModified)) data.dateModified = iso8601(dateModified!);

  data.author = present(author)
    ? authorFor(author!)
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

  if (present(datePublished)) data.datePublished = iso8601(datePublished!);
  if (present(dateModified)) data.dateModified = iso8601(dateModified!);
  if (present(keywords)) data.keywords = keywords;

  data.author = present(author)
    ? authorFor(author!)
    : { "@type": "Person", name: "Tomer Gelbhart", url: CANONICAL_BASE_URL, sameAs: [...SAME_AS] };

  data.publisher = publisher();

  if (present(image)) {
    const imageUrl = typeof image === "object" ? image!.url : (image as string);
    const dims =
      typeof image === "object" && image!.width
        ? { width: image!.width, height: image!.height }
        : socialImageDimensions();
    data.image = {
      "@type": "ImageObject",
      url: isAbsolute(imageUrl) ? imageUrl : assetUrl(imageUrl),
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
    url: isAbsolute(url) ? url : assetUrl(url),
    width: dims.width,
    height: dims.height,
  };

  if (present(caption)) data.caption = caption;
  if (present(altText)) data.alternateName = altText;
  if (present(contentUrl)) data.contentUrl = isAbsolute(contentUrl) ? contentUrl : assetUrl(contentUrl!);

  data.license = CANONICAL_BASE_URL;

  return data;
}

// render_structured_data: Rails to_json escapes <, > and & so the payload cannot close the script tag.
export function jsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/[\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16)}`);
}
