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
  /** Extra JSON-LD blocks to merge with seo_meta.schema_jsonld */
  extraJsonLd?: Record<string, unknown>[];
};

/**
 * SEO wrapper that reads overrides from public.seo_meta and falls back
 * to entity-provided values. Used on product, blog and category pages.
 */
export const SeoFromMeta = ({
  entityType, entityId, path,
  fallbackTitle, fallbackDescription, fallbackImage,
  type = "website", publishedTime, extraJsonLd,
}: Props) => {
  const { data } = useSeoMeta(entityType, entityId ?? null);

  const title = data?.seo_title || fallbackTitle;
  const description = data?.seo_description || fallbackDescription;
  const image = data?.og_image || fallbackImage || undefined;

  const blocks: Record<string, unknown>[] = [];
  if (data?.schema_jsonld) {
    if (Array.isArray(data.schema_jsonld)) blocks.push(...(data.schema_jsonld as Record<string, unknown>[]));
    else blocks.push(data.schema_jsonld as Record<string, unknown>);
  }
  if (extraJsonLd?.length) blocks.push(...extraJsonLd);

  if (data?.noindex) {
    return (
      <SEO
        title={title}
        description={description}
        path={path}
        image={image}
        type={type}
        publishedTime={publishedTime}
        jsonLd={blocks.length ? blocks : undefined}
      />
    );
  }

  return (
    <SEO
      title={title}
      description={description}
      path={path}
      image={image}
      type={type}
      publishedTime={publishedTime}
      jsonLd={blocks.length ? blocks : undefined}
    />
  );
};
