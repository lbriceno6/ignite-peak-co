import { Mail, MessageCircle, MapPin, Clock } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const Contact = () => (
  <Layout>
    <section className="container-x py-16">
      <div className="max-w-2xl">
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent">Get in touch</span>
        <h1 className="mt-3 font-display text-5xl uppercase sm:text-6xl">We're here to help</h1>
        <p className="mt-3 text-muted-foreground">Questions about products, orders or your training plan? Our team replies within 24 hours.</p>
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
          {[
            { icon: MessageCircle, t: "WhatsApp", d: "+1 (415) 555-2671", note: "Fastest response" },
            { icon: Mail, t: "Email", d: "support@voltra.com", note: "Within 24h" },
            { icon: MapPin, t: "Headquarters", d: "Carrer de la Marina 16, Barcelona", note: "Spain" },
            { icon: Clock, t: "Hours", d: "Mon–Sat · 9am – 8pm", note: "CET" },
          ].map((c) => (
            <div key={c.t} className="flex gap-3 rounded-lg border p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/15 text-accent"><c.icon size={18} /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{c.t}</p>
                <p className="font-semibold">{c.d}</p>
                <p className="text-xs text-muted-foreground">{c.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  </Layout>
);

export default Contact;
