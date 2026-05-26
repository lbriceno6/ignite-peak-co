import { Award, Leaf, Heart, Sprout } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero.jpg";
import { useSiteContent } from "@/hooks/useSiteContent";

const KEYS = [
  "about_eyebrow","about_title_line1","about_title_line2","about_title_line3","about_hero_image",
  "about_story_title","about_story_p1","about_story_p2",
  "about_stat1_n","about_stat1_l","about_stat2_n","about_stat2_l",
  "about_stat3_n","about_stat3_l","about_stat4_n","about_stat4_l",
  "about_principles_title",
  "about_principle1_t","about_principle1_d","about_principle2_t","about_principle2_d",
  "about_principle3_t","about_principle3_d","about_principle4_t","about_principle4_d",
  "about_cta_title","about_cta_label","about_cta_href",
];

const D = {
  about_eyebrow: "Sobre Nutribatidos",
  about_title_line1: "Superalimentos andinos,",
  about_title_line2: "medicina natural",
  about_title_line3: "para cada familia peruana.",
  about_story_title: "Nuestra historia",
  about_story_p1: "Nutribatidos nació en Perú con una misión simple: acercar los superalimentos andinos al día a día de las familias. Trabajamos directamente con productores peruanos para llevar maca, cañihua, espirulina y otras fórmulas naturales a tu mesa.",
  about_story_p2: "Procesamos todo en frío para conservar los nutrientes, sin saborizantes, sin azúcar añadida y sin químicos. Queremos que cada peruano tenga acceso a la nutrición que nuestras abuelas conocían — y que vuelva a sentirse parte de la rutina diaria.",
  about_stat1_n: "100%", about_stat1_l: "Natural",
  about_stat2_n: "Perú",  about_stat2_l: "Origen",
  about_stat3_n: "0",     about_stat3_l: "Químicos añadidos",
  about_stat4_n: "24-48h",about_stat4_l: "Envío a todo el país",
  about_principles_title: "Nuestros principios",
  about_principle1_t: "Origen peruano",      about_principle1_d: "Ingredientes seleccionados directamente de productores andinos.",
  about_principle2_t: "Procesado en frío",   about_principle2_d: "Conservamos los nutrientes que la naturaleza ya puso ahí.",
  about_principle3_t: "Sin químicos",        about_principle3_d: "Sin saborizantes, sin azúcar añadida, sin colorantes.",
  about_principle4_t: "Para tu familia",     about_principle4_d: "Formatos pensados para que todos en casa se beneficien.",
  about_cta_title: "Empieza tu rutina natural",
  about_cta_label: "Ver productos",
  about_cta_href: "/categoria/nb-superalimentos",
};

const ICONS = [Sprout, Leaf, Award, Heart];

const About = () => {
  const { content: c } = useSiteContent(KEYS, D);
  const hero = c.about_hero_image || heroImage;
  const stats = [1,2,3,4].map((i) => ({ n: c[`about_stat${i}_n`], l: c[`about_stat${i}_l`] }));
  const principles = [1,2,3,4].map((i) => ({
    Icon: ICONS[i-1], t: c[`about_principle${i}_t`], d: c[`about_principle${i}_d`],
  }));

  return (
    <Layout>
      <section className="relative overflow-hidden bg-surface-darker text-background">
        <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-darker via-surface-darker/70 to-transparent" />
        <div className="container-x relative py-24 lg:py-32">
          <span className="text-xs font-bold tracking-[0.3em] text-accent">{c.about_eyebrow}</span>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-tight sm:text-6xl lg:text-7xl">
            {c.about_title_line1} <br /><span className="text-accent">{c.about_title_line2}</span> {c.about_title_line3}
          </h1>
        </div>
      </section>

      <section className="container-x grid gap-12 py-16 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl">{c.about_story_title}</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">{c.about_story_p1}</p>
          <p className="mt-4 text-muted-foreground leading-relaxed">{c.about_story_p2}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((s) => (
            <div key={s.l} className="rounded-lg bg-surface-darker p-6 text-background">
              <div className="font-display text-4xl text-accent">{s.n}</div>
              <div className="mt-1 text-xs tracking-wide text-background/70">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary/40 py-16">
        <div className="container-x">
          <h2 className="font-display text-3xl sm:text-4xl">{c.about_principles_title}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {principles.map((p) => (
              <div key={p.t} className="rounded-lg border bg-card p-6">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-accent/15 text-accent"><p.Icon /></div>
                <h3 className="mt-4 font-display text-xl">{p.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x py-16 text-center">
        <h2 className="font-display text-3xl sm:text-4xl">{c.about_cta_title}</h2>
        <Button size="xl" variant="accent" className="mt-6" asChild>
          <Link to={c.about_cta_href || "/"}>{c.about_cta_label}</Link>
        </Button>
      </section>
    </Layout>
  );
};

export default About;
