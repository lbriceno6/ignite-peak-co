
-- Helper macro pattern: drop existing permissive INSERT policy and replace with ownership-checked one

-- combo_events
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='combo_events' AND cmd='INSERT'
  LOOP EXECUTE format('DROP POLICY %I ON public.combo_events', p.policyname); END LOOP;
END $$;
CREATE POLICY "Insert combo events with own user_id" ON public.combo_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- dynamic_pricing_logs
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='dynamic_pricing_logs' AND cmd='INSERT'
  LOOP EXECUTE format('DROP POLICY %I ON public.dynamic_pricing_logs', p.policyname); END LOOP;
END $$;
CREATE POLICY "Insert dynamic pricing logs with own user_id" ON public.dynamic_pricing_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- lucia_events
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='lucia_events' AND cmd='INSERT'
  LOOP EXECUTE format('DROP POLICY %I ON public.lucia_events', p.policyname); END LOOP;
END $$;
CREATE POLICY "Insert lucia events with own user_id" ON public.lucia_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- product_events
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='product_events' AND cmd='INSERT'
  LOOP EXECUTE format('DROP POLICY %I ON public.product_events', p.policyname); END LOOP;
END $$;
CREATE POLICY "Insert product events with own user_id" ON public.product_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- search_logs
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='search_logs' AND cmd='INSERT'
  LOOP EXECUTE format('DROP POLICY %I ON public.search_logs', p.policyname); END LOOP;
END $$;
CREATE POLICY "Insert search logs with own user_id" ON public.search_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- visitor_tracking
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='visitor_tracking' AND cmd='INSERT'
  LOOP EXECUTE format('DROP POLICY %I ON public.visitor_tracking', p.policyname); END LOOP;
END $$;
CREATE POLICY "Insert visitor tracking with own user_id" ON public.visitor_tracking
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- review_helpful_votes: restrict DELETE to authenticated users only
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='review_helpful_votes' AND cmd='DELETE'
  LOOP EXECUTE format('DROP POLICY %I ON public.review_helpful_votes', p.policyname); END LOOP;
END $$;
CREATE POLICY "Users can delete their own helpful votes" ON public.review_helpful_votes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- suppliers: hide sensitive columns from anonymous visitors via column-level REVOKE
REVOKE SELECT (email, phone, contact_name, tax_id, payout_method, payout_account, commission_percent, rejection_reason, notes)
  ON public.suppliers FROM anon;
