import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/ramle/auth";

export const Route = createFileRoute("/_authenticated/chats")({
  head: () => ({ meta: [{ title: "Повідомлення — RAMLE" }] }),
  component: ChatsLayout,
});

function ChatsLayout() {
  const { user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const onChild = path !== "/chats";

  const q = useQuery({
    queryKey: ["chats", user?.id],
    queryFn: async () => {
      const { data: matches } = await supabase
        .from("matches").select("*").eq("status", "accepted")
        .or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`)
        .order("updated_at", { ascending: false });
      const ids = (matches ?? []).map((m: any) => (m.user1_id === user!.id ? m.user2_id : m.user1_id));
      const profiles: Record<string, any> = {};
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("id,name").in("id", ids);
        (ps ?? []).forEach((p) => (profiles[p.id] = p));
      }
      return { matches: matches ?? [], profiles };
    },
    enabled: !!user,
  });

  return (
    <div className="mx-auto grid h-[calc(100vh-9rem)] max-w-6xl gap-4 md:grid-cols-[280px_1fr]">
      <aside className={"min-h-0 overflow-y-auto rounded-2xl border bg-card p-2 " + (onChild ? "hidden md:block" : "")}
        aria-label="Список розмов">
        <h1 className="px-3 pb-2 pt-3 font-display text-lg font-semibold">Розмови</h1>
        {(q.data?.matches ?? []).length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted-foreground">Поки нема активних розмов.</p>
        ) : (
          <ul>
            {q.data!.matches.map((m: any) => {
              const other = q.data!.profiles[m.user1_id === user?.id ? m.user2_id : m.user1_id];
              const active = path === `/chats/${m.id}`;
              return (
                <li key={m.id}>
                  <Link
                    to="/chats/$matchId" params={{ matchId: m.id }}
                    className={"block rounded-xl px-3 py-2 text-sm " +
                      (active ? "bg-primary text-primary-foreground" : "hover:bg-secondary")}
                  >
                    {other?.name ?? "Користувач"}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
      <section className={"min-h-0 rounded-2xl border bg-card " + (onChild ? "" : "hidden md:flex md:items-center md:justify-center")}>
        {onChild ? <Outlet /> : <p className="text-muted-foreground">Виберіть розмову зліва</p>}
      </section>
    </div>
  );
}