CREATE OR REPLACE FUNCTION public.validate_product_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean := public.has_role(auth.uid(), 'admin');
BEGIN
  IF NEW.price IS NULL OR NEW.price <= 0 THEN
    RAISE EXCEPTION 'El precio debe ser mayor a 0';
  END IF;

  IF NEW.sale_price IS NOT NULL THEN
    IF NEW.sale_price <= 0 OR NEW.sale_price > NEW.price THEN
      RAISE EXCEPTION 'El precio de oferta debe ser mayor a 0 y menor o igual al precio';
    END IF;
  END IF;

  IF NEW.subscription_discount_percent IS NOT NULL
     AND (NEW.subscription_discount_percent < 0 OR NEW.subscription_discount_percent > 50) THEN
    RAISE EXCEPTION 'El descuento de suscripción debe estar entre 0 y 50';
  END IF;

  IF NEW.stock IS NOT NULL AND NEW.stock < 0 THEN
    RAISE EXCEPTION 'El stock no puede ser negativo';
  END IF;

  IF NOT _is_admin THEN
    -- Rating is computed from reviews; suppliers cannot set it.
    IF TG_OP = 'INSERT' THEN
      NEW.rating := 0;
      IF NEW.supplier_id IS DISTINCT FROM public.current_supplier_id() THEN
        RAISE EXCEPTION 'No autorizado para asignar otro proveedor';
      END IF;
    ELSE
      NEW.rating := OLD.rating;
      IF NEW.supplier_id IS DISTINCT FROM OLD.supplier_id THEN
        RAISE EXCEPTION 'No autorizado para cambiar el proveedor del producto';
      END IF;
      IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
        NEW.rejection_reason := OLD.rejection_reason;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_product_pricing ON public.products;
CREATE TRIGGER trg_validate_product_pricing
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.validate_product_pricing();