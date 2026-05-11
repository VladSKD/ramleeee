import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

const KEY = "ramle-consent-v1";

interface Prefs {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [manage, setManage] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ necessary: true, analytics: false, marketing: false });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEY)) setOpen(true);
  }, []);

  async function save(p: Prefs) {
    localStorage.setItem(KEY, JSON.stringify({ ...p, ts: Date.now() }));
    try {
      const { data } = await supabase.auth.getUser();
      await supabase.from("consents").insert({
        user_id: data.user?.id ?? null,
        necessary: p.necessary,
        analytics: p.analytics,
        marketing: p.marketing,
        tos_accepted: true,
      });
    } catch {
      /* anonymous insert may be blocked; banner localStorage is enough for guests */
    }
    setOpen(false);
    setManage(false);
  }

  if (!open) return null;

  return (
    <>
      <div
        role="region"
        aria-label="Налаштування файлів cookie"
        className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-3xl rounded-2xl border bg-card p-5 shadow-elevated md:bottom-6"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="font-semibold">Ми поважаємо вашу приватність</p>
              <p className="text-sm text-muted-foreground">
                Ми використовуємо файли cookie для базової роботи сайту. Аналітика й маркетинг — лише за вашою згодою (GDPR).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setManage(true)} aria-label="Керувати налаштуваннями cookie">
              Керувати
            </Button>
            <Button variant="ghost" onClick={() => save({ necessary: true, analytics: false, marketing: false })}>
              Лише необхідні
            </Button>
            <Button onClick={() => save({ necessary: true, analytics: true, marketing: true })}>
              Прийняти все
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={manage} onOpenChange={setManage}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Налаштування файлів cookie</DialogTitle>
            <DialogDescription>
              Ви можете точно контролювати, які дані збираються. Зміни можна оновити будь-коли в Налаштуваннях.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Row label="Необхідні" desc="Базова робота сайту, авторизація." checked={true} disabled />
            <Row
              label="Аналітика"
              desc="Допомагає покращувати сервіс. Анонімізовано."
              checked={prefs.analytics}
              onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
            />
            <Row
              label="Маркетинг"
              desc="Релевантні новини й рекомендації."
              checked={prefs.marketing}
              onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => save({ necessary: true, analytics: false, marketing: false })}>
              Відхилити необов'язкове
            </Button>
            <Button onClick={() => save({ ...prefs, necessary: true })}>Зберегти вибір</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({
  label, desc, checked, onChange, disabled,
}: { label: string; desc: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border p-3">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-label={`Cookie категорія: ${label}`}
      />
    </div>
  );
}