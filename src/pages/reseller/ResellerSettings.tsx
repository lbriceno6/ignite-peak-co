import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useReseller } from "@/hooks/useReseller";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ResellerSettings = () => {
  const { reseller, refresh } = useReseller();
  const [method, setMethod] = useState<"cash" | "credit" | "choose">("choose");
  const [account, setAccount] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (reseller) {
      setMethod(reseller.payout_method);
      setAccount(reseller.payout_account ?? "");
    }
  }, [reseller]);

  const save = async () => {
    if (!reseller) return;
    setSaving(true);
    const { error } = await (supabase as any).from("resellers").update({ payout_method: method, payout_account: account }).eq("id", reseller.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
    refresh();
  };

  if (!reseller) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl uppercase">Configuración</h1>
        <p className="text-sm text-muted-foreground">Define cómo prefieres recibir tus comisiones.</p>
      </div>
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div>
          <Label>Método de pago preferido</Label>
          <select value={method} onChange={(e) => setMethod(e.target.value as any)} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm">
            <option value="choose">Decidir al solicitar (mantiene balance en efectivo)</option>
            <option value="cash">Efectivo (acumular en balance retirable)</option>
            <option value="credit">Saldo en tienda automáticamente</option>
          </select>
        </div>
        <div>
          <Label>Datos para el pago (banco, wallet, Yape, etc.)</Label>
          <Textarea value={account} onChange={(e) => setAccount(e.target.value)} className="mt-1.5" rows={4} placeholder="Banco, número de cuenta, CCI, titular…" />
        </div>
        <Button variant="accent" onClick={save} disabled={saving}>Guardar</Button>
      </div>
    </div>
  );
};

export default ResellerSettings;
