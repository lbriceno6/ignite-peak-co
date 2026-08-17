update categories set slug = 'proteinas' where name ilike 'prote%' and (slug is null or trim(slug) = '');

update seo_meta s set noindex = false
from products p
where s.entity_id = p.id::text and s.entity_type = 'product'
  and s.noindex = true and p.is_active = true;
