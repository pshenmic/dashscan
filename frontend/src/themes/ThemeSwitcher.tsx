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
import { THEME_NAMES, type ThemeName } from "./registry";

const THEME_LABELS: Record<ThemeName, string> = {
  classic: "Classic",
  redesign: "Redesign",
};

export function ThemeSwitcher() {
  const active = useActiveTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-full"
          aria-label="Switch theme"
        >
          <Palette className="size-4" />
          <span className="hidden sm:inline">{THEME_LABELS[active]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEME_NAMES.map((name) => (
          <DropdownMenuItem
            key={name}
            onClick={() => setTheme(name)}
            className={active === name ? "font-semibold text-accent" : ""}
          >
            {THEME_LABELS[name]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
