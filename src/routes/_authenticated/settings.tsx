import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/ramle/auth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Налаштування — RAMLE" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const profileQ = useQuery({
    queryKey: ["profile-settings", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (data) {
        setName(data.name ?? "");
        setCity(data.city ?? "");
        setBio(data.bio ?? "");
      }
      return data;
    },
    enabled: !!user,
  });

  const interestsQ = useQuery({
    queryKey: ["all-interests"],
    queryFn: async () => (await supabase.from("interests").select("*").order("category").order("name")).data ?? [],
  });
  const myIntQ = useQuery({
    queryKey: ["my-int", user?.id],
    queryFn: async () => (await supabase.from("user_interests").select("interest_id").eq("user_id", user!.id)).data ?? [],
    enabled: !!user,
  });
  const myIntSet = new Set((myIntQ.data ?? []).map((r: any) => r.interest_id));

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      name, city: city || null, bio: bio || null,
    }).eq("id", user!.id);
    setBusy(false);
    if (error) toast.error("Помилка", { description: error.message });
    else toast.success("Профіль збережено");
  }

  async function captureLocation() {
    if (!navigator.geolocation) { toast.error("Геолокація недоступна"); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { error } = await supabase.from("profiles").update({
        lat: pos.coords.latitude, lng: pos.coords.longitude,
      }).eq("id", user!.id);
      if (error) toast.error("Помилка", { description: error.message });
      else toast.success("Локацію збережено. Точні координати ніколи не показуються іншим користувачам.");
    }, () => toast.error("Не вдалося отримати локацію"));
  }

  async function toggleInterest(id: string) {
    if (myIntSet.has(id)) {
      await supabase.from("user_interests").delete().eq("user_id", user!.id).eq("interest_id", id);
    } else {
      await supabase.from("user_interests").insert({ user_id: user!.id, interest_id: id });
    }
    myIntQ.refetch();
  }

  async function exportData() {
    if (!user) return;
    toast.info("Готуємо ваш архів даних…");
    const [profile, consents, myInterests, matches, messages] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("consents").select("*").eq("user_id", user.id),
      supabase.from("user_interests").select("interest_id, interests(name)").eq("user_id", user.id),
      supabase.from("matches").select("*").or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
      supabase.from("messages").select("*").eq("sender_id", user.id),
    ]);
    const payload = {
      exported_at: new Date().toISOString(),
      user: { id: user.id, email: user.email },
      profile: profile.data,
      consents: consents.data,
      interests: myInterests.data,
      matches: matches.data,
      messages: messages.data,
      note: "Ваші дані. Право на портативність даних відповідно до GDPR ст. 20.",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ramle-export-${user.id}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Архів завантажено");
  }

  async function deleteAccount() {
    if (!user) return;
    if (confirmText !== "ВИДАЛИТИ") { toast.error("Введіть ВИДАЛИТИ для підтвердження"); return; }
    // Cascading deletes via FK ON DELETE CASCADE on the profiles row
    const { error } = await supabase.from("profiles").delete().eq("id", user.id);
    if (error) { toast.error("Помилка видалення", { description: error.message }); return; }
    await signOut();
    toast.success("Акаунт повністю видалено. До побачення.");
    navigate({ to: "/" });
  }

  // Group interests by category
  const grouped: Record<string, any[]> = {};
  (interestsQ.data ?? []).forEach((i: any) => { (grouped[i.category] ||= []).push(i); });

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <h1 className="font-display text-3xl font-bold">Налаштування</h1>
        <p className="text-muted-foreground">Профіль, інтереси, приватність і керування даними.</p>
      </header>

      {/* PROFILE */}
      <section aria-labelledby="h-profile" className="rounded-2xl border bg-card p-6">
        <h2 id="h-profile" className="font-display text-xl font-semibold">Профіль</h2>
        <form onSubmit={saveProfile} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="s-name">Ім'я</Label>
            <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-city">Місто</Label>
            <Input id="s-city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-bio">Коротко про себе</Label>
            <Textarea id="s-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={4} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>{busy ? "Збереження…" : "Зберегти"}</Button>
            <Button type="button" variant="outline" onClick={captureLocation}>
              <MapPin className="mr-1 h-4 w-4" aria-hidden="true" />
              Оновити локацію
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Точні координати зберігаються лише на сервері. Іншим людям показується лише приблизна відстань.
          </p>
        </form>
      </section>

      {/* INTERESTS */}
      <section aria-labelledby="h-int" className="rounded-2xl border bg-card p-6">
        <h2 id="h-int" className="font-display text-xl font-semibold">Інтереси</h2>
        <p className="text-sm text-muted-foreground">Оберіть від 3 до 10 — впливають на якість підбору.</p>
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat}</p>
            <div className="flex flex-wrap gap-2">
              {items.map((i: any) => {
                const sel = myIntSet.has(i.id);
                return (
                  <button
                    key={i.id} type="button"
                    onClick={() => toggleInterest(i.id)}
                    aria-pressed={sel}
                    className={"rounded-full border px-3 py-1.5 text-sm transition-colors " +
                      (sel ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-secondary")}
                  >
                    {i.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* GDPR */}
      <section aria-labelledby="h-gdpr" className="rounded-2xl border bg-card p-6">
        <h2 id="h-gdpr" className="font-display text-xl font-semibold">Ваші права (GDPR)</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border p-4">
            <p className="font-semibold">Завантажити мої дані</p>
            <p className="mt-1 text-sm text-muted-foreground">Право на портативність даних. JSON-файл з усіма вашими даними.</p>
            <Button onClick={exportData} variant="outline" className="mt-3">
              <Download className="mr-1 h-4 w-4" aria-hidden="true" /> Експорт JSON
            </Button>
          </div>
          <div className="rounded-xl border border-destructive/40 p-4">
            <p className="font-semibold text-destructive">Видалити акаунт</p>
            <p className="mt-1 text-sm text-muted-foreground">Назавжди. Усі ваші дані, чати й метчі буде видалено.</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="mt-3">
                  <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" /> Видалити назавжди
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Це дія незворотна</AlertDialogTitle>
                  <AlertDialogDescription>
                    Усі ваші дані буде безповоротно видалено. Введіть слово <strong>ВИДАЛИТИ</strong>, щоб підтвердити.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  aria-label="Введіть слово ВИДАЛИТИ"
                  placeholder="ВИДАЛИТИ"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmText("")}>Скасувати</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAccount} disabled={confirmText !== "ВИДАЛИТИ"}>
                    Видалити
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </section>
    </div>
  );
}