import { Helmet } from "react-helmet-async";

const SITE_URL = "https://ignite-peak-co.lovable.app";
const SITE_NAME = "Voltra Nutrition";
const DEFAULT_OG_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ab92b0f7-8a4a-4391-9bed-0931f1af1340/id-preview-91df73ee--ace85f94-64f0-4daa-a974-2aa900bc3a79.lovable.app-1778858363091.png";

const toAbsolute = (u?: string | null): string | undefined => {
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("//")) return `https:${u}`;
  return `${SITE_URL}${u.startsWith("/") ? "" : "/"}${u}`;
};

type Props = {
  title: string;
  description?: string;
  path?: string;
  image?: string | null;
  type?: "website" | "article";
  publishedTime?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  robots?: string;
  canonical?: string;
  siteName?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string | null;
};

export const SEO = ({
  title, description, path = "", image, type = "website", publishedTime, jsonLd, robots,
  canonical, siteName, ogTitle, ogDescription, twitterTitle, twitterDescription, twitterImage,
}: Props) => {
  const url = canonical && /^https?:\/\//i.test(canonical)
    ? canonical
    : `${SITE_URL}${canonical ?? path}`;
  const fullTitle = title.length > 60 ? title.slice(0, 57) + "…" : title;
  const desc = description ? (description.length > 160 ? description.slice(0, 157) + "…" : description) : undefined;
  const ogImage = toAbsolute(image) ?? DEFAULT_OG_IMAGE;
  const twImage = toAbsolute(twitterImage) ?? ogImage;
  const ogT = ogTitle || fullTitle;
  const ogD = ogDescription || desc;
  const twT = twitterTitle || ogT;
  const twD = twitterDescription || ogD;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {desc && <meta name="description" content={desc} />}
      {robots && <meta name="robots" content={robots} />}
      <link rel="canonical" href={url} />
      <meta property="og:site_name" content={siteName || SITE_NAME} />
      <meta property="og:title" content={ogT} />
      {ogD && <meta property="og:description" content={ogD} />}
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImage} />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={twT} />
      {twD && <meta name="twitter:description" content={twD} />}
      <meta name="twitter:image" content={twImage} />
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};

export { toAbsolute as toAbsoluteUrl, DEFAULT_OG_IMAGE };
