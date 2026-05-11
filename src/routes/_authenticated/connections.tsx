import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessagesSquare, UserCheck, UserPlus, Clock, XCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/ramle/auth";
import { toast } from "sonner"; // Якщо використовуєш sonner для сповіщень

export const Route = createFileRoute("/_authenticated/connections")({
  head: () => ({ meta: [{ title: "Коло друзів — PeTrack" }] }),
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Основний запит даних
  const { data, isLoading, isError } = useQuery({
    queryKey: ["connections", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Користувач не авторизований");

      // 1. Отримуємо всі матчі/зв'язки користувача
      const { data: matches, error: matchesError } = await supabase
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (matchesError) throw matchesError;

      // 2. Витягуємо ID іншої сторони
      const otherIds = (matches ?? []).map((m) => 
        m.user1_id === user.id ? m.user2_id : m.user1_id
      );

      if (otherIds.length === 0) return { matches: [], profiles: {} };

      // 3. Завантажуємо профілі цих людей
      const { data: profs, error: profsError } = await supabase
        .from("profiles")
        .select("id, name, city, bio") // Прибрали проблемну колонку
        .in("id", otherIds);

      if (profsError) throw profsError;

      const profilesMap: Record<string, any> = {};
      profs?.forEach((p) => (profilesMap[p.id] = p));

      return { matches: matches ?? [], profiles: profilesMap };
    },
    enabled: !!user,
  });

  // Функція прийняття запиту
  async function handleAccept(matchId: string) {
    const { error } = await supabase
      .from("matches")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", matchId);

    if (error) {
      toast.error("Не вдалося прийняти запит");
    } else {
      toast.success("Запит прийнято! Тепер ви друзі");
      queryClient.invalidateQueries({ queryKey: ["connections"] });
    }
  }

  // Функція відхилення запиту
  async function handleReject(matchId: string) {
    const { error } = await supabase
      .from("matches")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", matchId);

    if (error) {
      toast.error("Помилка при відхиленні");
    } else {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
    }
  }

  if (isLoading) return <div className="p-10 text-center">Завантаження кола друзів...</div>;
  if (isError) return <div className="p-10 text-center text-destructive">Сталася помилка при завантаженні.</div>;

  const allMatches = data?.matches ?? [];
  const profiles = data?.profiles ?? {};

  // Фільтрація по категоріях
  const incoming = allMatches.filter((m) => m.status === "pending" && m.initiator_id !== user?.id);
  const accepted = allMatches.filter((m) => m.status === "accepted");
  const sent = allMatches.filter((m) => m.status === "pending" && m.initiator_id === user?.id);

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-20">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold tracking-tight">Коло друзів</h1>
        <p className="text-muted-foreground text-lg">
          Керуйте своїми знайомствами та новими запитами.
        </p>
      </header>

      {/* Вхідні запити */}
      <Section 
        title="Вхідні запити" 
        count={incoming.length} 
        icon={<UserPlus className="h-5 w-5 text-primary" />}
      >
        {incoming.length === 0 ? (
          <Empty>Поки що немає нових запитів на знайомство.</Empty>
        ) : (
          <div className="grid gap-4">
            {incoming.map((m) => {
              const other = profiles[m.user1_id === user?.id ? m.user2_id : m.user1_id];
              return (
                <div key={m.id} className="flex items-center justify-between rounded-3xl border bg-card/50 p-5 backdrop-blur-sm transition-all hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center font-bold text-secondary-foreground">
                      {other?.name?.[0] ?? "?"}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{other?.name ?? "Користувач"}</p>
                      <p className="text-sm text-muted-foreground">{other?.city ?? "Місто не вказано"}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="ghost" size="icon" onClick={() => handleReject(m.id)} className="rounded-full text-destructive hover:bg-destructive/10">
                      <XCircle className="h-6 w-6" />
                    </Button>
                    <Button size="icon" onClick={() => handleAccept(m.id)} className="rounded-full shadow-lg shadow-primary/20">
                      <CheckCircle2 className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Список друзів */}
      <Section 
        title="Ваші друзі" 
        count={accepted.length} 
        icon={<UserCheck className="h-5 w-5 text-green-500" />}
      >
        {accepted.length === 0 ? (
          <Empty>Ви ще не додали жодного друга. Час написати комусь!</Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {accepted.map((m) => {
              const other = profiles[m.user1_id === user?.id ? m.user2_id : m.user1_id];
              return (
                <div key={m.id} className="group flex items-center justify-between rounded-3xl border bg-card p-5 transition-all hover:border-primary/50">
                  <div className="space-y-1">
                    <p className="font-bold">{other?.name ?? "Друг"}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground italic">
                      {other?.bio || "Любитель тварин"}
                    </p>
                  </div>
                  <Button asChild variant="secondary" className="rounded-2xl group-hover:bg-primary group-hover:text-primary-foreground">
                    <Link to="/chats/$matchId" params={{ matchId: m.id }}>
                      <MessagesSquare className="mr-2 h-4 w-4" /> Чат
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Надіслані запити */}
      <Section 
        title="Надіслані запити" 
        count={sent.length} 
        icon={<Clock className="h-5 w-5 text-orange-400" />}
      >
        {sent.length === 0 ? (
          <Empty>Ви ще не надсилали запитів сьогодні.</Empty>
        ) : (
          <div className="grid gap-3">
            {sent.map((m) => {
              const other = profiles[m.user1_id === user?.id ? m.user2_id : m.user1_id];
              return (
                <div key={m.id} className="flex items-center justify-between rounded-2xl border bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-orange-400" />
                    <p className="font-medium text-sm">{other?.name ?? "Користувач"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-full border">
                    Очікування...
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

// Допоміжні компоненти
function Section({ title, count, icon, children }: { title: string; count: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-4 flex items-center gap-2 px-2">
        {icon}
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <span className="ml-auto rounded-full bg-secondary px-3 py-1 text-xs font-medium">
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-32 items-center justify-center rounded-3xl border border-dashed bg-muted/10 p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}