import { isIP } from "node:net";
import { resolve4, resolve6 } from "node:dns/promises";
import { z } from "zod";

const MAX_HTML_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;

const sourceSchema = z.string().trim().min(2).max(500);

export type ExtractedLink = {
  label: string;
  url: string;
  type: "booking" | "ordering" | "delivery" | "social";
  provider: string | null;
};

export type ExtractedRestaurant = {
  source: string;
  sourceUrl: string | null;
  name: string;
  description: string;
  address: string;
  phone: string;
  heroImageUrl: string | null;
  pageText: string;
  links: ExtractedLink[];
};

const privateIpv4Patterns = [
  /^0\./,
  /^10\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.0\.0\./,
  /^192\.0\.2\./,
  /^192\.168\./,
  /^198\.(1[89])\./,
  /^198\.51\.100\./,
  /^203\.0\.113\./,
  /^2(2[4-9]|3\d)\./,
  /^2[4-5]\d\./,
];

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("::") ||
    normalized.startsWith("::ffff:") ||
    normalized.startsWith("64:ff9b:") ||
    normalized.startsWith("2001:db8:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("ff")
  ) {
    return true;
  }
  if (normalized.startsWith("fe80:")) return true;
  return privateIpv4Patterns.some((pattern) => pattern.test(address));
}

async function assertPublicUrl(url: URL): Promise<void> {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are supported");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("Local network addresses are not supported");
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new Error("Private network addresses are not supported");
    }
    return;
  }

  const addresses = (
    await Promise.allSettled([resolve4(hostname), resolve6(hostname)])
  ).flatMap((result) => (result.status === "fulfilled" ? result.value : []));

  if (addresses.length === 0) {
    throw new Error("The restaurant website could not be resolved");
  }

  if (addresses.some(isPrivateAddress)) {
    throw new Error("Private network addresses are not supported");
  }
}

async function readLimitedBody(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let html = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error("The restaurant website is too large to import safely");
    }
    html += decoder.decode(value, { stream: true });
  }

  return html + decoder.decode();
}

async function fetchHtml(initialUrl: URL): Promise<{
  html: string;
  finalUrl: URL;
}> {
  let url = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    await assertPublicUrl(url);
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Restofront Importer/1.0 (+https://restofront.com; restaurant preview builder)",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("The website returned an invalid redirect");
      url = new URL(location, url);
      continue;
    }

    if (!response.ok) {
      throw new Error(`The restaurant website returned HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      throw new Error("The supplied URL is not an HTML website");
    }

    return { html: await readLimitedBody(response), finalUrl: url };
  }

  throw new Error("The restaurant website redirected too many times");
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }
  return "";
}

function extractTitle(html: string): string {
  return (
    metaContent(html, "og:site_name") ||
    metaContent(html, "og:title") ||
    decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")
      .split(/[|–—]/)[0]
      .trim()
  );
}

function stripMarkup(html: string): string {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).slice(0, 32_000);
}

function detectProvider(url: string): string | null {
  const providers: Array<[RegExp, string]> = [
    [/opentable/i, "OpenTable"],
    [/sevenrooms/i, "SevenRooms"],
    [/resy/i, "Resy"],
    [/thefork|lafourchette/i, "TheFork"],
    [/quandoo/i, "Quandoo"],
    [/bookatable/i, "Bookatable"],
    [/toasttab/i, "Toast"],
    [/square\.site|squareup/i, "Square"],
    [/ubereats/i, "Uber Eats"],
    [/deliveroo/i, "Deliveroo"],
    [/wolt/i, "Wolt"],
    [/just-eat|justeat/i, "Just Eat"],
  ];
  return providers.find(([pattern]) => pattern.test(url))?.[1] ?? null;
}

function classifyLink(label: string, url: string): ExtractedLink["type"] | null {
  const haystack = `${label} ${url}`.toLowerCase();
  if (/instagram|facebook|tiktok|linkedin/.test(haystack)) return "social";
  if (/deliveroo|ubereats|wolt|just.?eat|delivery/.test(haystack)) {
    return "delivery";
  }
  if (/book|reservation|reserve|opentable|sevenrooms|resy|thefork|quandoo/.test(haystack)) {
    return "booking";
  }
  if (/order|takeaway|takeout|collection|toasttab|square/.test(haystack)) {
    return "ordering";
  }
  return null;
}

function extractLinks(html: string, baseUrl: URL): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const anchorPattern =
    /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorPattern.exec(html)) !== null && links.length < 30) {
    try {
      const url = new URL(match[1], baseUrl).toString();
      const label = decodeHtml(match[2].replace(/<[^>]+>/g, " ")).slice(0, 80);
      const type = classifyLink(label, url);
      if (!type) continue;
      if (links.some((link) => link.url === url)) continue;
      links.push({
        type,
        label:
          label ||
          (type === "booking"
            ? "Book a table"
            : type === "social"
              ? "Follow us"
              : "Order online"),
        provider: detectProvider(url),
        url,
      });
    } catch {
      // Ignore malformed links from the source website.
    }
  }

  return links;
}

function extractContact(pageText: string): { address: string; phone: string } {
  const phone =
    pageText.match(
      /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}/,
    )?.[0] ?? "";
  return { address: "", phone };
}

export async function inspectSource(rawSource: string): Promise<ExtractedRestaurant> {
  const source = sourceSchema.parse(rawSource);
  const looksLikeUrl = /^(https?:\/\/|www\.)/i.test(source);

  if (!looksLikeUrl) {
    return {
      source,
      sourceUrl: null,
      name: source,
      description: "",
      address: "",
      phone: "",
      heroImageUrl: null,
      pageText: source,
      links: [],
    };
  }

  const normalized = /^https?:\/\//i.test(source) ? source : `https://${source}`;
  const { html, finalUrl } = await fetchHtml(new URL(normalized));
  const pageText = stripMarkup(html);
  const contact = extractContact(pageText);
  const hero = metaContent(html, "og:image");

  return {
    source,
    sourceUrl: finalUrl.toString(),
    name: extractTitle(html) || finalUrl.hostname.replace(/^www\./, ""),
    description:
      metaContent(html, "og:description") ||
      metaContent(html, "description"),
    address: contact.address,
    phone: contact.phone,
    heroImageUrl: hero ? new URL(hero, finalUrl).toString() : null,
    pageText,
    links: extractLinks(html, finalUrl),
  };
}
