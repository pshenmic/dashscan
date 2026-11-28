import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";
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
import { formatNumber } from "@/lib/format";
import { BlockAge } from "./block-age";
import { CopyButton } from "./copy-button";
import { GovernanceTable } from "./governance-table";
import { IdentifierLink } from "./identifier-link";
import { VoteBadge } from "./vote-count-badge";

const outcomes = ["all", "yes", "no", "abstain"] as const;
const outcomeLabels = { yes: "Yes", no: "No", abstain: "Abstain" } as const;
const searchText = (vote: ApiProposalVote) =>
  [vote.proTxHash, vote.outpoint].join(" ");
const signalColumn: ColumnDef<ApiProposalVote> = {
  accessorKey: "signal",
  header: "Signal",
  cell: ({ row }) => (
    <span className="capitalize text-muted-foreground">
      {row.original.signal}
    </span>
  ),
};
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
  const fundingOnly =
    !!votes?.length && votes.every((vote) => vote.signal === "funding");
  const title = fundingOnly ? "Funding votes" : "Masternode votes";
  const rows = useMemo(
    () =>
      (votes ?? [])
        .filter((row) => outcome === "all" || row.outcome === outcome)
        .filter(
          (row) => !query || searchText(row).toLowerCase().includes(query),
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
              <span className="shrink-0 text-xs text-muted-foreground">
                Outpoint
              </span>
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
      ...(fundingOnly ? [] : [signalColumn]),
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
        id: "time",
        accessorFn: (vote) => Date.parse(vote.time),
        sortingFn: "basic",
        header: ({ column }) => {
          const newestFirst = column.getIsSorted() === "desc";
          const Icon = newestFirst ? ArrowDown : ArrowUp;
          return (
            <div className="text-right">
              <button
                type="button"
                aria-label={`Sort by timestamp: ${newestFirst ? "oldest" : "newest"} first`}
                onClick={() => column.toggleSorting(!newestFirst)}
                className="inline-flex items-center gap-1 rounded-md px-1 hover:bg-action-subtle focus-visible:outline-2 focus-visible:outline-ring"
              >
                Timestamp{" "}
                <Icon aria-hidden="true" className="size-3 text-accent" />
              </button>
            </div>
          );
        },
        cell: ({ row }) => (
          <div className="text-right">
            <BlockAge timestamp={row.original.time} />
          </div>
        ),
      },
    ],
    [outcome, fundingOnly],
  );
  return (
    <section
      aria-label={title}
      className="min-w-0 rounded-3xl border border-border bg-card p-3 sm:p-5 [&_.dash-data-mono]:text-[13px] [&_.dash-data-mono]:leading-5"
    >
      <SearchContext.Provider value={{ value: search, onChange: setSearch }}>
        <GovernanceTable
          rows={rows}
          initialSorting={[{ id: "time", desc: true }]}
          columns={columns}
          caption={title}
          controls={
            <h2 className="text-sm font-medium">
              {title}
              {votes != null && (
                <span className="ml-2 text-muted-foreground tabular-nums">
                  {formatNumber(rows.length)}
                </span>
              )}
            </h2>
          }
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
