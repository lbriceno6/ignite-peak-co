import { useState } from "react";
import { Copy, Check, MessageCircle, Facebook, Twitter, Mail } from "lucide-react";
import { useReseller } from "@/hooks/useReseller";
import { Button } from "@/components/ui/button";

const ResellerLink = () => {
  const { reseller, tier, loading } = useReseller();
  const [copied, setCopied] = useState<string | null>(null);
  if (loading || !reseller) return <div>Cargando…</div>;

  const link = `${window.location.origin}/?ref=${reseller.link_slug}`;
  const codeLink = `${window.location.origin}/?ref=${reseller.code}`;
  const msg = `🎁 Usa mi código ${reseller.code} y obtén ${tier?.customer_discount_percent ?? 0}% de descuento en tu primera compra. ${link}`;
  const enc = encodeURIComponent(msg);

  const copy = (v: string, k: string) => { navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(null), 1500); };
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(link)}`;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl uppercase">Comparte y gana</h1>
        <p className="text-sm text-muted-foreground">Cada compra hecha con tu link o código te genera comisión automática.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase text-muted-foreground">Tu código</p>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-3">
            <span className="font-mono text-2xl font-bold tracking-widest">{reseller.code}</span>
            <button onClick={() => copy(reseller.code, "c")} className="text-muted-foreground hover:text-foreground">
              {copied === "c" ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Da {tier?.customer_discount_percent ?? 0}% de descuento al cliente.</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase text-muted-foreground">Tu link directo</p>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-3">
            <span className="truncate text-sm">{link}</span>
            <button onClick={() => copy(link, "l")} className="text-muted-foreground hover:text-foreground">
              {copied === "l" ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">El link rastrea la venta automáticamente.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-display text-xl uppercase">Compartir</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="dark"><a href={`https://wa.me/?text=${enc}`} target="_blank" rel="noopener"><MessageCircle size={16} /> WhatsApp</a></Button>
          <Button asChild variant="outline"><a href={`https://twitter.com/intent/tweet?text=${enc}`} target="_blank" rel="noopener"><Twitter size={16} /> X</a></Button>
          <Button asChild variant="outline"><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`} target="_blank" rel="noopener"><Facebook size={16} /> Facebook</a></Button>
          <Button asChild variant="outline"><a href={`mailto:?subject=Descuento&body=${enc}`}><Mail size={16} /> Email</a></Button>
          <Button variant="outline" onClick={() => copy(msg, "m")}>{copied === "m" ? <Check size={16} /> : <Copy size={16} />} Copiar mensaje</Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-display text-xl uppercase">QR de tu link</h3>
        <div className="mt-3 flex justify-center">
          <img src={qr} alt="QR" className="h-60 w-60 rounded-md border bg-white p-2" />
        </div>
      </div>
    </div>
  );
};

export default ResellerLink;
