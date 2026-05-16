import { Helmet } from "react-helmet-async";

const SITE_URL = "https://ignite-peak-co.lovable.app";
const SITE_NAME = "Voltra Nutrition";

type Props = {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

export const SEO = ({ title, description, path = "", image, type = "website", publishedTime, jsonLd }: Props) => {
  const url = `${SITE_URL}${path}`;
  const fullTitle = title.length > 60 ? title.slice(0, 57) + "…" : title;
  const desc = description ? (description.length > 160 ? description.slice(0, 157) + "…" : description) : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {desc && <meta name="description" content={desc} />}
      <link rel="canonical" href={url} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      {image && <meta property="og:image" content={image} />}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      {desc && <meta name="twitter:description" content={desc} />}
      {image && <meta name="twitter:image" content={image} />}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};
