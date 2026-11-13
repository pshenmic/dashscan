import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useId } from "react";
import { deploymentsQueryOptions } from "@/lib/api/chain";
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

function UpgradeTimelineMarker({ active }: { active: boolean }) {
  return (
    <div className="relative mt-3 flex flex-col items-center gap-1 before:absolute before:top-[3px] before:-left-3 before:-right-3 before:h-0.5 before:bg-accent/15">
      <span
        aria-hidden="true"
        className="relative size-2 rounded-full bg-accent shadow-[0_0_12px_var(--accent)]"
      />
      <span className="text-xs text-muted-foreground">
        {active ? "Activated" : "Pending"}
      </span>
    </div>
  );
}

export function HomeNetworkUpgrades({ network }: { network: Network }) {
  const titleId = useId();
  const chain = useQuery(deploymentsQueryOptions({ network }));
  const upgrades =
    chain.data == null
      ? undefined
      : [...chain.data.deployments].sort(
          (first, second) =>
            (first.height ?? Infinity) - (second.height ?? Infinity),
        );

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
                label="Unavailable"
                inline
                description="Deployment count is unavailable until the deployment API is connected."
              />
            ) : (
              metricNumber(upgrades?.length, 0)
            )}{" "}
            <span className="text-base font-medium">Deployments</span>
          </p>
          {upgrades != null && (
            <span className="rounded-full bg-positive-brand/12 px-2 py-1 text-xs text-success">
              {metricNumber(
                upgrades.filter((upgrade) => upgrade.active).length,
                0,
              )}{" "}
              active
            </span>
          )}
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
        <MissingApiData
          label="Unavailable"
          description="This backend does not expose Dash Core deployments yet."
        />
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
                <div className="flex flex-col justify-center gap-2 rounded-3xl bg-surface-subtle px-6 py-4 inset-ring inset-ring-border">
                  <p className="text-sm leading-[1.1] text-muted-foreground">
                    Type: {upgrade.type}
                  </p>
                  <div className="flex items-center gap-2">
                    <h4 className="text-2xl leading-[1.2] font-extrabold text-accent">
                      {upgrade.id}
                    </h4>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${upgrade.active ? "bg-positive-brand/12 text-success" : upgrade.status === "failed" ? "bg-destructive/12 text-destructive" : "bg-secondary text-muted-foreground"}`}
                    >
                      {upgrade.active
                        ? "Active"
                        : upgrade.status != null &&
                            Object.hasOwn(statusLabels, upgrade.status)
                          ? statusLabels[upgrade.status]
                          : "Inactive"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="rounded-lg bg-secondary px-2 py-1 text-muted-foreground">
                      Height
                    </span>
                    {upgrade.height != null &&
                    Number.isSafeInteger(upgrade.height) &&
                    upgrade.height >= 0 ? (
                      chain.data != null &&
                      upgrade.height <= chain.data.height ? (
                        <Link
                          to="/blocks/$hashOrHeight"
                          params={{
                            hashOrHeight: String(upgrade.height),
                          }}
                          className="rounded text-accent hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          #{metricNumber(upgrade.height, 0)}
                        </Link>
                      ) : (
                        <span>#{metricNumber(upgrade.height, 0)}</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
                <UpgradeTimelineMarker active={upgrade.active} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
