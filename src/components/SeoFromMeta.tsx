import { SEO } from "@/components/SEO";
import { useSeoMeta, type SeoEntityType } from "@/hooks/useSeoMeta";

type Props = {
  entityType: SeoEntityType;
  entityId: string | null | undefined;
  path: string;
  fallbackTitle: string;
  fallbackDescription?: string;
  fallbackImage?: string | null;
  type?: "website" | "article";
  publishedTime?: string;
  extraJsonLd?: Record<string, unknown>[];
};

export const SeoFromMeta = ({
  entityType, entityId, path,
  fallbackTitle, fallbackDescription, fallbackImage,
  type = "website", publishedTime, extraJsonLd,
}: Props) => {
  const { data } = useSeoMeta(entityType, entityId ?? null);
  const d = data as any;

  const title = d?.seo_title || fallbackTitle;
  const description = d?.seo_description || fallbackDescription;
  const image = d?.og_image || fallbackImage || undefined;

  const blocks: Record<string, unknown>[] = [];
  if (d?.schema_jsonld) {
    if (Array.isArray(d.schema_jsonld)) blocks.push(...(d.schema_jsonld as Record<string, unknown>[]));
    else blocks.push(d.schema_jsonld as Record<string, unknown>);
  }
  if (extraJsonLd?.length) blocks.push(...extraJsonLd);

  const robots = d?.robots_directive || (d?.noindex ? "noindex,follow" : undefined);

  return (
    <SEO
      title={title}
      description={description}
      path={path}
      image={image}
      type={type}
      publishedTime={publishedTime}
      jsonLd={blocks.length ? blocks : undefined}
      robots={robots}
      canonical={d?.canonical || undefined}
      siteName={d?.og_site_name || undefined}
      ogTitle={d?.og_title || undefined}
      ogDescription={d?.og_description || undefined}
      twitterTitle={d?.twitter_title || undefined}
      twitterDescription={d?.twitter_description || undefined}
      twitterImage={d?.twitter_image || undefined}
    />
  );
};
