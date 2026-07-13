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
  allPeersQueryOptions,
  type PeerGeoPoint,
  peersToGeoPoints,
} from "@/lib/api/peers";
import { appStore } from "@/lib/store";
import {
  countryFlagEmoji,
  countryName,
} from "@/themes/neo/components/masternode-map/iso-codes";
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
import { PeersMapCanvas } from "./map-canvas";

type MapStatusFilter = "all" | "available" | "unavailable";

const EMPTY_POINTS: PeerGeoPoint[] = [];

export function PeersMap({
  variant = "dashboard",
  selectedCountry: controlledCountry,
  onSelectCountry: controlledOnSelect,
}: {
  variant?: "dashboard" | "page";
  selectedCountry?: string | null;
  onSelectCountry?: (code: string | null) => void;
}) {
  const network = useStore(appStore, (state) => state.network);
  const { data, isLoading } = useQuery({
    ...allPeersQueryOptions({ network }),
    select: peersToGeoPoints,
  });
  const [internalCountry, setInternalCountry] = useState<string | null>(null);
  const [clusterLeaves, setClusterLeaves] = useState<PeerGeoPoint[] | null>(
    null,
  );
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

  const allPoints = data ?? EMPTY_POINTS;
  const statusFilteredPoints = useMemo(() => {
    if (statusFilter === "available")
      return allPoints.filter((p) => p.available);
    if (statusFilter === "unavailable")
      return allPoints.filter((p) => !p.available);
    return allPoints;
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
    return { cities };
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
          <MapPin className="size-3.5" /> Network Peers Map
        </CardDescription>
        {!isPage && (
          <CardAction>
            <Button asChild variant="ghost" size="sm" className="h-8">
              <Link to="/peers" search={{ page: 1, limit: 10 }}>
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
                      {clusterLeaves.length === 1 ? "peer" : "peers"}
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
                        {total} {total === 1 ? "peer" : "peers"}
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
                    <span>{total} peers</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      across {countries}{" "}
                      {countries === 1 ? "country" : "countries"}
                    </span>
                  </>
                )}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <ToggleGroup
                  type="single"
                  value={statusFilter}
                  onValueChange={handleStatusFilterChange}
                  variant="outline"
                  size="sm"
                >
                  <ToggleGroupItem value="all" aria-label="All peers">
                    <Globe className="size-3" />
                    All
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="available"
                    aria-label="Available peers"
                    className="data-[state=on]:bg-success/15 data-[state=on]:text-success data-[state=on]:border-success/40"
                  >
                    <CircleCheck className="size-3" />
                    Available
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="unavailable"
                    aria-label="Unavailable peers"
                    className="data-[state=on]:bg-destructive/15 data-[state=on]:text-destructive data-[state=on]:border-destructive/40"
                  >
                    <ServerCrash className="size-3" />
                    Unavailable
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="w-full rounded-2xl" style={{ height }} />
            ) : (
              <PeersMapCanvas
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
          GeoIP data is derived from the [
          <a href={"https://db-ip.com/db/download/ip-to-city-lite"}>
            IP to City Lite database by DB-IP
          </a>
          ], licensed under [
          <a href={"https://creativecommons.org/licenses/by/4.0/"}>CC BY 4.0</a>
          ].
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
