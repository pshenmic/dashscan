import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useId } from "react";
import { homeChainQueryOptions } from "@/lib/home";
import type { Network } from "@/lib/store";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import { InfoPopover } from "./info-popover";
import { MissingApiData } from "./missing-api-data";

const statusLabels: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  defined: "Defined",
  started: "Signaling",
  locked_in: "Locked in",
  failed: "Failed",
};

export function HomeNetworkUpgrades({ network }: { network: Network }) {
  const titleId = useId();
  const chain = useQuery(homeChainQueryOptions(network));
  const upgrades = chain.data?.networkUpgrades;

  return (
    <section
      aria-labelledby={titleId}
      className="grid min-w-0 items-center gap-6 sm:grid-cols-[184px_minmax(0,1fr)]"
    >
      <div>
        <div className="flex items-center gap-2">
          <h3 id={titleId} className="text-sm text-muted-foreground">
            <InfoPopover
              label="About network upgrades"
              trigger="Network upgrades"
            >
              Deployments reported by the connected Dash Core node, not a
              complete release history. Heights refer to activation, not
              signaling.
            </InfoPopover>
          </h3>
        </div>
        <p className="mt-2 text-[32px] font-extrabold tabular-nums">
          {chain.isPending ? "…" : metricNumber(upgrades?.length, 0)}{" "}
          <span className="text-base font-medium">Deployments</span>
        </p>
      </div>
      {chain.isPending ? (
        <p className="text-sm text-muted-foreground">Loading upgrades…</p>
      ) : chain.isError && !upgrades ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load upgrades.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void chain.refetch()}
          >
            Try again
          </button>
        </p>
      ) : upgrades == null ? (
        <MissingApiData description="This API version does not expose Dash Core deployment data." />
      ) : upgrades.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No deployments reported.
        </p>
      ) : (
        <div className="min-w-0">
          {chain.isError && (
            <output className="mb-2 block text-sm text-muted-foreground">
              Could not refresh upgrades. Showing the last loaded snapshot.
            </output>
          )}
          <ul
            aria-label="Network deployments"
            className="flex gap-4 overflow-x-auto pb-2"
          >
            {upgrades.map((upgrade) => (
              <li
                key={upgrade.id}
                className="flex min-w-48 shrink-0 flex-col gap-2 rounded-3xl dash-home-panel px-6 py-4"
              >
                <p className="text-sm text-muted-foreground">
                  Type: {upgrade.type}
                </p>
                <div className="flex items-center gap-2">
                  <h4 className="text-2xl font-extrabold text-accent">
                    {upgrade.id}
                  </h4>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${upgrade.status === "active" ? "bg-positive-brand/12 text-success" : upgrade.status === "failed" ? "bg-destructive/12 text-destructive" : "bg-secondary text-muted-foreground"}`}
                  >
                    {Object.hasOwn(statusLabels, upgrade.status)
                      ? statusLabels[upgrade.status]
                      : "Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-lg bg-secondary px-2 py-1 text-muted-foreground">
                    Activation
                  </span>
                  {upgrade.activationHeight != null &&
                  Number.isSafeInteger(upgrade.activationHeight) &&
                  upgrade.activationHeight >= 0 ? (
                    chain.data?.latestHeight != null &&
                    upgrade.activationHeight <= chain.data.latestHeight ? (
                      <Link
                        to="/blocks/$hashOrHeight"
                        params={{
                          hashOrHeight: String(upgrade.activationHeight),
                        }}
                        className="rounded text-accent hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        #{metricNumber(upgrade.activationHeight, 0)}
                      </Link>
                    ) : (
                      <span>#{metricNumber(upgrade.activationHeight, 0)}</span>
                    )
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
