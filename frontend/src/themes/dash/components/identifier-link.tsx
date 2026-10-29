import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CopyButton } from "./copy-button";

export function IdentifierLink({
  value,
  kind,
  prefix,
}: {
  value: string;
  kind: "address" | "block" | "transaction";
  prefix?: ReactNode;
}) {
  const destination =
    kind === "address"
      ? { to: "/address/$address" as const, params: { address: value } }
      : kind === "block"
        ? {
            to: "/blocks/$hashOrHeight" as const,
            params: { hashOrHeight: value },
          }
        : { to: "/transactions/$hash" as const, params: { hash: value } };

  return (
    <div className="flex w-0 min-w-full items-center gap-2">
      {prefix && <span className="shrink-0">{prefix}</span>}
      <Link
        {...destination}
        title={value}
        className="dash-data-mono min-w-0 flex-1 truncate hover:text-accent focus-visible:outline-2 focus-visible:outline-ring"
      >
        {value}
      </Link>
      <span className="flex shrink-0">
        <CopyButton value={value} />
      </span>
    </div>
  );
}
