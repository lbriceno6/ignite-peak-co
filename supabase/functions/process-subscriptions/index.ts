import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  // SECURITY: this endpoint mutates every user's orders/subscriptions and must
  // only be reachable from trusted server callers (cron / admin scripts) using
  // the service role key.
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ') || authHeader.slice(7) !== serviceKey) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceKey,
  );

  try {
    const now = new Date().toISOString();
    const { data: due, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .lte('next_delivery_at', now)
      .limit(200);
    if (error) throw error;

    const results: any[] = [];
    for (const s of due ?? []) {
      // fetch shipping defaults from latest order
      const { data: lastOrder } = await supabase
        .from('orders')
        .select('shipping_name,shipping_phone,shipping_address,shipping_city,shipping_postal_code,shipping_country,payment_method')
        .eq('user_id', s.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const subtotal = Number(s.unit_price) * s.quantity;
      const total = subtotal;

      const { data: order, error: oErr } = await supabase
        .from('orders')
        .insert({
          user_id: s.user_id,
          subtotal,
          shipping: 0,
          total,
          payment_method: lastOrder?.payment_method ?? 'card',
          status: 'pending',
          shipping_name: lastOrder?.shipping_name,
          shipping_phone: lastOrder?.shipping_phone,
          shipping_address: lastOrder?.shipping_address,
          shipping_city: lastOrder?.shipping_city,
          shipping_postal_code: lastOrder?.shipping_postal_code,
          shipping_country: lastOrder?.shipping_country,
        })
        .select('id, order_code')
        .single();

      if (oErr || !order) { results.push({ sub: s.id, error: oErr?.message }); continue; }

      await supabase.from('order_items').insert({
        order_id: order.id,
        product_slug: s.product_slug,
        product_name: s.product_name,
        product_image: s.product_image,
        variant: s.variant,
        quantity: s.quantity,
        unit_price: s.unit_price,
        purchase_type: 'subscription',
        subscription_interval_days: s.interval_days,
      });

      const next = new Date();
      next.setDate(next.getDate() + s.interval_days);

      await supabase.from('subscriptions').update({
        next_delivery_at: next.toISOString(),
        last_order_id: order.id,
        last_processed_at: now,
      }).eq('id', s.id);

      results.push({ sub: s.id, order: order.order_code });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
