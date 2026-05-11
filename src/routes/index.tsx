import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, MapPin, Sparkles, ShieldCheck, Clock, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingHeader } from "@/components/ramle/MarketingHeader";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/ramle/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RALLY — Досить свайпати. Час дружити." },
      { name: "description", content: "Платонічні зустрічі офлайн протягом 48 годин. Знайдіть однодумців поруч." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />

      <main id="main">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 opacity-60"
            style={{
              background:
                "radial-gradient(60% 40% at 50% 0%, color-mix(in oklab, var(--primary) 20%, transparent), transparent 70%)",
            }}
          />
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:py-28 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Тільки платонічні знайомства
              </span>
              <h1 className="mt-5 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
                Досить свайпати. <br />
                <span className="text-primary">Час дружити.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                RALLY з'єднує людей за реальними інтересами та допомагає зустрітися офлайн
                протягом перших 48 годин. Без ігор. Без алгоритмів захоплення уваги.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/register">Створити акаунт безкоштовно</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/login">Уже маю акаунт</Link>
                </Button>
              </div>
              <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
                GDPR-сумісно. Координати ніколи не передаються браузеру.
              </div>
            </div>

            <div className="relative">
              <HeroCard />
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="border-t bg-secondary/40 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Що робить RALLY інакшим</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Ми створюємо інструмент, а не залежність. Простота, безпека і реальні зустрічі.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <Feature icon={HeartHandshake} title="Лише платонічні зв'язки">
                Жодних романтичних свайпів. Тільки дружба, спільні інтереси та підтримка.
              </Feature>
              <Feature icon={Clock} title="Зустріч за 48 годин">
                Сервіс заохочує перейти від чату до офлайн-зустрічі швидко — поки інтерес живий.
              </Feature>
              <Feature icon={Sparkles} title="Підбір за інтересами">
                Алгоритм рахує спільні інтереси та враховує відстань — без сторонніх даних.
              </Feature>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Як це працює</h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                ["Створіть профіль", "Опишіть себе кількома реченнями та оберіть інтереси."],
                ["Перегляньте Коло", "Дивіться людей за інтересами та відстанню. Без нескінченної стрічки."],
                ["Зустріньтеся офлайн", "Домовтесь про каву, прогулянку чи похід — у реальному житті."],
              ].map(([title, desc], i) => (
                <li key={title} className="rounded-2xl border bg-card p-6 shadow-soft">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 font-display text-lg font-bold text-primary">
                    {i + 1}
                  </div>
                  <h3 className="font-display text-xl font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* PRIVACY */}
        <section id="privacy" className="border-t bg-primary text-primary-foreground">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="grid gap-8 md:grid-cols-[1.5fr_1fr] md:items-center">
              <div>
                <h2 className="font-display text-3xl font-bold md:text-4xl">Приватність — це фундамент</h2>
                <p className="mt-3 max-w-2xl text-primary-foreground/80">
                  Ми мінімізуємо дані, не продаємо їх і дотримуємося GDPR. Ви завжди можете
                  завантажити всі свої дані або повністю видалити інформацію у два кліки.
                </p>
              </div>
              <ul className="space-y-3">
                {[
                  "Точні координати ніколи не залишають сервер",
                  "Право на доступ і портативність даних",
                  "Право бути забутим — миттєве видалення",
                  "Гранульовані cookie-згоди",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} RALLY. Створено для людей, які люблять реальне життя.</p>
          <div className="flex gap-6">
            <Link to="/login">Увійти</Link>
            <Link to="/register">Реєстрація</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-soft transition-shadow hover:shadow-elevated">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function HeroCard() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        aria-hidden="true"
        className="absolute -inset-6 -z-10 rounded-[2.5rem] opacity-50 blur-2xl"
        style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-glow))" }}
      />
      <div className="rounded-3xl border bg-card p-6 shadow-elevated">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 font-display text-lg font-bold text-primary">
            О
          </div>
          <div className="flex-1">
            <p className="font-semibold">Олена, 32</p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> приблизно 2 км
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          «Шукаю компанію для ранкових пробіжок Подолом і вечірньої кави з книжкою.»
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Біг", "Книги", "Кава", "Йога"].map((t) => (
            <span key={t} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="outline" aria-label="Пропустити пропозицію Олени">Пропустити</Button>
          <Button aria-label="Запропонувати дружбу Олені">
            <Users className="mr-1 h-4 w-4" aria-hidden="true" />
            Дружити
          </Button>
        </div>
      </div>
    </div>
  );
}
