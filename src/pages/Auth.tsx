import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

const signUpSchema = z.object({
  fullName: z.string().min(2, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  phone: z.string().min(5, "Phone is required").max(30),
  password: z.string().min(6, "Min 6 characters").max(72),
});
const signInSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const redirectTo = location.state?.from ?? "/my-profile";
  const [loading, setLoading] = useState(false);

  const [signUp, setSignUp] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [signIn, setSignIn] = useState({ email: "", password: "" });
  const [resetEmail, setResetEmail] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(signUp);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: parsed.data.fullName, phone: parsed.data.phone },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! Check your email to confirm.");
    navigate(redirectTo);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse(signIn);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate(redirectTo);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return toast.error("Enter your email");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent");
  };

  return (
    <Layout>
      <div className="container-x mx-auto max-w-md py-16">
        <h1 className="font-display text-4xl uppercase mb-2">Account</h1>
        <p className="text-muted-foreground mb-6">Sign in or create an account to track orders & rewards.</p>
        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Register</TabsTrigger>
            <TabsTrigger value="reset">Reset</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4 mt-6">
              <div><Label>Email</Label><Input type="email" value={signIn.email} onChange={(e) => setSignIn({ ...signIn, email: e.target.value })} required /></div>
              <div><Label>Password</Label><Input type="password" value={signIn.password} onChange={(e) => setSignIn({ ...signIn, password: e.target.value })} required /></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4 mt-6">
              <div><Label>Full name</Label><Input value={signUp.fullName} onChange={(e) => setSignUp({ ...signUp, fullName: e.target.value })} required /></div>
              <div><Label>Email</Label><Input type="email" value={signUp.email} onChange={(e) => setSignUp({ ...signUp, email: e.target.value })} required /></div>
              <div><Label>Phone</Label><Input type="tel" value={signUp.phone} onChange={(e) => setSignUp({ ...signUp, phone: e.target.value })} required /></div>
              <div><Label>Password</Label><Input type="password" value={signUp.password} onChange={(e) => setSignUp({ ...signUp, password: e.target.value })} required /></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating…" : "Create account"}</Button>
            </form>
          </TabsContent>

          <TabsContent value="reset">
            <form onSubmit={handleReset} className="space-y-4 mt-6">
              <div><Label>Email</Label><Input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required /></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</Button>
            </form>
          </TabsContent>
        </Tabs>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="hover:text-accent">← Back to store</Link>
        </p>
      </div>
    </Layout>
  );
};

export default Auth;
