import { Button } from "@/components/ui/button";

type Option<T extends string> = { value: T; label: string };

type PillToggleGroupProps<T extends string> = {
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
};

export function PillToggleGroup<T extends string>({
  value,
  options,
  onChange,
}: PillToggleGroupProps<T>) {
  return (
    <div className="flex items-center gap-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Button
            key={opt.value}
            variant={active ? "default" : "ghost"}
            size="xs"
            className={`rounded-full ${active ? "bg-accent text-accent-foreground" : ""}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}
