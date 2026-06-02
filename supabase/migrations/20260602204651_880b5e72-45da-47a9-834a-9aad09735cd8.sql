-- Migrate products_carousel_config into home_blocks settings for best_sellers blocks.
-- Only applies when the block has empty/null settings so manual edits are preserved.
WITH cfg AS (
  SELECT * FROM public.products_carousel_config ORDER BY updated_at DESC LIMIT 1
)
UPDATE public.home_blocks hb
SET
  title    = COALESCE(NULLIF(hb.title, ''), cfg.title),
  subtitle = COALESCE(NULLIF(hb.subtitle, ''), cfg.subtitle),
  is_active = COALESCE(cfg.is_active, hb.is_active),
  settings = jsonb_build_object(
    'productSource',     cfg.source,
    'totalProducts',     cfg.total_items,
    'desktopPerView',    cfg.visible_desktop,
    'tabletPerView',     cfg.visible_tablet,
    'mobilePerView',     cfg.visible_mobile,
    'autoplay',          cfg.autoplay,
    'autoplaySpeed',     cfg.autoplay_speed,
    'showArrows',        cfg.show_arrows,
    'showDots',          cfg.show_dots,
    'loop',              true,
    'pauseOnHover',      true,
    'showViewAllButton', cfg.show_view_all,
    'viewAllLabel',      cfg.view_all_label,
    'viewAllHref',       cfg.view_all_href,
    'manualProductSlugs', COALESCE(cfg.manual_slugs, '[]'::jsonb),
    'categorySlug',      '',
    'brandId',           '',
    'tag',               ''
  )
FROM cfg
WHERE hb.block_type = 'best_sellers'
  AND (hb.settings IS NULL OR hb.settings = '{}'::jsonb OR NOT (hb.settings ? 'productSource'));