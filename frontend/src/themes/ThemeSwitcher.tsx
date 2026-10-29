import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setTheme, useActiveTheme } from "./active";
import { HomeIcon } from "./dash/components/home-icon";
import { THEME_NAMES, type ThemeName } from "./registry";

const THEME_LABELS: Record<ThemeName, string> = {
  dash: "Dash",
  neo: "Neo",
};

const THEME_TAGS: Record<ThemeName, string> = {
  dash: "WIP",
  neo: "AI-powered",
};

export function ThemeSwitcher() {
  const active = useActiveTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={
            active === "dash"
              ? "h-10 gap-2 rounded-xl border-input bg-transparent px-3 font-medium tracking-wide text-foreground shadow-none hover:bg-secondary hover:text-foreground dark:bg-transparent dark:hover:bg-secondary"
              : "gap-2 rounded-full"
          }
          aria-label="Switch theme"
        >
          {active === "dash" ? (
            <HomeIcon name="theme" />
          ) : (
            <Palette className="size-4" />
          )}
          <span>{THEME_LABELS[active]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEME_NAMES.map((name) => (
          <DropdownMenuItem
            key={name}
            onClick={() => setTheme(name)}
            className={`flex items-center justify-between gap-3 ${active === name ? "font-semibold text-accent" : ""}`}
          >
            <span>{THEME_LABELS[name]}</span>
            <span className="text-xs text-muted-foreground">
              {THEME_TAGS[name]}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
