import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Instagram, Youtube, Facebook, MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useSiteContent } from "@/hooks/useSiteContent";

type FooterLink = {
  id: string;
  column_index: number;
  label: string;
  href: string;
  open_in_new_tab: boolean;
};

const KEYS = [
  "logo_text", "logo_accent", "logo_image_url",
  "footer_description", "footer_newsletter_title", "footer_newsletter_help",
  "footer_col1_title", "footer_col2_title", "footer_col3_title",
  "footer_copyright", "footer_payment_badges",
  "footer_social_instagram", "footer_social_youtube", "footer_social_facebook",
  "footer_social_whatsapp", "footer_social_email",
];

const DEFAULTS: Record<string, string> = {
  logo_text: "VOLT", logo_accent: "RA", logo_image_url: "",
  footer_description: "Premium nutrition and supplements engineered to fuel your training, recovery and everyday wellness.",
  footer_newsletter_title: "Join the inner circle",
  footer_newsletter_help: "Get 10% off your first order. No spam.",
  footer_col1_title: "Shop",
  footer_col2_title: "Company",
  footer_col3_title: "Help",
  footer_copyright: "© {year} Voltra Nutrition. All rights reserved.",
  footer_payment_badges: "VISA,MASTERCARD,AMEX,PAYPAL,APPLE PAY,G PAY",
};

const renderLink = (l: FooterLink) => {
  const isExternal = /^(https?:|mailto:|tel:)/.test(l.href);
  if (isExternal || l.open_in_new_tab) {
    return (
      <a key={l.id} href={l.href} target={l.open_in_new_tab ? "_blank" : undefined} rel="noopener noreferrer" className="hover:text-accent">
        {l.label}
      </a>
    );
  }
  return <Link key={l.id} to={l.href} className="hover:text-accent">{l.label}</Link>;
};

export const Footer = () => {
  const { content } = useSiteContent(KEYS, DEFAULTS);
  const [links, setLinks] = useState<FooterLink[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("footer_links")
        .select("id,column_index,label,href,open_in_new_tab,is_active,sort_order")
        .eq("is_active", true)
        .order("column_index")
        .order("sort_order");
      if (alive) setLinks((data as FooterLink[]) ?? []);
    })();
    return () => { alive = false; };
  }, []);

  const col = (idx: number) => links.filter((l) => l.column_index === idx);
  const socials: Array<{ key: string; Icon: any; aria: string }> = [
    { key: "footer_social_instagram", Icon: Instagram, aria: "Instagram" },
    { key: "footer_social_youtube", Icon: Youtube, aria: "YouTube" },
    { key: "footer_social_facebook", Icon: Facebook, aria: "Facebook" },
    { key: "footer_social_whatsapp", Icon: MessageCircle, aria: "WhatsApp" },
    { key: "footer_social_email", Icon: Mail, aria: "Email" },
  ];
  const badges = (content.footer_payment_badges ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const year = new Date().getFullYear();
  const copyright = (content.footer_copyright || "").replace("{year}", String(year));

  return (
    <footer className="bg-surface-darker text-background mt-20">
      <div className="container-x py-16">
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center">
              {content.logo_image_url ? (
                <img src={content.logo_image_url} alt="Logo" className="h-10 w-auto object-contain" />
              ) : (
                <span className="font-display text-3xl">
                  {content.logo_text}<span className="text-accent">{content.logo_accent}</span>
                </span>
              )}
            </Link>
            <p className="mt-4 max-w-sm text-sm text-background/60">{content.footer_description}</p>
            <form className="mt-6 max-w-sm" onSubmit={(e) => e.preventDefault()}>
              <label className="text-xs font-bold uppercase tracking-wider text-background/80">{content.footer_newsletter_title}</label>
              <div className="mt-2 flex gap-2">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  className="bg-background/10 border-background/20 text-background placeholder:text-background/50"
                />
                <Button type="submit" variant="accent">Subscribe</Button>
              </div>
              <p className="mt-2 text-xs text-background/50">{content.footer_newsletter_help}</p>
            </form>
            <div className="mt-6 flex gap-2">
              {socials.filter((s) => content[s.key]).map(({ key, Icon, aria }) => (
                <a
                  key={key}
                  href={content[key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-10 w-10 place-items-center rounded-full bg-background/10 hover:bg-accent hover:text-accent-foreground transition-smooth"
                  aria-label={aria}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {[1, 2, 3].map((idx) => (
            <div key={idx}>
              <h4 className="font-display text-lg">{content[`footer_col${idx}_title`]}</h4>
              <ul className="mt-4 space-y-2 text-sm text-background/70">
                {col(idx).map((l) => <li key={l.id}>{renderLink(l)}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-background/10 pt-6 text-xs text-background/50 md:flex-row md:items-center md:justify-between">
          <p>{copyright}</p>
          {badges.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {badges.map((p) => (
                <span key={p} className="rounded border border-background/20 px-2 py-1 font-bold tracking-wider">{p}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};
