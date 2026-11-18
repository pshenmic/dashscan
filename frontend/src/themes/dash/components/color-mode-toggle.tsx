import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setColorMode, useColorMode } from "@/themes/color-mode";

export function ColorModeToggle() {
  const mode = useColorMode();
  const label =
    mode === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-10 shrink-0 rounded-xl border-input bg-transparent text-foreground shadow-none hover:bg-secondary hover:text-foreground dark:bg-transparent dark:hover:bg-secondary"
      aria-label={label}
      title={label}
      onClick={() => setColorMode(mode === "dark" ? "light" : "dark")}
    >
      {mode === "dark" ? (
        <Sun aria-hidden="true" className="size-4" />
      ) : (
        <Moon aria-hidden="true" className="size-4" />
      )}
    </Button>
  );
}
