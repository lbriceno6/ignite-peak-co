import { Mail, MessageCircle, MapPin, Clock } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSiteContent } from "@/hooks/useSiteContent";

const KEYS = [
  "contact_eyebrow","contact_title","contact_intro",
  "contact_whatsapp_value","contact_whatsapp_note",
  "contact_email_value","contact_email_note",
  "contact_address_value","contact_address_note",
  "contact_hours_value","contact_hours_note",
];

const DEFAULTS = {
  contact_eyebrow: "Get in touch",
  contact_title: "We're here to help",
  contact_intro: "Questions about products, orders or your training plan? Our team replies within 24 hours.",
  contact_whatsapp_value: "+1 (415) 555-2671", contact_whatsapp_note: "Fastest response",
  contact_email_value: "support@voltra.com", contact_email_note: "Within 24h",
  contact_address_value: "Carrer de la Marina 16, Barcelona", contact_address_note: "Spain",
  contact_hours_value: "Mon–Sat · 9am – 8pm", contact_hours_note: "CET",
};

const Contact = () => {
  const { content: c } = useSiteContent(KEYS, DEFAULTS);
  const cards = [
    { icon: MessageCircle, t: "WhatsApp", d: c.contact_whatsapp_value, note: c.contact_whatsapp_note },
    { icon: Mail, t: "Email", d: c.contact_email_value, note: c.contact_email_note },
    { icon: MapPin, t: "Headquarters", d: c.contact_address_value, note: c.contact_address_note },
    { icon: Clock, t: "Hours", d: c.contact_hours_value, note: c.contact_hours_note },
  ];
  return (
    <Layout>
      <section className="container-x py-16">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent">{c.contact_eyebrow}</span>
          <h1 className="mt-3 font-display text-5xl uppercase sm:text-6xl">{c.contact_title}</h1>
          <p className="mt-3 text-muted-foreground">{c.contact_intro}</p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_360px]">
          <form className="rounded-lg border p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Name</Label><Input className="mt-1.5" /></div>
              <div><Label>Email</Label><Input type="email" className="mt-1.5" /></div>
            </div>
            <div><Label>Subject</Label><Input className="mt-1.5" /></div>
            <div><Label>Message</Label><Textarea rows={6} className="mt-1.5" /></div>
            <Button size="lg" variant="accent" type="submit">Send message</Button>
          </form>

          <div className="space-y-4">
            {cards.map((card) => (
              <div key={card.t} className="flex gap-3 rounded-lg border p-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/15 text-accent"><card.icon size={18} /></div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{card.t}</p>
                  <p className="font-semibold">{card.d}</p>
                  <p className="text-xs text-muted-foreground">{card.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
