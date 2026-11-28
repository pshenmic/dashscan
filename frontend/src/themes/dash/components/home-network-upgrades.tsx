import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useId } from "react";
import { type ApiDeployment, deploymentsQueryOptions } from "@/lib/api/chain";
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

const statusOrder: Record<string, number> = {
  defined: 0,
  inactive: 1,
  started: 2,
  locked_in: 3,
  failed: 5,
};

const statusDescriptions: Record<string, string> = {
  active: "The rules are enforced by the connected Dash Core node.",
  defined:
    "Defined in Dash Core, but activation has not started. EHF upgrades may be waiting for a masternode quorum signal.",
  started: "Miner signaling is in progress. Activation is not yet locked in.",
  locked_in: "Activation is locked in, but the rules are not yet active.",
  failed: "The deployment did not activate within its activation conditions.",
};

function compareDeployments(first: ApiDeployment, second: ApiDeployment) {
  const firstOrder = first.active ? 4 : (statusOrder[first.status ?? ""] ?? 1);
  const secondOrder = second.active
    ? 4
    : (statusOrder[second.status ?? ""] ?? 1);
  const firstHeight = first.active ? first.height : first.since;
  const secondHeight = second.active ? second.height : second.since;
  return (
    firstOrder - secondOrder ||
    (secondHeight ?? -1) - (firstHeight ?? -1) ||
    first.id.localeCompare(second.id, "en")
  );
}

function UpgradeTimelineMarker({ upgrade }: { upgrade: ApiDeployment }) {
  return (
    <div
      className={`relative mt-3 flex flex-col items-center gap-1 before:absolute before:top-[3px] before:-left-3 before:-right-3 before:border-t-2 group-first:before:left-0 group-last:before:right-0 ${upgrade.active ? "before:border-accent" : "before:border-dashed before:border-accent/40"}`}
    >
      <span
        aria-hidden="true"
        className={`relative size-2 rounded-full ${upgrade.active ? "bg-accent shadow-[0_0_12px_var(--accent)]" : "bg-surface-subtle ring-2 ring-accent"}`}
      />
      <span className="text-xs text-muted-foreground">
        {upgrade.active
          ? "Activated"
          : upgrade.status === "failed"
            ? "Failed"
            : "Not activated"}
      </span>
    </div>
  );
}

function UpgradeCard({
  upgrade,
  chainHeight,
}: {
  upgrade: ApiDeployment;
  chainHeight: number;
}) {
  const status = upgrade.active ? "active" : (upgrade.status ?? "inactive");
  const activationHeight =
    upgrade.height != null &&
    Number.isSafeInteger(upgrade.height) &&
    upgrade.height >= 0
      ? upgrade.height
      : null;
  const since =
    upgrade.since != null &&
    Number.isSafeInteger(upgrade.since) &&
    upgrade.since > 0
      ? upgrade.since
      : null;
  const height = activationHeight ?? since;
  const heightLabel =
    activationHeight == null && since != null ? "Since" : "Activation";
  const heightDescription =
    heightLabel === "Since"
      ? "Height of the first block with this status, not the activation height."
      : activationHeight == null
        ? upgrade.active || status === "failed"
          ? "No activation height has been reported."
          : "Activation height has not been determined."
        : "Height at which the deployment rules take effect, not the start of signaling.";

  return (
    <div className="flex flex-col justify-center gap-2 rounded-3xl bg-surface-subtle px-6 py-4 inset-ring inset-ring-border">
      <p className="text-sm leading-[1.1] text-muted-foreground">
        Type: {upgrade.type}
      </p>
      <div className="flex items-center gap-2">
        <h4 className="text-2xl leading-[1.2] font-extrabold text-accent">
          <InfoPopover label={`About ${upgrade.id}`} trigger={upgrade.id}>
            {statusDescriptions[status] ??
              "Not active according to the connected Dash Core node."}
          </InfoPopover>
        </h4>
        <span
          className={`whitespace-nowrap rounded-full px-2 py-1 text-xs ${upgrade.active ? "bg-positive-brand/12 text-success" : status === "failed" ? "bg-destructive/12 text-destructive" : status === "started" || status === "locked_in" ? "bg-action-subtle text-accent" : "bg-secondary text-muted-foreground"}`}
        >
          {Object.hasOwn(statusLabels, status)
            ? statusLabels[status]
            : "Not active"}
        </span>
      </div>
      <div className="flex items-center gap-1 whitespace-nowrap text-xs">
        <span className="rounded-lg bg-secondary px-2 py-1 text-muted-foreground">
          <InfoPopover
            label={`About ${heightLabel.toLowerCase()} height for ${upgrade.id}`}
            trigger={heightLabel}
          >
            {heightDescription}
          </InfoPopover>
        </span>
        {height == null ? (
          <span className="text-muted-foreground">
            {upgrade.active || status === "failed" ? "Unavailable" : "Not set"}
          </span>
        ) : height <= chainHeight ? (
          <Link
            to="/blocks/$hashOrHeight"
            params={{ hashOrHeight: String(height) }}
            aria-label={`${upgrade.id}: ${heightLabel.toLowerCase()} block ${metricNumber(height, 0)}`}
            className="rounded-md px-1 py-0.5 text-accent transition-colors duration-150 hover:bg-action-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            #{metricNumber(height, 0)}
          </Link>
        ) : (
          <span>#{metricNumber(height, 0)}</span>
        )}
      </div>
    </div>
  );
}

export function HomeNetworkUpgrades({ network }: { network: Network }) {
  const titleId = useId();
  const chain = useQuery(deploymentsQueryOptions({ network }));
  const upgrades =
    chain.data == null
      ? undefined
      : [...chain.data.deployments].sort(compareDeployments);

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
              complete release history. Defined upgrades appear before
              signaling, locked-in upgrades and activation history. This order
              does not predict activation dates. Activation is the height where
              rules take effect; Since is the height where the current status
              began.
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
              <li key={upgrade.id} className="group shrink-0">
                <UpgradeCard
                  upgrade={upgrade}
                  chainHeight={chain.data?.height ?? -1}
                />
                <UpgradeTimelineMarker upgrade={upgrade} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
