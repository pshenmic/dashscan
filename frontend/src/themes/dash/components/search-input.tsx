import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
}: SearchInputProps) {
  return (
    <div className="flex items-center rounded-xl border border-border bg-transparent transition-[border-color,box-shadow] duration-200 focus-within:border-accent focus-within:shadow-[0_0_0_3px_oklch(from_var(--accent)_l_c_h/0.12)]">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-48 min-w-0 bg-transparent px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none lg:w-64"
      />
      <button
        type="button"
        className="mr-1.5 flex items-center justify-center rounded-md bg-muted p-1.5 transition hover:opacity-80"
        aria-label="Search"
      >
        <Search className="size-4 text-muted-foreground" />
      </button>
    </div>
  );
}
