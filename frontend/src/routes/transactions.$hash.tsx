import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { ArrowLeftRight, Info } from "lucide-react";
import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { transactionQueryOptions } from "@/lib/api/transactions";
import { getTxTypeBadgeStyle, getTxTypeLabel } from "@/lib/format";
import { appStore } from "@/lib/store";

export const Route = createFileRoute("/transactions/$hash")({
  component: TransactionDetailPage,
  head: ({ params }) => ({
    meta: [{ title: `TX ${params.hash.slice(0, 12)}... | DashScan` }],
  }),
  loader: async ({ context, params: { hash } }) => {
    if (typeof window !== "undefined") return;
    await context.queryClient.prefetchQuery(
      transactionQueryOptions({ network: "mainnet", hash }),
    );
  },
});

type Tab = "io" | "raw";

function TransactionDetailPage() {
  const { hash } = Route.useParams();
  const network = useStore(appStore, (state) => state.network);
  const [activeTab, setActiveTab] = useState<Tab>("io");

  const { data: tx, isFetching } = useQuery(
    transactionQueryOptions({ network, hash }),
  );

  if (isFetching && !tx) {
    return (
      <main className="mx-auto max-w-[1440px] px-6 py-10">
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Loading transaction...
        </div>
      </main>
    );
  }

  if (!tx) {
    return (
      <main className="mx-auto max-w-[1440px] px-6 py-10">
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Transaction not found.
        </div>
      </main>
    );
  }

  const totalOutput = tx.vOut.reduce((sum, out) => sum + Number(out.value), 0);

  return (
    <main className="mx-auto max-w-[1440px] overflow-hidden px-6 py-10">
      <h1 className="mb-8 text-4xl tracking-tight animate-fade-in-up">
        Transaction Details
      </h1>

      <Card
        className="mb-8 px-6 py-4 animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        <div className="flex flex-col divide-y divide-border">
          <DetailRow label="Hash">
            <div className="flex items-center gap-1.5">
              <span className="break-all font-mono text-xs font-semibold">
                {tx.hash}
              </span>
              <CopyButton value={tx.hash} />
            </div>
          </DetailRow>
          <DetailRow label="Block Height">
            <div className="flex items-center gap-1.5">
              <Link
                to="/blocks/$hashOrHeight"
                params={{ hashOrHeight: String(tx.blockHeight) }}
                className="font-semibold text-accent hover:underline"
              >
                {tx.blockHeight}
              </Link>
              <span className="text-muted-foreground">
                :{tx.type} ({tx.confirmations} confirmations)
              </span>
            </div>
          </DetailRow>
          <DetailRow label="Date/Time">
            <span className="font-semibold">
              {new Date(tx.timestamp).toLocaleString()}
            </span>
          </DetailRow>
          <DetailRow label="Type">
            <Badge
              className={`h-6 whitespace-nowrap border font-medium ${getTxTypeBadgeStyle(tx.type)}`}
            >
              {getTxTypeLabel(tx.type)}
            </Badge>
          </DetailRow>
          <DetailRow label="Total Output">
            <span className="font-semibold">
              {(totalOutput / 100_000_000).toFixed(8)} DASH
            </span>
          </DetailRow>
          <DetailRow label="Fees">
            <span className="font-semibold text-muted-foreground">—</span>
          </DetailRow>
        </div>
      </Card>

      <div
        className="mb-6 flex gap-3 animate-fade-in-up"
        style={{ animationDelay: "200ms" }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("io")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
            activeTab === "io"
              ? "bg-accent text-white"
              : "border border-border text-foreground hover:bg-accent/10"
          }`}
        >
          Inputs / Outputs
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("raw")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
            activeTab === "raw"
              ? "bg-accent text-white"
              : "border border-border text-foreground hover:bg-accent/10"
          }`}
        >
          Raw Transaction
        </button>
      </div>

      {activeTab === "io" ? (
        <div
          className="flex flex-col gap-8 animate-fade-in-up"
          style={{ animationDelay: "300ms" }}
        >
          <div>
            <h2 className="mb-4 text-2xl font-semibold">Inputs</h2>
            <table
              className="w-full text-xs"
              style={{ borderCollapse: "separate", borderSpacing: "0 6px" }}
            >
              <thead>
                <tr>
                  <th className="px-3 pb-2 text-left font-medium text-foreground">
                    Index
                  </th>
                  <th className="px-3 pb-2 text-left font-medium text-foreground">
                    Previous Output
                  </th>
                  <th className="px-3 pb-2 text-left font-medium text-foreground">
                    Sequence
                  </th>
                </tr>
              </thead>
              <tbody>
                {tx.vIn.length > 0 ? (
                  tx.vIn.map((input, idx) => (
                    <tr
                      key={`${input.txId}-${input.vOut}`}
                      className="group transition-colors"
                    >
                      <td className="rounded-l-xl border-y border-l border-border bg-secondary/50 px-3 py-2 transition-colors group-hover:bg-accent/10">
                        <div className="flex items-center gap-2">
                          <ArrowLeftRight className="size-4 text-muted-foreground" />
                          <span>{idx}</span>
                        </div>
                      </td>
                      <td className="border-y border-border bg-secondary/50 px-3 py-2 transition-colors group-hover:bg-accent/10">
                        <Link
                          to="/transactions/$hash"
                          params={{ hash: input.txId }}
                          className="font-mono text-accent hover:underline"
                        >
                          {input.txId.slice(0, 16)}...:{input.vOut}
                        </Link>
                      </td>
                      <td className="rounded-r-xl border-y border-r border-border bg-secondary/50 px-3 py-2 text-muted-foreground transition-colors group-hover:bg-accent/10">
                        {input.sequence}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-10 text-center text-muted-foreground"
                    >
                      No inputs (coinbase transaction).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="mb-4 text-2xl font-semibold">Outputs</h2>
            <table
              className="w-full text-xs"
              style={{ borderCollapse: "separate", borderSpacing: "0 6px" }}
            >
              <thead>
                <tr>
                  <th className="px-3 pb-2 text-left font-medium text-foreground">
                    Index
                  </th>
                  <th className="px-3 pb-2 text-left font-medium text-foreground">
                    Script
                  </th>
                  <th className="px-3 pb-2 text-right font-medium text-foreground">
                    Amount (DASH)
                  </th>
                </tr>
              </thead>
              <tbody>
                {tx.vOut.length > 0 ? (
                  tx.vOut.map((output) => (
                    <tr key={output.number} className="group transition-colors">
                      <td className="rounded-l-xl border-y border-l border-border bg-secondary/50 px-3 py-2 transition-colors group-hover:bg-accent/10">
                        <div className="flex items-center gap-2">
                          <ArrowLeftRight className="size-4 text-muted-foreground" />
                          <span>{output.number}</span>
                        </div>
                      </td>
                      <td className="max-w-md truncate border-y border-border bg-secondary/50 px-3 py-2 font-mono text-muted-foreground transition-colors group-hover:bg-accent/10">
                        {output.scriptPubKeyASM}
                      </td>
                      <td className="rounded-r-xl border-y border-r border-border bg-secondary/50 px-3 py-2 text-right font-semibold transition-colors group-hover:bg-accent/10">
                        {(Number(output.value) / 100_000_000).toFixed(8)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-10 text-center text-muted-foreground"
                    >
                      No outputs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          className="relative animate-fade-in-up"
          style={{ animationDelay: "300ms" }}
        >
          <div className="absolute top-3 right-3">
            <CopyButton value={JSON.stringify(tx, null, 2)} />
          </div>
          <pre
            className="overflow-x-auto rounded-xl border border-border bg-secondary/50 p-6 pr-12 font-mono text-sm leading-relaxed"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: escaped JSON only
            dangerouslySetInnerHTML={{ __html: highlightJson(tx) }}
          />
        </div>
      )}
    </main>
  );
}

function highlightJson(obj: unknown): string {
  const raw = JSON.stringify(obj, null, 2);
  const escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(
    /("(?:\\.|[^"\\])*")\s*(:)?|(\b(?:true|false|null)\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match, str, colon, bool, num) => {
      if (str && colon)
        return `<span class="text-foreground">${str}</span>:`;
      if (str) return `<span class="text-emerald-600">${str}</span>`;
      if (bool) return `<span class="text-accent">${match}</span>`;
      if (num) return `<span class="text-accent">${match}</span>`;
      return match;
    },
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 py-3">
      <Info className="size-4 shrink-0 text-muted-foreground" />
      <span className="w-28 shrink-0 text-sm text-muted-foreground">
        {label}
      </span>
      <div className="flex min-w-0 items-center text-sm">{children}</div>
    </div>
  );
}
