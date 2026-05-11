import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ramle/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/ramle/auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Увійти — RALLY" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error("Не вдалося увійти", { description: error.message });
      return;
    }
    toast.success("Вітаємо!");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-secondary/40 px-4">
      <main id="main" className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="rounded-2xl border bg-card p-8 shadow-elevated">
          <h1 className="font-display text-2xl font-bold">З поверненням</h1>
          <p className="mt-1 text-sm text-muted-foreground">Увійдіть, щоб знайти своє коло.</p>
          <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} aria-required="true" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input id="password" type="password" autoComplete="current-password" required minLength={8}
                value={password} onChange={(e) => setPassword(e.target.value)} aria-required="true" />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Вхід…" : "Увійти"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Ще не маєте акаунту?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">Створити</Link>
          </p>
        </div>
      </main>
    </div>
  );
}