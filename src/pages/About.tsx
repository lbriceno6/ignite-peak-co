import { Award, FlaskConical, Leaf, Heart } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero.jpg";

const About = () => (
  <Layout>
    <section className="relative overflow-hidden bg-surface-darker text-background">
      <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-t from-surface-darker via-surface-darker/70 to-transparent" />
      <div className="container-x relative py-24 lg:py-32">
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent">About Voltra</span>
        <h1 className="mt-4 max-w-3xl font-display text-5xl uppercase leading-tight sm:text-6xl lg:text-7xl">Built by athletes. <br /><span className="text-accent">For everyone</span> who refuses to settle.</h1>
      </div>
    </section>

    <section className="container-x grid gap-12 py-16 lg:grid-cols-2 lg:items-center">
      <div>
        <h2 className="font-display text-3xl uppercase sm:text-4xl">Our story</h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Voltra was born in a garage gym in 2019 — frustrated with overpriced supplements full of fillers and empty marketing claims. We set out to build a brand we'd actually want to use ourselves: clean formulas, honest labels, and pricing that respects the people behind the workouts.
        </p>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Today, over 240,000 athletes from 38 countries trust Voltra to fuel their training, recovery and everyday wellness. We've never compromised on a single ingredient — and we never will.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[{n: "240k+", l: "Athletes"}, {n: "38", l: "Countries"}, {n: "4.9★", l: "Avg rating"}, {n: "100%", l: "Lab tested"}].map((s) => (
          <div key={s.l} className="rounded-lg bg-surface-darker p-6 text-background">
            <div className="font-display text-4xl text-accent">{s.n}</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-background/70">{s.l}</div>
          </div>
        ))}
      </div>
    </section>

    <section className="bg-secondary/40 py-16">
      <div className="container-x">
        <h2 className="font-display text-3xl uppercase sm:text-4xl">Our principles</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: FlaskConical, t: "Science first", d: "Every formula is backed by peer-reviewed research and clinically supported dosages." },
            { icon: Leaf, t: "Clean labels", d: "No artificial colors, no proprietary blends, no hiding behind marketing fluff." },
            { icon: Award, t: "Lab verified", d: "Every batch is independently tested for purity, potency and contaminants." },
            { icon: Heart, t: "Athlete obsessed", d: "We listen to our community and iterate on every product we ship." },
          ].map((p) => (
            <div key={p.t} className="rounded-lg border bg-card p-6">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-accent/15 text-accent"><p.icon /></div>
              <h3 className="mt-4 font-display text-xl uppercase">{p.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="container-x py-16 text-center">
      <h2 className="font-display text-3xl uppercase sm:text-4xl">Ready to fuel your goals?</h2>
      <Button size="xl" variant="accent" className="mt-6" asChild>
        <Link to="/">Shop the range</Link>
      </Button>
    </section>
  </Layout>
);

export default About;
