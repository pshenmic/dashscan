import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  ArrowRight,
  CircleCheck,
  Globe,
  MapPin,
  ServerCrash,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  allMasternodesGeoQueryOptions,
  type MasternodeGeoPoint,
} from "@/lib/api/masternodes";
import { appStore } from "@/lib/store";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/themes/neo/components/ui/card";
import { ClusterList } from "./cluster-list";
import { CountryLegend } from "./country-legend";
import { countryFlagEmoji, countryName } from "./iso-codes";
import { MasternodeMapCanvas } from "./map-canvas";

type MapStatusFilter = "all" | "enabled" | "disabled";

export { CountryLegend } from "./country-legend";
export { MasternodeMapCanvas } from "./map-canvas";

export function MasternodeMap({
  variant = "dashboard",
  selectedCountry: controlledCountry,
  onSelectCountry: controlledOnSelect,
}: {
  variant?: "dashboard" | "page";
  selectedCountry?: string | null;
  onSelectCountry?: (code: string | null) => void;
}) {
  const network = useStore(appStore, (state) => state.network);
  const { data, isLoading } = useQuery(
    allMasternodesGeoQueryOptions({ network }),
  );
  const [internalCountry, setInternalCountry] = useState<string | null>(null);
  const [clusterLeaves, setClusterLeaves] = useState<
    MasternodeGeoPoint[] | null
  >(null);
  const [statusFilter, setStatusFilter] = useState<MapStatusFilter>("all");
  const isControlled = controlledCountry !== undefined;
  const selectedCountry = isControlled ? controlledCountry : internalCountry;
  const setSelectedCountry = useCallback(
    (code: string | null) => {
      setClusterLeaves(null);
      if (isControlled) controlledOnSelect?.(code);
      else setInternalCountry(code);
    },
    [isControlled, controlledOnSelect],
  );

  const allPoints = data ?? [];
  const statusFilteredPoints = useMemo(() => {
    if (statusFilter === "all") return allPoints;
    if (statusFilter === "enabled")
      return allPoints.filter((p) => p.status.toUpperCase() === "ENABLED");
    return allPoints.filter((p) => p.status.toUpperCase() !== "ENABLED");
  }, [allPoints, statusFilter]);
  const points = useMemo(() => {
    if (!selectedCountry) return statusFilteredPoints;
    return statusFilteredPoints.filter(
      (p) => p.countryCode === selectedCountry,
    );
  }, [statusFilteredPoints, selectedCountry]);
  const total = points.length;
  const countries = useMemo(
    () => new Set(points.map((p) => p.countryCode)).size,
    [points],
  );
  const countrySubset = useMemo(() => {
    if (!selectedCountry) return null;
    const cities = new Set(points.map((p) => p.city).filter(Boolean)).size;
    return { count: points.length, cities };
  }, [points, selectedCountry]);

  const handleStatusFilterChange = useCallback((value: string) => {
    if (!value) return;
    setClusterLeaves(null);
    setStatusFilter(value as MapStatusFilter);
  }, []);

  const isPage = variant === "page";
  const height = isPage ? 540 : 420;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <MapPin className="size-3.5" /> Masternode Network Map
        </CardDescription>
        {!isPage && (
          <CardAction>
            <Button asChild variant="ghost" size="sm" className="h-8">
              <Link to="/masternodes" search={{ page: 1, limit: 25 }}>
                Browse <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="flex flex-col gap-3 lg:col-span-9">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-2xl tabular-nums text-accent">
                {isLoading ? (
                  <Skeleton className="h-7 w-24" />
                ) : clusterLeaves ? (
                  <>
                    <span>
                      {clusterLeaves.length}{" "}
                      {clusterLeaves.length === 1 ? "node" : "nodes"}
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">
                      in selected cluster
                    </span>
                    <ClearPill onClick={() => setClusterLeaves(null)} />
                  </>
                ) : selectedCountry && countrySubset ? (
                  <>
                    <span className="flex items-baseline gap-2">
                      <span className="text-xl leading-none" aria-hidden="true">
                        {countryFlagEmoji(selectedCountry)}
                      </span>
                      <span>
                        {countrySubset.count}{" "}
                        {countrySubset.count === 1 ? "node" : "nodes"}
                      </span>
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">
                      in {countryName(selectedCountry)}
                      {countrySubset.cities > 0 &&
                        ` · ${countrySubset.cities} ${countrySubset.cities === 1 ? "city" : "cities"}`}
                    </span>
                    <ClearPill onClick={() => setSelectedCountry(null)} />
                  </>
                ) : (
                  <>
                    <span>{total} nodes</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      across {countries}{" "}
                      {countries === 1 ? "country" : "countries"}
                    </span>
                  </>
                )}
              </CardTitle>
              <ToggleGroup
                type="single"
                value={statusFilter}
                onValueChange={handleStatusFilterChange}
                variant="outline"
                size="sm"
              >
                <ToggleGroupItem value="all" aria-label="All masternodes">
                  <Globe className="size-3" />
                  All
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="enabled"
                  aria-label="Enabled masternodes"
                  className="data-[state=on]:bg-success/15 data-[state=on]:text-success data-[state=on]:border-success/40"
                >
                  <CircleCheck className="size-3" />
                  Enabled
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="disabled"
                  aria-label="Disabled masternodes"
                  className="data-[state=on]:bg-destructive/15 data-[state=on]:text-destructive data-[state=on]:border-destructive/40"
                >
                  <ServerCrash className="size-3" />
                  Disabled
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            {isLoading ? (
              <Skeleton className="w-full rounded-2xl" style={{ height }} />
            ) : (
              <MasternodeMapCanvas
                points={points}
                highlightedCountry={selectedCountry}
                onSelectCountry={setSelectedCountry}
                onSelectCluster={setClusterLeaves}
                height={height}
              />
            )}
          </div>
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : clusterLeaves ? (
              <ClusterList leaves={clusterLeaves} maxHeight={height} />
            ) : (
              <CountryLegend
                points={statusFilteredPoints}
                total={statusFilteredPoints.length}
                selected={selectedCountry}
                onSelect={setSelectedCountry}
              />
            )}
          </div>
        </div>
        <span className="text-muted-foreground text-sm" aria-hidden="true">
          GeoIP data is derived from the [<a href={'https://db-ip.com/db/download/ip-to-city-lite'}>IP to City Lite database by DB-IP</a>], licensed under [<a href={'https://creativecommons.org/licenses/by/4.0/'}>CC BY 4.0</a>].
        </span>
      </CardContent>
    </Card>
  );
}

function ClearPill({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <X className="size-3" />
      Clear
    </button>
  );
}
