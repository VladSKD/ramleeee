import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, X, UserPlus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/ramle/auth";
import { approxDistanceKm, calcAge } from "@/lib/ramle/distance";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Стрічка — RAMLE" }] }),
  component: Dashboard,
});

interface ProfileRow {
  id: string; name: string; bio: string | null; city: string | null;
  birth_date: string | null; lat: number | null; lng: number | null;
}

function Dashboard() {
  const { user } = useAuth();
  const [city, setCity] = useState("");
  const [maxDist, setMaxDist] = useState<number | "">("");

  const meQ = useQuery({
    queryKey: ["me", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const myInterestsQ = useQuery({
    queryKey: ["my-interests", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_interests").select("interest_id, interests(name)").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const matchesQ = useQuery({
    queryKey: ["my-matches", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("matches").select("user1_id,user2_id,status").or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`);
      return data ?? [];
    },
    enabled: !!user,
  });

  const peopleQ = useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").neq("id", user!.id).limit(50);
      return (data ?? []) as ProfileRow[];
    },
    enabled: !!user,
  });

  const interestsByUserQ = useQuery({
    queryKey: ["all-user-interests"],
    queryFn: async () => {
      const { data } = await supabase.from("user_interests").select("user_id, interests(name)");
      const map: Record<string, string[]> = {};
      (data ?? []).forEach((r: any) => {
        const n = r.interests?.name; if (!n) return;
        (map[r.user_id] ||= []).push(n);
      });
      return map;
    },
    enabled: !!user,
  });

  const myInterestNames = useMemo(
    () => new Set((myInterestsQ.data ?? []).map((r: any) => r.interests?.name).filter(Boolean) as string[]),
    [myInterestsQ.data],
  );

  const excluded = useMemo(() => {
    const set = new Set<string>();
    (matchesQ.data ?? []).forEach((m: any) => {
      if (m.status === "rejected" || m.status === "accepted" || m.status === "pending") {
        set.add(m.user1_id === user?.id ? m.user2_id : m.user1_id);
      }
    });
    return set;
  }, [matchesQ.data, user?.id]);

  const list = useMemo(() => {
    if (!peopleQ.data) return [];
    return peopleQ.data
      .filter((p) => !excluded.has(p.id))
      .map((p) => {
        const dist = approxDistanceKm(meQ.data ?? null, p);
        const tags = interestsByUserQ.data?.[p.id] ?? [];
        const shared = tags.filter((t) => myInterestNames.has(t));
        return { ...p, dist, tags, sharedCount: shared.length };
      })
      .filter((p) => (city ? (p.city ?? "").toLowerCase().includes(city.toLowerCase()) : true))
      .filter((p) => (maxDist === "" || p.dist == null ? true : p.dist <= Number(maxDist)))
      .sort((a, b) => b.sharedCount - a.sharedCount || (a.dist ?? 9999) - (b.dist ?? 9999));
  }, [peopleQ.data, excluded, meQ.data, interestsByUserQ.data, myInterestNames, city, maxDist]);

  async function act(targetId: string, status: "accepted" | "rejected") {
    if (!user) return;
    const [u1, u2] = [user.id, targetId].sort();
    const { error } = await supabase.from("matches").upsert(
      { user1_id: u1, user2_id: u2, initiator_id: user.id, status },
      { onConflict: "user1_id,user2_id" },
    );
    if (error) { toast.error("Помилка", { description: error.message }); return; }
    toast.success(status === "accepted" ? "Запит на дружбу надіслано" : "Пропущено");
    matchesQ.refetch();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold">Стрічка знайомств</h1>
        <p className="text-muted-foreground">Реальні люди поруч. Без свайпів — лише два чітких рішення.</p>
      </header>

      {!meQ.data?.bio && (
        <NeedsProfile />
      )}

      <div className="mb-6 grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[1fr_180px_auto]">
        <label className="relative block">
          <span className="sr-only">Місто</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input className="pl-9" placeholder="Місто" value={city} onChange={(e) => setCity(e.target.value)} aria-label="Фільтр за містом" />
        </label>
        <label className="block">
          <span className="sr-only">Максимальна відстань (км)</span>
          <Input type="number" min={1} max={500} placeholder="Радіус, км"
            value={maxDist} onChange={(e) => setMaxDist(e.target.value === "" ? "" : Number(e.target.value))}
            aria-label="Максимальна відстань у кілометрах" />
        </label>
        <Button variant="outline" onClick={() => { setCity(""); setMaxDist(""); }}>Скинути</Button>
      </div>

      {peopleQ.isLoading ? (
        <p className="text-muted-foreground" role="status">Завантаження…</p>
      ) : list.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {list.map((p) => (
            <li key={p.id}>
              <PersonCard p={p} onConnect={() => act(p.id, "accepted")} onPass={() => act(p.id, "rejected")} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PersonCard({ p, onConnect, onPass }: {
  p: { id: string; name: string; bio: string | null; city: string | null; birth_date: string | null; dist: number | null; tags: string[]; sharedCount: number };
  onConnect: () => void; onPass: () => void;
}) {
  const age = calcAge(p.birth_date);
  return (
    <article className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-elevated">
      <header className="flex items-start gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 font-display text-lg font-bold text-primary" aria-hidden="true">
          {p.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">
            {p.name}{age != null && <span className="text-muted-foreground">, {age}</span>}
          </h2>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {p.dist != null ? `приблизно ${p.dist} км` : (p.city || "Локація не вказана")}
          </p>
        </div>
        {p.sharedCount > 0 && (
          <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success" aria-label={`${p.sharedCount} спільних інтересів`}>
            {p.sharedCount} спільних
          </span>
        )}
      </header>
      {p.bio && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{p.bio}</p>}
      {p.tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Інтереси">
          {p.tags.slice(0, 6).map((t) => (
            <li key={t} className="rounded-full bg-secondary px-2.5 py-1 text-xs">{t}</li>
          ))}
        </ul>
      )}
      <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
        <Button variant="outline" onClick={onPass} aria-label={`Пропустити ${p.name}`}>
          <X className="mr-1 h-4 w-4" aria-hidden="true" /> Пропустити
        </Button>
        <Button onClick={onConnect} aria-label={`Запропонувати дружбу: ${p.name}`}>
          <UserPlus className="mr-1 h-4 w-4" aria-hidden="true" /> Дружити
        </Button>
      </div>
    </article>
  );
}

function NeedsProfile() {
  return (
    <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <p className="font-semibold">Заповніть профіль, щоб отримувати кращі рекомендації</p>
      <p className="mt-1 text-sm text-muted-foreground">Додайте біо, місто й інтереси у Налаштуваннях.</p>
      <Link to="/settings" className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">
        Перейти в Налаштування →
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border bg-card p-10 text-center">
      <p className="font-semibold">Поки нікого нема за вашими критеріями</p>
      <p className="mt-1 text-sm text-muted-foreground">Спробуйте розширити радіус або очистити фільтри.</p>
    </div>
  );
}