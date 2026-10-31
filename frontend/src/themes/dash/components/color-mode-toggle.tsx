import { Button } from "@/components/ui/button";
import { setColorMode, useColorMode } from "@/themes/color-mode";
import { HomeIcon } from "./home-icon";

export function ColorModeToggle() {
  const mode = useColorMode();
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-10 shrink-0 rounded-xl border-input bg-transparent text-foreground shadow-none hover:bg-secondary hover:text-foreground dark:bg-transparent dark:hover:bg-secondary"
      aria-label="Dark mode"
      aria-pressed={mode === "dark"}
      onClick={() => setColorMode(mode === "dark" ? "light" : "dark")}
    >
      <HomeIcon name="color-mode" />
    </Button>
  );
}
