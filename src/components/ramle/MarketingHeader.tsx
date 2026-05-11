import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { A11yMenu } from "./A11yMenu";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav aria-label="Головна навігація" className="hidden items-center gap-6 text-sm md:flex">
          <a href="#how" className="text-muted-foreground hover:text-foreground">Як це працює</a>
          <a href="#features" className="text-muted-foreground hover:text-foreground">Можливості</a>
          <a href="#privacy" className="text-muted-foreground hover:text-foreground">Приватність</a>
        </nav>
        <div className="flex items-center gap-2">
          <A11yMenu />
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/login">Увійти</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Створити акаунт</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}