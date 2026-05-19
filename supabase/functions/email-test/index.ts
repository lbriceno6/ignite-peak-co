import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Cfg {
  provider: string;
  from_name: string;
  from_email: string;
  reply_to: string;
  api_key: string;
  api_url: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
}

const html = (msg: string) =>
  `<div style="font-family:Arial,sans-serif;padding:24px;color:#111"><h2>${msg}</h2><p>Si recibes este correo, tu configuración de email funciona correctamente.</p><p style="color:#888;font-size:12px;margin-top:24px">Enviado desde el panel de administración.</p></div>`;

async function send(cfg: Cfg, to: string, subject: string, bodyHtml: string) {
  const from = cfg.from_name ? `${cfg.from_name} <${cfg.from_email}>` : cfg.from_email;
  const replyTo = cfg.reply_to || undefined;

  switch (cfg.provider) {
    case 'resend': {
      const r = await fetch(cfg.api_url || 'https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.api_key}` },
        body: JSON.stringify({ from, to: [to], subject, html: bodyHtml, reply_to: replyTo }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || JSON.stringify(j));
      return j;
    }
    case 'sendgrid': {
      const r = await fetch(cfg.api_url || 'https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.api_key}` },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: cfg.from_email, name: cfg.from_name },
          reply_to: replyTo ? { email: replyTo } : undefined,
          subject,
          content: [{ type: 'text/html', value: bodyHtml }],
        }),
      });
      if (!r.ok) throw new Error(`SendGrid ${r.status}: ${await r.text()}`);
      return { ok: true };
    }
    case 'mailgun': {
      const url = cfg.api_url || `https://api.mailgun.net/v3/${cfg.from_email.split('@')[1]}/messages`;
      const form = new URLSearchParams({ from, to, subject, html: bodyHtml });
      if (replyTo) form.set('h:Reply-To', replyTo);
      const r = await fetch(url, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + btoa(`api:${cfg.api_key}`) },
        body: form,
      });
      const t = await r.text();
      if (!r.ok) throw new Error(`Mailgun ${r.status}: ${t}`);
      return { ok: true, response: t };
    }
    case 'brevo': {
      const r = await fetch(cfg.api_url || 'https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': cfg.api_key },
        body: JSON.stringify({
          sender: { name: cfg.from_name, email: cfg.from_email },
          to: [{ email: to }],
          replyTo: replyTo ? { email: replyTo } : undefined,
          subject,
          htmlContent: bodyHtml,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || JSON.stringify(j));
      return j;
    }
    case 'postmark': {
      const r = await fetch(cfg.api_url || 'https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Postmark-Server-Token': cfg.api_key,
        },
        body: JSON.stringify({ From: from, To: to, Subject: subject, HtmlBody: bodyHtml, ReplyTo: replyTo }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.Message || JSON.stringify(j));
      return j;
    }
    case 'lovable':
      throw new Error('Para Lovable Cloud, el envío de pruebas se gestiona desde Cloud → Emails. Configura primero el dominio y los templates.');
    case 'smtp':
      throw new Error('SMTP personalizado aún no soportado para pruebas. Usa Resend/Brevo/Mailgun/SendGrid/Postmark o configura Lovable Cloud.');
    default:
      throw new Error(`Proveedor no soportado: ${cfg.provider}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Auth: require admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No autorizado');
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) throw new Error('No autorizado');
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    if (!roles?.some((r: any) => r.role === 'admin')) throw new Error('Solo administradores');

    const { action, recipient } = await req.json();

    const { data: rows } = await supabase
      .from('site_content')
      .select('key,value')
      .like('key', 'email.%');
    const cfg: any = {};
    (rows ?? []).forEach((r: any) => { cfg[r.key.replace('email.', '')] = r.value ?? ''; });

    if (!cfg.provider) throw new Error('Proveedor no configurado');
    if (!cfg.from_email) throw new Error('Falta el email del remitente');
    if (cfg.provider !== 'lovable' && !cfg.api_key && cfg.provider !== 'smtp') throw new Error('Falta el API key del proveedor');

    if (action === 'validate') {
      // Lightweight check: send to remitente
      const to = recipient || cfg.from_email;
      await send(cfg, to, '✅ Validación de credenciales', html('Credenciales válidas'));
      return new Response(JSON.stringify({ ok: true, message: `Credenciales OK. Email enviado a ${to}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'test') {
      const to = recipient || cfg.notify_admin_email || cfg.from_email;
      if (!to) throw new Error('Indica un destinatario');
      await send(cfg, to, '✉️ Email de prueba', html(`Email de prueba desde ${cfg.from_name || cfg.from_email}`));
      return new Response(JSON.stringify({ ok: true, message: `Email de prueba enviado a ${to}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Acción inválida');
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message ?? String(e) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
