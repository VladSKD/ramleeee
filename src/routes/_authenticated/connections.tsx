import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/ramle/auth";

export const Route = createFileRoute("/_authenticated/connections")({
  head: () => ({ meta: [{ title: "Коло друзів — RAMLE" }] }),
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const { user } = useAuth();

  const q = useQuery({
    queryKey: ["connections", user?.id],
    queryFn: async () => {
      const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`)
        .order("updated_at", { ascending: false });
      const otherIds = (matches ?? []).map((m: any) => (m.user1_id === user!.id ? m.user2_id : m.user1_id));
      if (otherIds.length === 0) return { matches: matches ?? [], profiles: {} as Record<string, any> };
      const { data: profs } = await supabase.from("profiles").select("id,name,city,bio").in("id", otherIds);
      const map: Record<string, any> = {};
      (profs ?? []).forEach((p) => (map[p.id] = p));
      return { matches: matches ?? [], profiles: map };
    },
    enabled: !!user,
  });

  async function accept(matchId: string) {
    await supabase.from("matches").update({ status: "accepted" }).eq("id", matchId);
    q.refetch();
  }
  async function reject(matchId: string) {
    await supabase.from("matches").update({ status: "rejected" }).eq("id", matchId);
    q.refetch();
  }

  const matches = q.data?.matches ?? [];
  const incoming = matches.filter((m: any) => m.status === "pending" && m.initiator_id !== user?.id);
  const accepted = matches.filter((m: any) => m.status === "accepted");
  const sent = matches.filter((m: any) => m.status === "pending" && m.initiator_id === user?.id);

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <header>
        <h1 className="font-display text-3xl font-bold">Коло друзів</h1>
        <p className="text-muted-foreground">Запити, активні розмови й надіслані запрошення.</p>
      </header>

      <Section title={`Вхідні запити (${incoming.length})`}>
        {incoming.length === 0 ? <Empty>Поки нічого нового.</Empty> : (
          <ul className="grid gap-3">
            {incoming.map((m: any) => {
              const other = q.data?.profiles[m.user1_id === user?.id ? m.user2_id : m.user1_id];
              return (
                <li key={m.id} className="flex items-center justify-between rounded-2xl border bg-card p-4">
                  <div>
                    <p className="font-semibold">{other?.name ?? "Користувач"}</p>
                    <p className="text-sm text-muted-foreground">{other?.city ?? ""}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => reject(m.id)}>Відхилити</Button>
                    <Button onClick={() => accept(m.id)}>Прийняти</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title={`Друзі (${accepted.length})`}>
        {accepted.length === 0 ? <Empty>Прийміть запит або надішліть свій.</Empty> : (
          <ul className="grid gap-3 md:grid-cols-2">
            {accepted.map((m: any) => {
              const other = q.data?.profiles[m.user1_id === user?.id ? m.user2_id : m.user1_id];
              return (
                <li key={m.id} className="flex items-center justify-between rounded-2xl border bg-card p-4">
                  <div>
                    <p className="font-semibold">{other?.name ?? "Користувач"}</p>
                    <p className="line-clamp-1 text-sm text-muted-foreground">{other?.bio ?? ""}</p>
                  </div>
                  <Button asChild>
                    <Link to="/chats/$matchId" params={{ matchId: m.id }} aria-label={`Відкрити чат з ${other?.name ?? "користувачем"}`}>
                      <MessagesSquare className="mr-1 h-4 w-4" aria-hidden="true" /> Чат
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title={`Надіслані (${sent.length})`}>
        {sent.length === 0 ? <Empty>Ще нікому не написали.</Empty> : (
          <ul className="grid gap-3">
            {sent.map((m: any) => {
              const other = q.data?.profiles[m.user1_id === user?.id ? m.user2_id : m.user1_id];
              return (
                <li key={m.id} className="rounded-2xl border bg-card p-4">
                  <p className="font-semibold">{other?.name ?? "Користувач"}</p>
                  <p className="text-sm text-muted-foreground">Очікуємо відповіді…</p>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">{children}</p>;
}