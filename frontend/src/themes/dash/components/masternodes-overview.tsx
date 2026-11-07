import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Network } from "@/lib/store";
import {
  snapshotChange,
  useHomeChainHistory,
} from "@/themes/dash/lib/home-history";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import { ChainHistoryChart } from "./chain-history-chart";
import { InfoPopover } from "./info-popover";
import { MissingApiData } from "./missing-api-data";
import { SkeletonBar } from "./skeleton";

export function MasternodesOverview({
  network,
  total,
  loading,
}: {
  network: Network;
  total: number | undefined;
  loading: boolean;
}) {
  const [days, setDays] = useState(30);
  const history = useHomeChainHistory(network, days + 1, days + 1);
  const combined = useMemo(
    () =>
      history.data?.map((entry) => ({
        ...entry,
        data: {
          ...entry.data,
          masternodes:
            entry.data.masternodes != null && entry.data.evonodes != null
              ? Number(entry.data.masternodes) + Number(entry.data.evonodes)
              : null,
        },
      })),
    [history.data],
  );
  const change = snapshotChange(combined, "masternodes", days);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section className="flex min-h-[310px] flex-1 flex-col rounded-3xl bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-medium">Masternode growth</h2>
              <InfoPopover label="About masternode history">
                Regular masternodes and Evonodes across all statuses. History
                uses network snapshots, not indexer registration dates. Missing
                snapshots are not zero.
              </InfoPopover>
            </div>
            <p className="mt-2 text-[32px] font-extrabold tabular-nums">
              {loading ? (
                <SkeletonBar className="inline-block w-24" />
              ) : (
                metricNumber(total, 0)
              )}{" "}
              <span className="text-base font-medium">Nodes</span>
            </p>
            {change != null && (
              <p className="mt-1 text-xs text-accent">
                {change > 0 ? "+" : ""}
                {metricNumber(change)}% · {days}D
              </p>
            )}
          </div>
          <Select
            value={String(days)}
            onValueChange={(value) => setDays(Number(value))}
          >
            <SelectTrigger
              aria-label="History period"
              className="w-32 rounded-full bg-action-subtle text-accent"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="rounded-xl">
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-6 flex min-h-52 flex-1 items-end">
          {history.isPending ? (
            <SkeletonBar className="h-52 w-full" />
          ) : (
            <ChainHistoryChart
              data={combined}
              metric="masternodes"
              label="Total masternode snapshot history"
              formatValue={(value) => `${metricNumber(value, 0)} nodes`}
              loading={false}
              error={history.isError}
              onRetry={() => void history.refetch()}
              height={210}
            />
          )}
        </div>
      </section>
      <div className="grid grid-cols-2 gap-4">
        <section className="min-w-0 rounded-3xl bg-card px-5 py-4 sm:px-6">
          <h2 className="mb-3 text-sm text-muted-foreground">
            Masternode rewards
          </h2>
          <MissingApiData
            inline
            description="Provide masternode payouts for a defined period, separated into Core and Platform rewards. Annual yield requires the node type, collateral amount, and calculation period."
          />
        </section>
        <section className="min-w-0 rounded-3xl bg-card px-5 py-4 sm:px-6">
          <h2 className="mb-3 text-sm text-muted-foreground">
            Masternode collateral
          </h2>
          <MissingApiData
            inline
            description="Provide the total collateral in duffs for registered masternodes, including the covered node types and statuses. Collateral is not an unspendable protocol balance."
          />
        </section>
      </div>
    </div>
  );
}

const quorums = [
  { icon: "instantsend", label: "InstantSend quorums" },
  { icon: "chainlocks", label: "ChainLocks quorums" },
  { icon: "hardfork", label: "Hard fork signalling quorums" },
  { icon: "platform", label: "Platform quorums" },
];

export function MasternodeQuorums() {
  return (
    <section
      aria-label="Quorum statistics"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {quorums.map((item) => (
        <div
          key={item.icon}
          className="flex min-w-0 flex-col items-start gap-3 rounded-3xl bg-card px-6 py-4"
        >
          <img
            src={`/icons/masternodes/${item.icon}.svg`}
            alt=""
            width={24}
            height={24}
            className="size-6"
          />
          <h2 className="text-sm text-muted-foreground">{item.label}</h2>
          <MissingApiData
            inline
            description={`${item.label}: provide active quorum types and unique member counts for the selected network. Define whether counts describe one quorum or the union of active quorums. Do not sum overlapping memberships.`}
          />
        </div>
      ))}
    </section>
  );
}
