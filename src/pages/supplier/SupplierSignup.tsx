import { Layout } from "@/components/Layout";
import { Store } from "lucide-react";
import { SupplierApplicationForm } from "@/components/supplier/SupplierApplicationForm";

const SupplierSignup = () => {
  return (
    <Layout>
      <div className="container-x py-12">
        <div className="mx-auto max-w-xl rounded-xl border bg-card p-8 shadow-sm">
          <div className="flex items-center gap-2 text-accent">
            <Store /> <span className="text-xs font-semibold uppercase tracking-wider">Marketplace</span>
          </div>
          <h1 className="mt-2 font-display text-3xl uppercase">Vende con nosotros</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Registra tu marca y vende tus propios productos en nuestro marketplace.
            Tu solicitud será revisada por nuestro equipo antes de publicarse.
          </p>
          <div className="mt-6">
            <SupplierApplicationForm />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SupplierSignup;
