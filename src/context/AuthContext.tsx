import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type SupplierStatus = "pending" | "approved" | "suspended" | "rejected" | null;

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  supplierId: string | null;
  supplierStatus: SupplierStatus;
  isSupplier: boolean;
  refreshSupplier: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierStatus, setSupplierStatus] = useState<SupplierStatus>(null);
  const [loading, setLoading] = useState(true);

  const loadRoles = async (uid: string) => {
    const [{ data: roleRow }, { data: supRow }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
      supabase.from("suppliers").select("id,status").eq("user_id", uid).maybeSingle(),
    ]);
    setIsAdmin(!!roleRow);
    setSupplierId(supRow?.status === "approved" ? supRow.id : null);
    setSupplierStatus((supRow?.status as SupplierStatus) ?? null);
  };

  const refreshSupplier = async () => {
    if (user) await loadRoles(user.id);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => { loadRoles(s.user.id); }, 0);
      } else {
        setIsAdmin(false);
        setSupplierId(null);
        setSupplierStatus(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadRoles(s.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <AuthContext.Provider
      value={{
        user, session, loading, isAdmin,
        supplierId, supplierStatus,
        isSupplier: supplierStatus === "approved",
        refreshSupplier, signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
