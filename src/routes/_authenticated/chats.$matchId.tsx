import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/ramle/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chats/$matchId")({
  component: ChatRoom,
});

interface Msg { id: string; sender_id: string; content: string; created_at: string }

function ChatRoom() {
  const { matchId } = useParams({ from: "/_authenticated/chats/$matchId" });
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [otherName, setOtherName] = useState<string>("");
  const [newPing, setNewPing] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useQuery({
    queryKey: ["chat-init", matchId],
    queryFn: async () => {
      const [{ data: msgs }, { data: m }] = await Promise.all([
        supabase.from("messages").select("*").eq("match_id", matchId).order("created_at"),
        supabase.from("matches").select("user1_id,user2_id").eq("id", matchId).maybeSingle(),
      ]);
      setMessages((msgs ?? []) as Msg[]);
      const otherId = m ? (m.user1_id === user?.id ? m.user2_id : m.user1_id) : null;
      if (otherId) {
        const { data: p } = await supabase.from("profiles").select("name").eq("id", otherId).maybeSingle();
        setOtherName(p?.name ?? "Розмова");
      }
      return true;
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.sender_id !== user?.id) {
            setNewPing(true); setTimeout(() => setNewPing(false), 1500);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId, user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || !user) return;
    setText("");
    const { error } = await supabase.from("messages").insert({
      match_id: matchId, sender_id: user.id, content: value,
    });
    if (error) toast.error("Не вдалося надіслати", { description: error.message });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <Button asChild variant="ghost" size="icon" className="md:hidden" aria-label="Назад до розмов">
          <Link to="/chats"><ArrowLeft className="h-5 w-5" aria-hidden="true" /></Link>
        </Button>
        <p className="font-semibold">{otherName || "Розмова"}</p>
        {newPing && (
          <span className="ml-auto inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-success" role="status" aria-label="Нове повідомлення" />
        )}
      </header>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-4" aria-live="polite" aria-label="Стрічка повідомлень">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Скажіть привіт. Намагайтеся домовитися про зустріч у найближчі 48 годин.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
              <div className={"max-w-[80%] rounded-2xl px-4 py-2 text-sm " +
                (mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
                <p>{m.content}</p>
                <p className={"mt-1 text-[10px] " + (mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {new Date(m.created_at).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="flex gap-2 border-t bg-background p-3">
        <label className="sr-only" htmlFor="msg">Повідомлення</label>
        <Input id="msg" value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Напишіть повідомлення…" maxLength={2000} autoComplete="off" />
        <Button type="submit" disabled={!text.trim()} aria-label="Надіслати повідомлення">
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}