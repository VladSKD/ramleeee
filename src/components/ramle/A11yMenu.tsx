import { Accessibility } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useA11y } from "@/lib/ramle/a11y";

export function A11yMenu() {
  const { highContrast, toggleHighContrast, largeText, toggleLargeText } = useA11y();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Налаштування доступності">
          <Accessibility className="h-5 w-5" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="mb-3 font-semibold">Доступність</p>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block font-medium">Високий контраст</span>
              <span className="block text-xs text-muted-foreground">Краще для слабкого зору</span>
            </span>
            <Switch checked={highContrast} onCheckedChange={toggleHighContrast} aria-label="Високий контраст" />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block font-medium">Збільшений текст</span>
              <span className="block text-xs text-muted-foreground">18px базовий розмір</span>
            </span>
            <Switch checked={largeText} onCheckedChange={toggleLargeText} aria-label="Збільшений текст" />
          </label>
        </div>
      </PopoverContent>
    </Popover>
  );
}