import { Link } from "react-router-dom";
import { Instagram, Youtube, Facebook, MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories } from "@/data/catalog";

export const Footer = () => (
  <footer className="bg-surface-darker text-background mt-20">
    <div className="container-x py-16">
      <div className="grid gap-12 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link to="/" className="font-display text-3xl">
            VOLT<span className="text-accent">RA</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm text-background/60">
            Premium nutrition and supplements engineered to fuel your training, recovery and everyday wellness.
          </p>
          <form className="mt-6 max-w-sm">
            <label className="text-xs font-bold uppercase tracking-wider text-background/80">Join the inner circle</label>
            <div className="mt-2 flex gap-2">
              <Input
                type="email"
                placeholder="your@email.com"
                className="bg-background/10 border-background/20 text-background placeholder:text-background/50"
              />
              <Button type="submit" variant="accent">Subscribe</Button>
            </div>
            <p className="mt-2 text-xs text-background/50">Get 10% off your first order. No spam.</p>
          </form>
          <div className="mt-6 flex gap-2">
            {[Instagram, Youtube, Facebook, MessageCircle, Mail].map((Icon, i) => (
              <a key={i} href="#" className="grid h-10 w-10 place-items-center rounded-full bg-background/10 hover:bg-accent hover:text-accent-foreground transition-smooth" aria-label="Social">
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-display text-lg">Shop</h4>
          <ul className="mt-4 space-y-2 text-sm text-background/70">
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}><Link to={`/category/${c.slug}`} className="hover:text-accent">{c.name}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display text-lg">Company</h4>
          <ul className="mt-4 space-y-2 text-sm text-background/70">
            <li><Link to="/about" className="hover:text-accent">About us</Link></li>
            <li><Link to="/blog" className="hover:text-accent">Guides & blog</Link></li>
            <li><Link to="/contact" className="hover:text-accent">Contact</Link></li>
            <li><a href="#" className="hover:text-accent">Affiliate program</a></li>
            <li><a href="#" className="hover:text-accent">Athletes</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-lg">Help</h4>
          <ul className="mt-4 space-y-2 text-sm text-background/70">
            <li><a href="#" className="hover:text-accent">Shipping & returns</a></li>
            <li><a href="#" className="hover:text-accent">FAQ</a></li>
            <li><a href="#" className="hover:text-accent">Track order</a></li>
            <li><a href="#" className="hover:text-accent">Terms of service</a></li>
            <li><a href="#" className="hover:text-accent">Privacy policy</a></li>
          </ul>
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-4 border-t border-background/10 pt-6 text-xs text-background/50 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} Voltra Nutrition. All rights reserved.</p>
        <div className="flex flex-wrap items-center gap-2">
          {["VISA", "MASTERCARD", "AMEX", "PAYPAL", "APPLE PAY", "G PAY"].map((p) => (
            <span key={p} className="rounded border border-background/20 px-2 py-1 font-bold tracking-wider">{p}</span>
          ))}
        </div>
      </div>
    </div>
  </footer>
);
