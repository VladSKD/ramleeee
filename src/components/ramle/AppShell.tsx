import { Link, useRouterState } from "@tanstack/react-router";
import { Users, Compass, Calendar, MessagesSquare, Settings, LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { A11yMenu } from "./A11yMenu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/ramle/auth";
import { useNavigate } from "@tanstack/react-router";

const nav = [
  { to: "/dashboard", label: "Стрічка", icon: Compass },
  { to: "/connections", label: "Коло друзів", icon: Users },
  { to: "/events", label: "Події", icon: Calendar },
  { to: "/chats", label: "Повідомлення", icon: MessagesSquare },
  { to: "/settings", label: "Налаштування", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen w-full bg-secondary/30">
      <aside
        aria-label="Бічна навігація"
        className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar p-4 md:flex"
      >
        <div className="px-2 py-2"><Logo /></div>
        <nav className="mt-6 flex-1 space-y-1" aria-label="Розділи">
          {nav.map((item) => {
            const active = path === item.to || path.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors " +
                  (active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")
                }
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Button
          variant="ghost"
          className="mt-4 justify-start gap-3"
          onClick={async () => { await signOut(); navigate({ to: "/" }); }}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" /> Вийти
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:px-8">
          <div className="md:hidden"><Logo /></div>
          <div className="ml-auto flex items-center gap-2">
            <A11yMenu />
          </div>
        </header>
        <main id="main" className="flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>

        {/* Mobile bottom nav */}
        <nav
          aria-label="Мобільна навігація"
          className="sticky bottom-0 z-30 grid grid-cols-5 border-t bg-background md:hidden"
        >
          {nav.map((item) => {
            const active = path === item.to || path.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to}
                className={"flex flex-col items-center justify-center gap-1 py-2 text-xs " +
                  (active ? "text-primary" : "text-muted-foreground")}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}>
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}