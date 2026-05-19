import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, CreditCard, Truck, Smartphone, Landmark, Banknote, MessageCircle, Loader2, ShieldCheck, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart, cartTotals, lineSubtotal, lineUnitPrice } from "@/store/cart";
import { useCurrency } from "@/context/CurrencyContext";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useShippingSettings } from "@/hooks/useShippingSettings";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const PAY_KEYS = [
  "pay.order",
  "pay.yape.enabled","pay.yape.holder","pay.yape.phone","pay.yape.qr_url","pay.yape.note",
  "pay.plin.enabled","pay.plin.holder","pay.plin.phone","pay.plin.qr_url","pay.plin.note",
  "pay.bank.enabled","pay.bank.bank_name","pay.bank.account_type","pay.bank.account_number",
  "pay.bank.cci","pay.bank.holder","pay.bank.document","pay.bank.note",
  "pay.card.enabled","pay.card.provider","pay.card.brands","pay.card.note",
  "pay.cod.enabled","pay.cod.note","pay.confirm_whatsapp",
];

const METHOD_META: Record<string, { l: string; icon: any; sub: string }> = {
  yape: { l: "Yape", icon: Smartphone, sub: "Pago móvil instantáneo" },
  plin: { l: "Plin", icon: Smartphone, sub: "Pago móvil instantáneo" },
  bank: { l: "Transferencia", icon: Landmark, sub: "Depósito o transferencia bancaria" },
  cod: { l: "Contra entrega", icon: Banknote, sub: "Paga en efectivo al recibir" },
  card: { l: "Tarjeta", icon: CreditCard, sub: "Crédito o débito" },
};
const DEFAULT_ORDER = ["yape", "plin", "bank", "cod", "card"];

const randomPassword = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2).toUpperCase() + "!9";

const CopyableRow = ({ label, value }: { label: string; value: string }) => {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-background/60 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm font-semibold">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => { navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }}
        className="grid h-8 w-8 place-items-center rounded-md border hover:bg-secondary"
        aria-label={`Copiar ${label}`}
      >
        {done ? <Check size={14} className="text-success" /> : <Copy size={14} />}
      </button>
    </div>
  );
};

const Checkout = () => {
  const navigate = useNavigate();
  const { items, clear } = useCart();
  const { subtotal, shipping, total } = cartTotals(items);
  const { format } = useCurrency();
  const { user } = useAuth();
  const { content: pay } = useSiteContent(PAY_KEYS, { "pay.card.enabled": "1" });

  const [form, setForm] = useState({
    email: user?.email ?? "",
    phone: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    postal: "",
    country: "Perú",
  });
  const [method, setMethod] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [editData, setEditData] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [draft, setDraft] = useState<typeof form | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) { setProfileLoaded(true); return; }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name,email,phone,address,city,postal_code,country")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        const [firstName, ...rest] = (data.full_name ?? "").trim().split(/\s+/);
        setForm((f) => ({
          ...f,
          email: data.email ?? user.email ?? f.email,
          phone: data.phone ?? f.phone,
          firstName: firstName ?? f.firstName,
          lastName: rest.join(" ") || f.lastName,
          address: data.address ?? f.address,
          city: data.city ?? f.city,
          postal: data.postal_code ?? f.postal,
          country: data.country ?? f.country,
        }));
      }
      setProfileLoaded(true);
    })();
  }, [user]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setTouched((t) => ({ ...t, [k]: true }));
  };

  // Field-level real-time validation
  const fieldErrors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Correo inválido";
    if (!form.firstName.trim()) e.firstName = "Requerido";
    if (!form.lastName.trim()) e.lastName = "Requerido";
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 7) e.phone = "Mínimo 7 dígitos";
    else if (digits.length > 15) e.phone = "Máximo 15 dígitos";
    else if (!/^[+\d\s()-]+$/.test(form.phone)) e.phone = "Solo números y + ( ) -";
    if (!form.address.trim()) e.address = "Requerido";
    else if (form.address.trim().length < 5) e.address = "Mínimo 5 caracteres";
    else if (form.address.length > 200) e.address = "Máximo 200 caracteres";
    if (!form.city.trim()) e.city = "Requerido";
    else if (form.city.trim().length < 2) e.city = "Mínimo 2 caracteres";
    else if (!/^[\p{L}\s.'-]+$/u.test(form.city)) e.city = "Solo letras y espacios";
    return e;
  }, [form]);

  const hasCompleteProfile = !!(user && form.firstName && form.lastName && form.phone && form.address && form.city && Object.keys(fieldErrors).length === 0);

  const startEdit = () => { setDraft(form); setEditData(true); };
  const cancelEdit = () => { if (draft) setForm(draft); setDraft(null); setEditData(false); setTouched({}); };
  const saveEdit = async () => {
    setTouched({ email: true, firstName: true, lastName: true, phone: true, address: true, city: true });
    if (Object.keys(fieldErrors).length > 0) { toast.error("Corrige los datos marcados antes de guardar"); return; }
    if (user) {
      setSavingData(true);
      const { error } = await supabase.from("profiles").update({
        full_name: `${form.firstName} ${form.lastName}`.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        postal_code: form.postal.trim(),
        country: form.country.trim(),
      }).eq("id", user.id);
      setSavingData(false);
      if (error) { toast.error("No se pudo guardar"); return; }
      toast.success("Datos actualizados");
    }
    setDraft(null); setEditData(false);
  };

  const methods = useMemo(() => {
    const stored = (pay["pay.order"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const order = [...stored];
    DEFAULT_ORDER.forEach((id) => { if (!order.includes(id)) order.push(id); });
    return order
      .filter((id) => METHOD_META[id] && pay[`pay.${id}.enabled`] === "1")
      .map((id) => ({ k: id, ...METHOD_META[id] }));
  }, [pay]);

  const selected = method || methods[0]?.k || "card";
  const wa = (pay["pay.confirm_whatsapp"] || "").replace(/[^0-9]/g, "");

  const buildPayDetails = (m: string) => {
    if (m === "yape" || m === "plin") {
      const p = m === "yape" ? "pay.yape" : "pay.plin";
      return [
        pay[`${p}.holder`] && `Titular: ${pay[`${p}.holder`]}`,
        pay[`${p}.phone`] && `Celular: ${pay[`${p}.phone`]}`,
      ].filter(Boolean).join("\n");
    }
    if (m === "bank") {
      return [
        pay["pay.bank.bank_name"] && `Banco: ${pay["pay.bank.bank_name"]}`,
        pay["pay.bank.account_number"] && `Cuenta: ${pay["pay.bank.account_number"]}`,
        pay["pay.bank.cci"] && `CCI: ${pay["pay.bank.cci"]}`,
        pay["pay.bank.holder"] && `Titular: ${pay["pay.bank.holder"]}`,
      ].filter(Boolean).join("\n");
    }
    return "";
  };

  const buildWaMessage = (orderCode: string) => {
    const lines = items.map((i) => `• ${i.quantity}x ${i.product.name}${[i.flavor, i.size].filter(Boolean).length ? ` (${[i.flavor, i.size].filter(Boolean).join(" · ")})` : ""} — ${format(lineSubtotal(i))}`).join("\n");
    const det = buildPayDetails(selected);
    const meta = METHOD_META[selected]?.l ?? selected.toUpperCase();
    return [
      `¡Hola! Acabo de generar el pedido *${orderCode}*.`,
      ``,
      `*Productos:*`,
      lines,
      ``,
      `Subtotal: ${format(subtotal)}`,
      `Envío: ${shipping === 0 ? "Gratis" : format(shipping)}`,
      `*Total: ${format(total)}*`,
      ``,
      `*Método de pago:* ${meta}`,
      det && `\n${det}`,
      ``,
      `Cliente: ${form.firstName} ${form.lastName} — ${form.phone}`,
      `Envío a: ${form.address}, ${form.city}`,
      ``,
      `Procederé con el pago y te enviaré el comprobante. ¡Gracias!`,
    ].filter(Boolean).join("\n");
  };

  const waLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(`¡Hola! Acabo de realizar un pago por ${format(total)} con ${selected.toUpperCase()}. Te envío el comprobante.`)}` : "";

  const validate = () => {
    if (items.length === 0) return "Tu carrito está vacío";
    if (Object.keys(fieldErrors).length > 0) return "Revisa los datos de envío";
    if (!selected) return "Selecciona un método de pago";
    return null;
  };

  const isComplete = items.length > 0 && validate() === null;

  const ensureUser = async (): Promise<string | null> => {
    if (user) return user.id;
    const fullName = `${form.firstName} ${form.lastName}`.trim();
    const pwd = randomPassword();
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: pwd,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName, phone: form.phone },
      },
    });
    if (error) {
      if (error.message.toLowerCase().includes("registered") || error.message.toLowerCase().includes("exists")) {
        toast.error("Ese correo ya tiene cuenta. Inicia sesión para continuar.", {
          action: { label: "Iniciar sesión", onClick: () => navigate("/auth", { state: { from: "/checkout" } }) },
        });
      } else {
        toast.error(error.message);
      }
      return null;
    }
    return data.user?.id ?? null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) return toast.error(err);
    setSubmitting(true);
    try {
      const uid = await ensureUser();
      if (!uid) return;

      const { data: order, error: oErr } = await supabase
        .from("orders")
        .insert({
          user_id: uid,
          subtotal,
          shipping,
          total,
          payment_method: selected,
          status: "pending",
          shipping_name: `${form.firstName} ${form.lastName}`.trim(),
          shipping_phone: form.phone,
          shipping_address: form.address,
          shipping_city: form.city,
          shipping_postal_code: form.postal,
          shipping_country: form.country,
        })
        .select("id, order_code")
        .single();
      if (oErr || !order) throw oErr ?? new Error("No se pudo crear el pedido");

      // Persist shipping data to profile for next purchases
      await supabase.from("profiles").update({
        full_name: `${form.firstName} ${form.lastName}`.trim(),
        phone: form.phone,
        address: form.address,
        city: form.city,
        postal_code: form.postal,
        country: form.country,
      }).eq("id", uid);

      const itemsPayload = items.map((i) => ({
        order_id: order.id,
        product_slug: i.product.slug ?? i.product.id,
        product_name: i.product.name,
        product_image: i.product.image ?? null,
        variant: [i.flavor, i.size].filter(Boolean).join(" · ") || null,
        quantity: i.quantity,
        unit_price: lineUnitPrice(i),
        purchase_type: i.subscription ? "subscription" : "one_time",
        subscription_interval_days: i.subscription?.intervalDays ?? null,
      }));
      const { error: iErr } = await supabase.from("order_items").insert(itemsPayload);
      if (iErr) throw iErr;

      toast.success(`Pedido ${order.order_code} creado correctamente`);
      clear();

      if (wa) {
        const msg = buildWaMessage(order.order_code);
        const url = `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        toast.message("Configura un WhatsApp en administración para envío automático");
      }

      navigate(`/my-orders/${order.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo procesar el pago");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container-x py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl uppercase sm:text-5xl">Finalizar compra</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck size={16} className="text-success" /> Pago seguro y datos protegidos
            </p>
          </div>
          {!user && (
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta? <Link to="/auth" state={{ from: "/checkout" }} className="font-semibold text-foreground underline">Inicia sesión</Link>
            </p>
          )}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            {/* Contact + shipping */}
            <section className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-xl uppercase">Datos de envío</h3>
                {!user && <span className="rounded-full bg-success/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-success">Cuenta creada al pagar</span>}
                {hasCompleteProfile && !editData && (
                  <button type="button" onClick={startEdit} className="text-xs font-semibold uppercase tracking-wider text-accent hover:underline">Editar</button>
                )}
              </div>

              {hasCompleteProfile && !editData ? (
                <div className="mt-4 rounded-lg border bg-secondary/30 p-4 text-sm space-y-1">
                  <p className="font-semibold">{form.firstName} {form.lastName}</p>
                  <p className="text-muted-foreground">{form.email} · {form.phone}</p>
                  <p className="text-muted-foreground">{form.address}, {form.city}{form.postal ? `, ${form.postal}` : ""}, {form.country}</p>
                </div>
              ) : (
                <>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {(() => {
                      const showErr = (k: string) => touched[k] && fieldErrors[k];
                      const errCls = (k: string) => showErr(k) ? "mt-1.5 border-destructive focus-visible:ring-destructive" : "mt-1.5";
                      const ErrMsg = ({ k }: { k: string }) => showErr(k) ? <p className="mt-1 text-xs text-destructive">{fieldErrors[k]}</p> : null;
                      return (
                        <>
                          <div className="sm:col-span-2">
                            <Label>Correo electrónico *</Label>
                            <Input type="email" value={form.email} onChange={set("email")} placeholder="tu@correo.com" className={errCls("email")} disabled={!!user} maxLength={255} />
                            <ErrMsg k="email" />
                          </div>
                          <div>
                            <Label>Nombre *</Label>
                            <Input value={form.firstName} onChange={set("firstName")} className={errCls("firstName")} maxLength={50} />
                            <ErrMsg k="firstName" />
                          </div>
                          <div>
                            <Label>Apellido *</Label>
                            <Input value={form.lastName} onChange={set("lastName")} className={errCls("lastName")} maxLength={50} />
                            <ErrMsg k="lastName" />
                          </div>
                          <div className="sm:col-span-2">
                            <Label>Teléfono *</Label>
                            <Input type="tel" value={form.phone} onChange={set("phone")} placeholder="+51 999 999 999" className={errCls("phone")} maxLength={20} inputMode="tel" />
                            <ErrMsg k="phone" />
                          </div>
                          <div className="sm:col-span-2">
                            <Label>Dirección *</Label>
                            <Input value={form.address} onChange={set("address")} placeholder="Av. / Calle, número, referencia" className={errCls("address")} maxLength={200} />
                            <ErrMsg k="address" />
                          </div>
                          <div>
                            <Label>Ciudad *</Label>
                            <Input value={form.city} onChange={set("city")} className={errCls("city")} maxLength={80} />
                            <ErrMsg k="city" />
                          </div>
                          <div>
                            <Label>Código postal</Label>
                            <Input value={form.postal} onChange={set("postal")} className="mt-1.5" maxLength={15} />
                          </div>
                          <div className="sm:col-span-2">
                            <Label>País</Label>
                            <Input value={form.country} onChange={set("country")} className="mt-1.5" maxLength={60} />
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  {user && editData && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button onClick={saveEdit} disabled={savingData || Object.keys(fieldErrors).length > 0} variant="accent">
                        {savingData ? <><Loader2 size={14} className="animate-spin" /> Guardando…</> : "Guardar cambios"}
                      </Button>
                      <Button onClick={cancelEdit} variant="outline" disabled={savingData}>Cancelar</Button>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Payment */}
            <section className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="font-display text-xl uppercase flex items-center gap-2"><CreditCard size={18} /> Método de pago</h3>

              {/* Compact shipping confirmation */}
              <div className={`mt-4 rounded-lg border p-3 text-xs sm:text-sm ${isComplete ? "border-success/40 bg-success/5" : "border-dashed border-warning/50 bg-warning/5"}`}>
                <div className="flex items-start gap-2">
                  {isComplete ? <Check size={16} className="mt-0.5 shrink-0 text-success" /> : <ShieldCheck size={16} className="mt-0.5 shrink-0 text-warning" />}
                  <div className="min-w-0 flex-1">
                    {isComplete ? (
                      <>
                        <p className="font-semibold">Enviar a {form.firstName} {form.lastName} · {form.phone}</p>
                        <p className="truncate text-muted-foreground">{form.address}, {form.city}{form.postal ? `, ${form.postal}` : ""}, {form.country}</p>
                      </>
                    ) : (
                      <p className="font-semibold">Completa tus datos de envío para continuar con el pago.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {methods.map((m) => {
                  const active = selected === m.k;
                  return (
                    <button
                      key={m.k}
                      type="button"
                      onClick={() => setMethod(m.k)}
                      className={`group relative flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all ${active ? "border-accent bg-accent/5 shadow-sm" : "border-border hover:border-foreground/30 hover:bg-secondary/40"}`}
                    >
                      <span className={`grid h-10 w-10 place-items-center rounded-md ${active ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground"}`}>
                        <m.icon size={18} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{m.l}</p>
                        <p className="truncate text-xs text-muted-foreground">{m.sub}</p>
                      </div>
                      {active && <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-accent text-accent-foreground"><Check size={12} /></span>}
                    </button>
                  );
                })}
                {methods.length === 0 && (
                  <p className="sm:col-span-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">No hay métodos de pago configurados. Contacta al administrador.</p>
                )}
              </div>

              {/* Details */}
              <div className="mt-5">
                {selected === "card" && (
                  <div className="space-y-3">
                    {(pay["pay.card.provider"] || pay["pay.card.brands"] || pay["pay.card.note"]) && (
                      <div className="rounded-md border bg-secondary/40 p-3 text-sm space-y-1">
                        {pay["pay.card.provider"] && <p><span className="text-muted-foreground">Procesador:</span> {pay["pay.card.provider"]}</p>}
                        {pay["pay.card.brands"] && <p><span className="text-muted-foreground">Marcas:</span> {pay["pay.card.brands"]}</p>}
                        {pay["pay.card.note"] && <p className="whitespace-pre-line text-muted-foreground">{pay["pay.card.note"]}</p>}
                      </div>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2"><Label>Número de tarjeta</Label><Input placeholder="1234 5678 9012 3456" className="mt-1.5" /></div>
                      <div><Label>Vencimiento</Label><Input placeholder="MM/AA" className="mt-1.5" /></div>
                      <div><Label>CVC</Label><Input placeholder="123" className="mt-1.5" /></div>
                    </div>
                  </div>
                )}

                {(selected === "yape" || selected === "plin") && (() => {
                  const p = selected === "yape" ? "pay.yape" : "pay.plin";
                  const name = selected === "yape" ? "Yape" : "Plin";
                  return (
                    <div className="rounded-lg border bg-secondary/40 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">Paga con {name}</p>
                        <span className="font-display text-lg">{format(total)}</span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {pay[`${p}.holder`] && <CopyableRow label="Titular" value={pay[`${p}.holder`]} />}
                        {pay[`${p}.phone`] && <CopyableRow label="Celular" value={pay[`${p}.phone`]} />}
                      </div>
                      {pay[`${p}.qr_url`] && (
                        <div className="flex justify-center">
                          <img src={pay[`${p}.qr_url`]} alt={`QR ${name}`} className="h-44 w-44 rounded-md border bg-white object-contain p-2" />
                        </div>
                      )}
                      {pay[`${p}.note`] && <p className="whitespace-pre-line text-xs text-muted-foreground">{pay[`${p}.note`]}</p>}
                      {waLink && (
                        <Button asChild variant="dark" className="w-full">
                          <a href={waLink} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> Enviar comprobante por WhatsApp</a>
                        </Button>
                      )}
                    </div>
                  );
                })()}

                {selected === "bank" && (
                  <div className="rounded-lg border bg-secondary/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">Transferencia / Depósito</p>
                      <span className="font-display text-lg">{format(total)}</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {pay["pay.bank.bank_name"] && <CopyableRow label="Banco" value={pay["pay.bank.bank_name"]} />}
                      {pay["pay.bank.account_type"] && <CopyableRow label="Tipo" value={pay["pay.bank.account_type"]} />}
                      {pay["pay.bank.account_number"] && <CopyableRow label="N° de cuenta" value={pay["pay.bank.account_number"]} />}
                      {pay["pay.bank.cci"] && <CopyableRow label="CCI" value={pay["pay.bank.cci"]} />}
                      {pay["pay.bank.holder"] && <CopyableRow label="Titular" value={pay["pay.bank.holder"]} />}
                      {pay["pay.bank.document"] && <CopyableRow label="DNI/RUC" value={pay["pay.bank.document"]} />}
                    </div>
                    {pay["pay.bank.note"] && <p className="whitespace-pre-line text-xs text-muted-foreground">{pay["pay.bank.note"]}</p>}
                    {waLink && (
                      <Button asChild variant="dark" className="w-full">
                        <a href={waLink} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> Enviar comprobante por WhatsApp</a>
                      </Button>
                    )}
                  </div>
                )}

                {selected === "cod" && (
                  <div className="rounded-lg border bg-secondary/40 p-4 text-sm">
                    <p className="font-semibold mb-1">Pago contra entrega</p>
                    <p className="whitespace-pre-line text-muted-foreground">{pay["pay.cod.note"] || "Pagarás en efectivo al recibir tu pedido."}</p>
                  </div>
                )}
              </div>
            </section>

            <Button size="xl" variant="accent" className="w-full" onClick={handleSubmit} disabled={submitting || !isComplete}>
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Procesando…</> : !isComplete ? <><Lock size={16} /> Completa tus datos para continuar</> : <><Lock size={16} /> Confirmar pedido · {format(total)}</>}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Al confirmar aceptas nuestros <Link to="/policies/terms" className="underline">Términos</Link> y <Link to="/policies/privacy" className="underline">Política de privacidad</Link>.
            </p>
          </div>

          <aside className="rounded-xl border bg-card p-6 shadow-sm h-fit lg:sticky lg:top-24">
            <h3 className="font-display text-xl uppercase flex items-center gap-2"><Truck size={18} /> Tu pedido</h3>
            <div className="mt-4 space-y-3 max-h-72 overflow-y-auto">
              {items.map((i) => (
                <div key={i.product.id + (i.flavor ?? "") + (i.size ?? "")} className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img src={i.product.image} alt={i.product.name} className="h-14 w-14 rounded bg-secondary object-cover" />
                    <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">{i.quantity}</span>
                  </div>
                  <div className="flex-1 text-sm min-w-0">
                    <p className="truncate font-medium leading-tight">{i.product.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[i.flavor, i.size].filter(Boolean).join(" · ")}
                      {i.subscription && ` · 🔁 ${i.subscription.intervalDays}d (−${i.subscription.discountPercent}%)`}
                    </p>
                  </div>
                  <span className="font-semibold">{format(lineSubtotal(i))}</span>
                </div>
              ))}
              {items.length === 0 && <p className="text-sm text-muted-foreground">Tu carrito está vacío. <Link to="/" className="underline">Comprar ahora</Link></p>}
            </div>
            <div className="mt-5 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{format(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Envío</span><span>{shipping === 0 ? "Gratis" : format(shipping)}</span></div>
              <div className="flex justify-between border-t pt-3 font-display text-xl"><span>Total</span><span>{format(total)}</span></div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
};

export default Checkout;
