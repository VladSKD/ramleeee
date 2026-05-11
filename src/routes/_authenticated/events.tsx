import { createFileRoute } from "@tanstack/react-router";
import { CalendarPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({ meta: [{ title: "Події — RAMLE" }] }),
  component: EventsPage,
});

function EventsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-bold">Події та міні-групи</h1>
      <p className="text-muted-foreground">Незабаром: створюйте офлайн-зустрічі за інтересами.</p>

      <div className="mt-8 rounded-2xl border bg-card p-10 text-center">
        <CalendarPlus className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
        <p className="mt-4 font-semibold">Запуск дуже скоро</p>
        <p className="text-sm text-muted-foreground">
          Ми готуємо інструмент для створення прогулянок, ранкових пробіжок і кав'ярень-зустрічей у вашому місті.
        </p>
      </div>
    </div>
  );
}