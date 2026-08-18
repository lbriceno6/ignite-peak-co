import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";

/**
 * Cada política vive en dos rutas: la histórica en inglés y el alias en
 * español. `canonical` dice cuál de las dos es la buena, para que Google no
 * las trate como dos páginas distintas con el mismo texto.
 */
export const PolicyPage = ({ title, description, canonical, children }: {
  title: string;
  description?: string;
  canonical?: string;
  children: React.ReactNode;
}) => (
  <Layout>
    <SEO title={`${title} | Nutribatidos`} description={description} canonical={canonical} />
    <div className="container-x py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-4xl md:text-5xl">{title}</h1>
        <div className="prose prose-neutral mt-8 max-w-none text-muted-foreground [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-foreground [&_li]:my-1 [&_p]:leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  </Layout>
);
