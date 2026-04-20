import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { AddressLink } from "@/components/address-link";
import { CopyButton } from "@/components/copy-button";
import { DetailRow } from "@/components/detail-row";
import { PageStatus } from "@/components/page-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { transactionQueryOptions } from "@/lib/api/transactions";
import {
  formatDuffs,
  getTxTypeBadgeStyle,
  getTxTypeLabel,
  highlightJson,
  sumVOut,
} from "@/lib/format";
import { appStore, defaultNetwork } from "@/lib/store";

export const Route = createFileRoute("/transactions/$hash")({
  component: TransactionDetailPage,
  head: ({ params }) => ({
    meta: [{ title: `TX ${params.hash.slice(0, 12)}... | DashScan` }],
  }),
  loader: async ({ context, params: { hash } }) => {
    if (typeof window !== "undefined") return;
    await context.queryClient.prefetchQuery(
      transactionQueryOptions({ network: defaultNetwork, hash }),
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
    return <PageStatus message="Loading transaction..." />;
  }

  if (!tx) {
    return <PageStatus message="Transaction not found." />;
  }

  const totalOutput = sumVOut(tx.vOut);

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
          <DetailRow variant="labeled" label="Hash">
            <div className="flex items-center gap-1.5">
              <span className="break-all font-mono text-xs font-semibold">
                {tx.hash}
              </span>
              <CopyButton value={tx.hash} />
            </div>
          </DetailRow>
          <DetailRow variant="labeled" label="Block Height">
            <div className="flex items-center gap-1.5">
              <Link
                to="/blocks/$hashOrHeight"
                params={{ hashOrHeight: String(tx.blockHeight) }}
                className="font-semibold text-accent hover:underline"
              >
                {tx.blockHeight}
              </Link>
              <span className="text-muted-foreground">
                ({tx.confirmations} confirmations)
              </span>
            </div>
          </DetailRow>
          <DetailRow variant="labeled" label="Date/Time">
            <span className="font-semibold">
              {new Date(tx.timestamp).toLocaleString()}
            </span>
          </DetailRow>
          <DetailRow variant="labeled" label="Type">
            <Badge
              className={`h-6 whitespace-nowrap border font-medium ${getTxTypeBadgeStyle(tx.type)}`}
            >
              {getTxTypeLabel(tx.type)}
            </Badge>
          </DetailRow>
          <DetailRow variant="labeled" label="Total Output">
            <span className="font-semibold">
              {formatDuffs(totalOutput)} DASH
            </span>
          </DetailRow>
          <DetailRow variant="labeled" label="Fees">
            <span className="font-semibold text-muted-foreground">—</span>
          </DetailRow>
        </div>
      </Card>

      <div
        className="mb-6 flex gap-3 animate-fade-in-up"
        style={{ animationDelay: "200ms" }}
      >
        <Button
          variant={activeTab === "io" ? "default" : "outline"}
          size="sm"
          className={`rounded-full px-5 ${activeTab === "io" ? "bg-accent text-accent-foreground" : ""}`}
          onClick={() => setActiveTab("io")}
        >
          Inputs / Outputs
        </Button>
        <Button
          variant={activeTab === "raw" ? "default" : "outline"}
          size="sm"
          className={`rounded-full px-5 ${activeTab === "raw" ? "bg-accent text-accent-foreground" : ""}`}
          onClick={() => setActiveTab("raw")}
        >
          Raw Transaction
        </Button>
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
                    Address
                  </th>
                  <th className="px-3 pb-2 text-left font-medium text-foreground">
                    Previous Output
                  </th>
                  <th className="px-3 pb-2 text-right font-medium text-foreground">
                    Amount (DASH)
                  </th>
                </tr>
              </thead>
              <tbody>
                {tx.vIn.length > 0 ? (
                  tx.vIn.map((input, idx) => {
                    const { prevTxHash } = input;
                    return (
                      <tr
                        key={`${prevTxHash ?? "coinbase"}-${input.vOutIndex ?? idx}`}
                        className="group transition-colors"
                      >
                        <td className="rounded-l-xl border-y border-l border-border bg-secondary/50 px-3 py-2 transition-colors group-hover:bg-accent/10">
                          <div className="flex items-center gap-2">
                            <ArrowLeftRight className="size-4 text-muted-foreground" />
                            <span>{idx}</span>
                          </div>
                        </td>
                        <td className="border-y border-border bg-secondary/50 px-3 py-2 transition-colors group-hover:bg-accent/10">
                          <AddressLink address={input.address} />
                        </td>
                        <td className="border-y border-border bg-secondary/50 px-3 py-2 transition-colors group-hover:bg-accent/10">
                          {prevTxHash ? (
                            <Link
                              to="/transactions/$hash"
                              params={{ hash: prevTxHash }}
                              className="font-mono text-accent hover:underline"
                            >
                              {prevTxHash.slice(0, 16)}...:
                              {input.vOutIndex ?? 0}
                            </Link>
                          ) : (
                            <span className="font-mono text-muted-foreground">
                              Coinbase
                            </span>
                          )}
                        </td>
                        <td className="rounded-r-xl border-y border-r border-border bg-secondary/50 px-3 py-2 text-right font-semibold transition-colors group-hover:bg-accent/10">
                          {input.amount != null
                            ? formatDuffs(input.amount)
                            : "—"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={4}
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
                    Address
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
                      <td className="border-y border-border bg-secondary/50 px-3 py-2 transition-colors group-hover:bg-accent/10">
                        <AddressLink address={output.address} />
                      </td>
                      <td className="max-w-md truncate border-y border-border bg-secondary/50 px-3 py-2 font-mono text-muted-foreground transition-colors group-hover:bg-accent/10">
                        {output.scriptPubKeyASM}
                      </td>
                      <td className="rounded-r-xl border-y border-r border-border bg-secondary/50 px-3 py-2 text-right font-semibold transition-colors group-hover:bg-accent/10">
                        {formatDuffs(output.value ?? 0)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
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
