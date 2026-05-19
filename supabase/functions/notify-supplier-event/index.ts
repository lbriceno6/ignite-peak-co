import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

type Event = 'new' | 'resubmit' | 'approved' | 'rejected' | 'suspended'

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  let body: { event: Event; supplier_id: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  if (!body.event || !body.supplier_id) return json({ error: 'event and supplier_id required' }, 400)

  const { data: sup } = await supabase
    .from('suppliers')
    .select('id, business_name, email, user_id, rejection_reason')
    .eq('id', body.supplier_id)
    .maybeSingle()
  if (!sup) return json({ error: 'supplier not found' }, 404)

  const reason = body.reason ?? sup.rejection_reason ?? null

  const invoke = async (
    template: 'supplier-status-update' | 'admin-supplier-event',
    to: string,
    data: Record<string, unknown>,
    idem: string,
  ) => {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          templateName: template,
          recipientEmail: to,
          idempotencyKey: idem,
          templateData: data,
        }),
      })
      if (!res.ok) console.error('send failed', template, to, await res.text())
    } catch (e) {
      console.error('send error', e)
    }
  }

  // Recipient: supplier
  let supplierEmail = sup.email as string | null
  if (!supplierEmail && sup.user_id) {
    const { data: prof } = await supabase.from('profiles').select('email').eq('id', sup.user_id).maybeSingle()
    supplierEmail = (prof?.email as string) ?? null
  }

  // Admin recipients
  const { data: admins } = await supabase
    .from('user_roles')
    .select('user_id, profiles:profiles!inner(email)')
    .eq('role', 'admin')
  const adminEmails: string[] = ((admins ?? []) as any[])
    .map((r) => r?.profiles?.email)
    .filter((e: string | null): e is string => !!e)

  const idemBase = `${body.event}-${sup.id}-${Date.now()}`

  if (body.event === 'new' || body.event === 'resubmit') {
    for (const e of adminEmails) {
      await invoke('admin-supplier-event', e, {
        businessName: sup.business_name,
        event: body.event,
        contactEmail: supplierEmail,
      }, `admin-${idemBase}-${e}`)
    }
  }

  if ((body.event === 'approved' || body.event === 'rejected' || body.event === 'suspended') && supplierEmail) {
    await invoke('supplier-status-update', supplierEmail, {
      businessName: sup.business_name,
      status: body.event,
      reason,
    }, `supplier-${idemBase}`)
  }

  return json({ ok: true, supplierEmail, adminEmails: adminEmails.length })
})
