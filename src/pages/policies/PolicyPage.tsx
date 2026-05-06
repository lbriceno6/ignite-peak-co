import { Layout } from "@/components/Layout";

export const PolicyPage = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Layout>
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
