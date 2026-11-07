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

function UpgradeTimelineMarker() {
  return (
    <div className="relative mt-3 flex flex-col items-center gap-1 before:absolute before:top-[3px] before:-left-3 before:-right-3 before:h-0.5 before:bg-accent/15">
      <span
        aria-hidden="true"
        className="relative size-2 rounded-full bg-accent shadow-[0_0_12px_var(--accent)]"
      />
      <MissingApiData
        inline
        label="API"
        className="min-h-5 px-1.5 py-0 text-[10px]"
        description="Activation time is unavailable. A block timestamp is needed to show how long ago this upgrade activated."
      />
    </div>
  );
}

export function HomeNetworkUpgrades({ network }: { network: Network }) {
  const titleId = useId();
  const chain = useQuery(homeChainQueryOptions(network));
  const upgrades = chain.data?.networkUpgrades;

  return (
    <section
      aria-labelledby={titleId}
      className="grid min-w-0 items-center gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-16"
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
        <div className="mt-2 flex items-center gap-3 whitespace-nowrap">
          <p className="flex items-center gap-2 text-[32px] leading-[1.1] font-extrabold tabular-nums">
            {chain.isPending ? (
              "…"
            ) : upgrades == null && !chain.isError ? (
              <MissingApiData
                inline
                label="API"
                description="Deployment count is unavailable until the deployment API is connected."
              />
            ) : (
              metricNumber(upgrades?.length, 0)
            )}{" "}
            <span className="text-base font-medium">Deployments</span>
          </p>
          <MissingApiData
            inline
            label="API"
            className="rounded-full"
            description="The design includes a percentage change, but its comparison period and API value are not defined yet."
          />
        </div>
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
        <section
          className="flex min-w-0 gap-6 overflow-x-auto pb-2"
          aria-label="Deployment data placeholders"
        >
          {[
            "first",
            "second",
            "third",
            "fourth",
            "fifth",
            "sixth",
            "seventh",
          ].map((slot) => (
            <div key={slot} className="w-44 shrink-0 first:w-64">
              <div className="flex flex-col justify-center gap-2 rounded-3xl bg-secondary/75 px-6 py-4">
                <div className="flex h-[16px] items-center gap-2 text-sm leading-[1.1] text-muted-foreground">
                  Type:
                  <MissingApiData
                    inline
                    label="API"
                    className="min-h-4 px-1.5 py-0 text-[10px]"
                    description="Deployment type from Dash Core is not available yet."
                  />
                </div>
                <div className="flex min-h-7 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="text-2xl leading-[1.2] font-extrabold text-accent"
                  >
                    —
                  </span>
                  <MissingApiData
                    inline
                    label="API"
                    description="Deployment name is not available yet. These cards are layout placeholders, not actual upgrades."
                  />
                  <MissingApiData
                    inline
                    label="API"
                    className="rounded-full"
                    description="Deployment activation status is not available yet."
                  />
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="rounded-lg bg-secondary px-2 py-1 text-muted-foreground">
                    Height
                  </span>
                  <MissingApiData
                    inline
                    label="API"
                    className="min-h-5 px-1.5 py-0 text-[10px]"
                    description="Activation block height is not available yet."
                  />
                </div>
              </div>
              <UpgradeTimelineMarker />
            </div>
          ))}
        </section>
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
            className="flex gap-6 overflow-x-auto pb-2"
          >
            {upgrades.map((upgrade) => (
              <li key={upgrade.id} className="shrink-0">
                <div className="flex flex-col justify-center gap-2 rounded-3xl bg-secondary/75 px-6 py-4">
                  <p className="text-sm leading-[1.1] text-muted-foreground">
                    Type: {upgrade.type}
                  </p>
                  <div className="flex items-center gap-2">
                    <h4 className="text-2xl leading-[1.2] font-extrabold text-accent">
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
                  <div className="flex items-center gap-1 text-xs">
                    <span className="rounded-lg bg-secondary px-2 py-1 text-muted-foreground">
                      Height
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
                        <span>
                          #{metricNumber(upgrade.activationHeight, 0)}
                        </span>
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
                <UpgradeTimelineMarker />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
