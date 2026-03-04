import { Search } from "lucide-react";

export default function SearchBar() {
  return (
    <div
      className="flex w-full items-center rounded-xl border bg-transparent transition-[border-color,box-shadow] duration-200 focus-within:border-accent focus-within:shadow-[0_0_0_3px_oklch(from_var(--accent)_l_c_h/0.12)] md:w-auto"
      style={{ borderColor: "rgb(12 28 51 / 0.24)" }}
    >
      <input
        type="text"
        placeholder="Search..."
        className="w-full min-w-0 bg-transparent px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none md:w-48"
      />
      <button
        type="button"
        className="mr-1.5 flex items-center justify-center rounded-md p-1.5 transition hover:opacity-80"
        style={{ backgroundColor: "rgb(12 28 51 / 0.1)" }}
        aria-label="Search"
      >
        <Search className="size-4" style={{ color: "#0C1C33" }} />
      </button>
    </div>
  );
}
