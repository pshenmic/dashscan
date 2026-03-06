import { useStore } from "@tanstack/react-store";
import { ChevronDown, Circle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { appStore, type Network } from "@/lib/store";

const NETWORKS: { value: Network; label: string }[] = [
  { value: "mainnet", label: "Mainnet" },
  { value: "testnet", label: "Testnet" },
];

export default function NetworkSelector() {
  const network = useStore(appStore, (state) => state.network);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border bg-transparent px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          style={{ borderColor: "rgb(12 28 51 / 0.24)" }}
        >
          <Circle
            className={
              network === "mainnet"
                ? "size-2.5 fill-green-500 text-green-500"
                : "size-2.5 fill-amber-500 text-amber-500"
            }
          />
          {network === "mainnet" ? "Mainnet" : "Testnet"}
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {NETWORKS.map((net) => (
          <DropdownMenuItem
            key={net.value}
            onClick={() =>
              appStore.setState((state) => ({
                ...state,
                network: net.value,
              }))
            }
            className={network === net.value ? "font-medium" : ""}
          >
            <Circle
              className={
                net.value === "mainnet"
                  ? "size-2.5 fill-green-500 text-green-500"
                  : "size-2.5 fill-amber-500 text-amber-500"
              }
            />
            {net.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
