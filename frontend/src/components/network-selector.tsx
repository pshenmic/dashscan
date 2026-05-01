import { useStore } from "@tanstack/react-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { appStore, type Network } from "@/lib/store";
import { cn } from "@/lib/utils";

const NETWORKS: { value: Network; label: string; url: string }[] = [
  { value: "mainnet", label: "Mainnet", url: "https://dashscan.io/" },
  {
    value: "testnet",
    label: "Testnet",
    url: "https://testnet.dashscan.io/",
  },
];

interface NetworkSelectorProps {
  className?: string;
}

export default function NetworkSelector({ className }: NetworkSelectorProps) {
  const network = useStore(appStore, (state) => state.network);

  return (
    <Select
      value={network}
      onValueChange={(value: Network) => {
        const target = NETWORKS.find((n) => n.value === value);
        if (target && value !== network) {
          window.location.href = target.url;
        }
      }}
    >
      <SelectTrigger className={cn("h-9 w-[140px]", className)}>
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "size-2 rounded-full",
              network === "mainnet" ? "bg-success" : "bg-accent",
            )}
          />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent align="end">
        {NETWORKS.map((net) => (
          <SelectItem key={net.value} value={net.value}>
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full",
                  net.value === "mainnet" ? "bg-success" : "bg-accent",
                )}
              />
              {net.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
