import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";
import { createContext, useContext, useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ApiProposalVote, ApiVoteOutcome } from "@/lib/api/types";
import { BlockAge } from "./block-age";
import { CopyButton } from "./copy-button";
import { GovernanceTable } from "./governance-table";
import { IdentifierLink } from "./identifier-link";
import { VoteBadge } from "./vote-count-badge";

const outcomes = ["all", "yes", "no", "abstain"] as const;
const outcomeLabels = { yes: "Yes", no: "No", abstain: "Abstain" } as const;
const searchText = (vote: ApiProposalVote) =>
  [vote.proTxHash, vote.outpoint].join(" ");
const SearchContext = createContext<{
  value: string;
  onChange: (value: string) => void;
} | null>(null);
function MasternodeHeader() {
  const search = useContext(SearchContext);
  if (!search) return "Masternode";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Filter by masternode"
          data-active={Boolean(search.value)}
          className="inline-flex items-center gap-1 rounded-md px-1 hover:bg-action-subtle focus-visible:outline-2 focus-visible:outline-ring data-[active=true]:text-accent"
        >
          Masternode <ChevronDown aria-hidden="true" className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 rounded-xl p-2">
        <Input
          type="search"
          aria-label="Filter by ProTx hash or outpoint"
          placeholder="ProTx hash or outpoint"
          value={search.value}
          onChange={(event) => search.onChange(event.target.value)}
        />
      </PopoverContent>
    </Popover>
  );
}
export function ProposalMasternodeVotes({
  votes,
}: {
  votes: ApiProposalVote[] | null;
}) {
  const [outcome, setOutcome] = useState<"all" | ApiVoteOutcome>("all");
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const rows = useMemo(
    () =>
      (votes ?? [])
        .filter((row) => outcome === "all" || row.outcome === outcome)
        .filter(
          (row) => !query || searchText(row).toLowerCase().includes(query),
        )
        .sort(
          (first, second) => Date.parse(second.time) - Date.parse(first.time),
        ),
    [votes, outcome, query],
  );
  const columns = useMemo<ColumnDef<ApiProposalVote>[]>(
    () => [
      {
        id: "masternode",
        header: MasternodeHeader,
        cell: ({ row: { original } }) =>
          original.proTxHash ? (
            <IdentifierLink kind="masternode" value={original.proTxHash} />
          ) : (
            <div className="flex w-0 min-w-full items-center gap-2">
              <span
                title={original.outpoint}
                className="dash-data-mono min-w-0 flex-1 truncate"
              >
                {original.outpoint}
              </span>
              <CopyButton
                value={original.outpoint}
                label="Copy collateral outpoint"
              />
            </div>
          ),
      },
      {
        accessorKey: "signal",
        header: "Signal",
        cell: ({ row }) => (
          <span className="capitalize text-muted-foreground">
            {row.original.signal}
          </span>
        ),
      },
      {
        accessorKey: "outcome",
        header: () => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Filter by vote"
                className="inline-flex items-center gap-1 rounded-md px-1 hover:bg-action-subtle focus-visible:outline-2 focus-visible:outline-ring data-[active=true]:text-accent"
                data-active={outcome !== "all"}
              >
                Vote
                {outcome !== "all" && (
                  <span className="capitalize">· {outcome}</span>
                )}
                <ChevronDown aria-hidden="true" className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuRadioGroup
                value={outcome}
                onValueChange={(value) => {
                  const next = outcomes.find((item) => item === value);
                  if (next) setOutcome(next);
                }}
              >
                {outcomes.map((item) => (
                  <DropdownMenuRadioItem
                    key={item}
                    value={item}
                    className="capitalize"
                  >
                    {item}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        cell: ({ row }) => {
          const label = outcomeLabels[row.original.outcome];
          return <VoteBadge outcome={label}>{label}</VoteBadge>;
        },
      },
      {
        accessorKey: "time",
        header: () => <span className="block text-right">Timestamp</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <BlockAge timestamp={row.original.time} />
          </div>
        ),
      },
    ],
    [outcome],
  );
  return (
    <section
      aria-label="Masternode votes"
      className="min-w-0 rounded-3xl border border-border bg-card p-3 sm:p-5 [&_.dash-data-mono]:text-[13px] [&_.dash-data-mono]:leading-5"
    >
      <SearchContext.Provider value={{ value: search, onChange: setSearch }}>
        <GovernanceTable
          rows={rows}
          columns={columns}
          caption="Masternode votes"
          growColumn="masternode"
          storageKey="proposal-votes"
          searchLabel="Filter by ProTx hash or outpoint"
          searchText={searchText}
          externalSearch={search}
          filterKey={outcome}
          emptyMessage={
            !votes
              ? "Vote records unavailable."
              : votes.length
                ? "No votes match these filters."
                : "No votes recorded."
          }
        />
      </SearchContext.Provider>
    </section>
  );
}
