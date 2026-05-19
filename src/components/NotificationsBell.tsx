import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type Notif = {
  id: string; type: string; title: string; body: string | null;
  link: string | null; read_at: string | null; created_at: string;
};

export const NotificationsBell = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const unread = items.filter((n) => !n.read_at).length;

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id,type,title,body,link,read_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as Notif[]) ?? []);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase
      .channel(`notif:${user.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const markAll = async () => {
    if (!user || unread === 0) return;
    await supabase.from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    load();
  };

  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
          <Bell size={16} />
          {unread > 0 && (
            <Badge className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full p-0 px-1 text-[10px]">
              {unread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notificaciones</span>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={markAll} disabled={unread === 0}>
            <CheckCheck size={12} /> Marcar leídas
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Sin notificaciones</div>
          ) : items.map((n) => {
            const body = (
              <div className={`flex flex-col gap-0.5 border-b px-3 py-2.5 text-sm transition-colors hover:bg-muted ${!n.read_at ? "bg-accent/5" : ""}`}>
                <div className="flex items-start gap-2">
                  {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                  <span className="font-medium">{n.title}</span>
                </div>
                {n.body && <span className="text-xs text-muted-foreground">{n.body}</span>}
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                </span>
              </div>
            );
            return n.link ? (
              <Link key={n.id} to={n.link} onClick={() => markOne(n.id)}>{body}</Link>
            ) : (
              <button key={n.id} onClick={() => markOne(n.id)} className="w-full text-left">{body}</button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
