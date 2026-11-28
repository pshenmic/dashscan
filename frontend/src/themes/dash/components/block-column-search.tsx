import { useNavigate, useSearch } from "@tanstack/react-router";
import { ColumnSearch } from "./column-search";

export function BlockColumnSearch({
  kind,
  sorting,
}: {
  kind: "height" | "hash";
  sorting?: {
    order: "asc" | "desc";
    onChange: (order: "asc" | "desc") => void;
  };
}) {
  const navigate = useNavigate({ from: "/blocks/" });
  const filters = useSearch({ from: "/blocks/" });
  return (
    <ColumnSearch
      kind={kind}
      label={kind === "height" ? "Height" : "Block Hash"}
      activeValue={filters[kind]}
      sorting={sorting}
      onChange={(value) => {
        void navigate({
          search: (previous) => ({ ...previous, page: 1, [kind]: value }),
          replace: true,
          resetScroll: false,
        });
      }}
    />
  );
}
