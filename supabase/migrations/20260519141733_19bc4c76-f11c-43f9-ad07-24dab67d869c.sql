
-- 1. rejection_reason on suppliers
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 2. Allow supplier to resubmit (rejected -> pending) by relaxing protect_supplier_fields
CREATE OR REPLACE FUNCTION public.protect_supplier_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  -- Allow only a resubmission transition: rejected -> pending
  IF OLD.status = 'rejected' AND NEW.status = 'pending' THEN
    NEW.commission_percent := OLD.commission_percent;
    NEW.user_id := OLD.user_id;
    NEW.slug := OLD.slug;
    NEW.rejection_reason := NULL;
    RETURN NEW;
  END IF;
  NEW.status := OLD.status;
  NEW.commission_percent := OLD.commission_percent;
  NEW.user_id := OLD.user_id;
  NEW.slug := OLD.slug;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS protect_supplier_fields_trg ON public.suppliers;
CREATE TRIGGER protect_supplier_fields_trg
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.protect_supplier_fields();

-- 3. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, read_at, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Helper: notify all admins
CREATE OR REPLACE FUNCTION public.notify_admins(_type text, _title text, _body text, _link text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT user_id, _type, _title, _body, _link
  FROM public.user_roles WHERE role = 'admin';
END $$;

CREATE OR REPLACE FUNCTION public.notify_user(_user uuid, _type text, _title text, _body text, _link text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (_user, _type, _title, _body, _link);
END $$;

-- 5. Supplier triggers
CREATE OR REPLACE FUNCTION public.on_supplier_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_admins(
      'supplier_new',
      'Nuevo proveedor: ' || NEW.business_name,
      'Una nueva marca solicitó vender en el marketplace.',
      '/admin/suppliers'
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM public.notify_user(NEW.user_id, 'supplier_approved',
        '¡Tu tienda fue aprobada!',
        'Ya puedes empezar a publicar productos en el marketplace.',
        '/supplier');
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.notify_user(NEW.user_id, 'supplier_rejected',
        'Tu solicitud fue rechazada',
        COALESCE(NEW.rejection_reason, 'Revisa los datos y vuelve a enviar tu solicitud.'),
        '/supplier');
    ELSIF NEW.status = 'suspended' THEN
      PERFORM public.notify_user(NEW.user_id, 'supplier_suspended',
        'Tu cuenta fue suspendida',
        'Contáctanos para resolver el estado de tu cuenta.',
        '/supplier');
    ELSIF NEW.status = 'pending' AND OLD.status = 'rejected' THEN
      PERFORM public.notify_admins('supplier_resubmit',
        'Reenvío de solicitud: ' || NEW.business_name,
        'Un proveedor rechazado volvió a enviar su solicitud.',
        '/admin/suppliers');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_supplier_change_trg ON public.suppliers;
CREATE TRIGGER on_supplier_change_trg
AFTER INSERT OR UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.on_supplier_change();

-- 6. Product approval triggers
CREATE OR REPLACE FUNCTION public.on_product_approval_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_supplier_user uuid;
BEGIN
  SELECT user_id INTO v_supplier_user FROM public.suppliers WHERE id = NEW.supplier_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.approval_status = 'pending' AND NEW.supplier_id IS NOT NULL THEN
      PERFORM public.notify_admins('product_pending',
        'Producto pendiente de revisión',
        'Nuevo producto enviado: ' || NEW.name,
        '/admin/suppliers');
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
    IF NEW.approval_status = 'pending' AND NEW.supplier_id IS NOT NULL THEN
      PERFORM public.notify_admins('product_pending',
        'Producto pendiente de revisión',
        'Actualización pendiente: ' || NEW.name,
        '/admin/suppliers');
    ELSIF NEW.approval_status = 'approved' THEN
      PERFORM public.notify_user(v_supplier_user, 'product_approved',
        'Producto aprobado',
        '"' || NEW.name || '" ya está visible en la tienda.',
        '/supplier/products');
    ELSIF NEW.approval_status = 'rejected' THEN
      PERFORM public.notify_user(v_supplier_user, 'product_rejected',
        'Producto rechazado',
        COALESCE(NEW.rejection_reason, 'Tu producto "' || NEW.name || '" fue rechazado.'),
        '/supplier/products');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_product_approval_change_trg ON public.products;
CREATE TRIGGER on_product_approval_change_trg
AFTER INSERT OR UPDATE OF approval_status ON public.products
FOR EACH ROW EXECUTE FUNCTION public.on_product_approval_change();

-- 7. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
