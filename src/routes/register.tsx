import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/ramle/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/ramle/auth";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Створити акаунт — RALLY" }] }),
  component: RegisterPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Введіть ім'я").max(80),
  email: z.string().trim().email("Некоректний email").max(255),
  password: z.string().min(8, "Мінімум 8 символів").max(72),
  birth_date: z.string().min(1, "Вкажіть дату народження"),
  tos: z.literal(true, { errorMap: () => ({ message: "Необхідно прийняти умови" }) }),
});

function RegisterPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name: fd.get("name"),
      email: fd.get("email"),
      password: fd.get("password"),
      birth_date: fd.get("birth_date"),
      tos: fd.get("tos") === "on",
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    // Adult-only enforcement (>=18)
    const age = (Date.now() - new Date(parsed.data.birth_date).getTime()) / (365.25 * 24 * 3600 * 1000);
    if (age < 18) { toast.error("RALLY: Справжні друзі. Справжні пригоди"); return; }

    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined,
        data: {
          name: parsed.data.name,
          birth_date: parsed.data.birth_date,
          analytics, marketing,
        },
      },
    });
    if (error) { setBusy(false); toast.error("Не вдалося", { description: error.message }); return; }

    // Update profile birth_date (trigger created profile with name)
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      await supabase.from("profiles").update({ birth_date: parsed.data.birth_date, name: parsed.data.name }).eq("id", u.user.id);
    }

    setBusy(false);
    toast.success("Акаунт створено! Заповніть профіль.");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-secondary/40 px-4 py-10">
      <main id="main" className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="rounded-2xl border bg-card p-8 shadow-elevated">
          <h1 className="font-display text-2xl font-bold">Створіть акаунт</h1>
          <p className="mt-1 text-sm text-muted-foreground">RALLY: Справжні друзі. Справжні пригоди</p>
          <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
            <Field id="name" label="Ім'я" required>
              <Input id="name" name="name" autoComplete="given-name" required />
            </Field>
            <Field id="email" label="Email" required>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            <Field id="password" label="Пароль (мін. 8 символів)" required>
              <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            </Field>
            <Field id="birth_date" label="Дата народження" required>
              <Input id="birth_date" name="birth_date" type="date" required />
            </Field>

            <fieldset className="space-y-2 rounded-xl border p-3">
              <legend className="px-1 text-sm font-medium">Згоди (GDPR)</legend>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox name="tos" required aria-required="true" />
                <span>Я приймаю Умови користування та Політику конфіденційності.</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={analytics} onCheckedChange={(v) => setAnalytics(v === true)} />
                <span>Дозволяю анонімну аналітику для покращення сервісу.</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={marketing} onCheckedChange={(v) => setMarketing(v === true)} />
                <span>Хочу отримувати корисні новини та поради.</span>
              </label>
            </fieldset>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Створюємо…" : "Створити акаунт"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Уже маєте акаунт?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">Увійти</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({ id, label, required, children }: { id: string; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}{required && <span className="text-destructive" aria-hidden="true"> *</span>}</Label>
      {children}
    </div>
  );
}