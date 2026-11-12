import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useId } from "react";
import {
  marketCapHistoricalQueryOptions,
  marketCapQueryOptions,
} from "@/lib/api/marketcap";
import { formatCompactUsdShort, formatNumber } from "@/lib/format";
import { homeChainQueryOptions } from "@/lib/home";
import { appStore } from "@/lib/store";
import { HomeIcon } from "./home-icon";
import SearchBar from "./search-bar";

export function HomeHero() {
  const titleId = useId();
  const searchDescriptionId = useId();
  const network = useStore(appStore, (state) => state.network);
  const chain = useQuery(homeChainQueryOptions(network));
  const { data: marketCap } = useQuery(
    marketCapQueryOptions({ network, currency: "usd" }),
  );
  const { data: history } = useQuery(
    marketCapHistoricalQueryOptions({ network, currency: "usd" }),
  );
  const first = history?.[0]?.value;
  const last = history?.at(-1)?.value;
  const change =
    first && first > 0 && last !== undefined && history && history.length > 1
      ? ((last - first) / first) * 100
      : undefined;
  const dataAvailable = !!chain.data && !chain.isError;
  const status = chain.isError
    ? "Data unavailable"
    : dataAvailable
      ? "Data available"
      : "Loading data";

  return (
    <section
      aria-labelledby={titleId}
      className="dash-home-hero relative isolate pb-12 pt-16 lg:pb-8 lg:pt-[134px]"
    >
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] xl:gap-32">
        <div>
          <p className="mb-3 text-xl font-medium text-muted-foreground">
            Welcome to #1
          </p>
          <h1 id={titleId} className="dash-heading-page sm:dash-heading-hero">
            <span className="font-extrabold text-brand">Dash</span> Blockchain
            Explorer
          </h1>
          <p className="dash-body mt-6 max-w-xl text-muted-foreground">
            Explore blocks, transactions, masternodes and governance proposals
            on the Dash network.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard"
              className="dash-home-action flex min-h-12 items-center gap-4 rounded-full bg-action-solid py-2 pl-6 pr-2 text-base font-medium text-primary-foreground hover:bg-action-solid focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              View Dashboard
              <span className="flex size-8 items-center justify-center rounded-full bg-primary-foreground text-accent">
                <HomeIcon name="explore" />
              </span>
            </Link>
            <Link
              to="/dao"
              className="dash-home-action dash-home-action-subtle flex min-h-12 items-center rounded-full px-6 text-base font-medium text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              Governance
            </Link>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-8 xl:pr-24">
          <div className="dash-label-small flex flex-wrap items-center gap-2">
            <span
              className={
                dataAvailable
                  ? "inline-flex items-center gap-2 rounded-full bg-positive-brand/12 px-2 py-1 text-success"
                  : "inline-flex items-center gap-2 rounded-full bg-secondary px-2 py-1 text-muted-foreground"
              }
            >
              <span
                aria-hidden="true"
                className={
                  dataAvailable
                    ? "dash-status-dot relative size-2 shrink-0 rounded-full bg-positive-brand"
                    : "size-2 rounded-full bg-current"
                }
              />
              {network === "mainnet" ? "Mainnet" : "Testnet"} · {status}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-card px-2 py-1 shadow-card">
              <span className="text-muted-foreground">
                {network === "testnet"
                  ? "Mainnet Market Cap (USD):"
                  : "Market Cap (USD):"}
              </span>{" "}
              {marketCap?.usd !== undefined && Number.isFinite(marketCap.usd)
                ? formatCompactUsdShort(marketCap.usd)
                : "—"}
              {change !== undefined && Number.isFinite(change) && (
                <span
                  className={change >= 0 ? "text-success" : "text-destructive"}
                >
                  {change > 0 ? "+" : ""}
                  {formatNumber(change, { maximumFractionDigits: 2 })}%
                </span>
              )}
            </span>
          </div>
          <div>
            <h2 className="dash-heading-page">
              Explore <span className="text-muted-foreground">the network</span>
            </h2>
            <p
              id={searchDescriptionId}
              className="dash-body mt-3 text-muted-foreground"
            >
              Blocks, transactions, addresses and masternodes.
            </p>
          </div>
          <SearchBar descriptionId={searchDescriptionId} />
        </div>
      </div>
    </section>
  );
}
