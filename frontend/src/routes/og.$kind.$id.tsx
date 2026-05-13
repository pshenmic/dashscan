import { createFileRoute } from "@tanstack/react-router";
import { addressQueryOptions } from "@/lib/api/addresses";
import { blockQueryOptions } from "@/lib/api/blocks";
import { masternodeQueryOptions } from "@/lib/api/masternodes";
import { transactionQueryOptions } from "@/lib/api/transactions";
import { buildOgSvg, type OgPayload } from "@/lib/og";
import { defaultNetwork } from "@/lib/store";

type OgKind = OgPayload["kind"];

const KINDS: OgKind[] = ["block", "transaction", "address", "masternode"];

function isOgKind(value: string): value is OgKind {
  return (KINDS as string[]).includes(value);
}

export const Route = createFileRoute("/og/$kind/$id")({
  component: OgRoute,
  head: ({ params }) => ({
    meta: [{ title: `OG · ${params.kind}/${params.id}` }],
  }),
  loader: async ({ context, params: { kind, id } }) => {
    if (!isOgKind(kind)) return null;
    const network = defaultNetwork;
    try {
      if (kind === "block") {
        const block = await context.queryClient.fetchQuery(
          blockQueryOptions({ network, hash: id }),
        );
        if (!block) return null;
        return {
          kind,
          height: block.height,
          hash: block.hash,
          txCount: block.txCount,
          timestamp: block.timestamp,
        } satisfies OgPayload;
      }
      if (kind === "transaction") {
        const tx = await context.queryClient.fetchQuery(
          transactionQueryOptions({ network, hash: id }),
        );
        if (!tx) return null;
        return {
          kind,
          hash: tx.hash,
          type: txTypeLabel(tx.type),
        } satisfies OgPayload;
      }
      if (kind === "address") {
        const detail = await context.queryClient.fetchQuery(
          addressQueryOptions({ network, address: id }),
        );
        if (!detail) return null;
        return {
          kind,
          address: detail.address,
          balance: Number(detail.balance) / 1e8,
          txCount: Number(detail.txCount),
        } satisfies OgPayload;
      }
      if (kind === "masternode") {
        const mn = await context.queryClient.fetchQuery(
          masternodeQueryOptions({ network, hash: id }),
        );
        if (!mn) return null;
        return {
          kind,
          proTxHash: mn.proTxHash,
          ip: mn.address?.split(":")[0],
          status: mn.status,
          collateral:
            mn.type?.toLowerCase() === "evo" ||
            mn.type?.toLowerCase() === "highperformance"
              ? 4000
              : 1000,
        } satisfies OgPayload;
      }
    } catch {
      return null;
    }
    return null;
  },
});

function txTypeLabel(type: number | string | undefined): string {
  const n = typeof type === "string" ? Number(type) : type;
  switch (n) {
    case 0:
      return "Standard";
    case 5:
      return "Coinbase";
    case 6:
      return "Quorum";
    case 8:
      return "ProRegTx";
    default:
      return n != null ? `Type ${n}` : "Standard";
  }
}

function OgRoute() {
  const payload = Route.useLoaderData();
  const svg = payload
    ? buildOgSvg(payload)
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630"><rect width="1200" height="630" fill="#0a1426"/><text x="600" y="320" text-anchor="middle" fill="#e9eef7" font-size="36" font-family="Manrope, system-ui">Not found</text></svg>`;
  return (
    <div
      className="h-svh w-svw bg-[#0a1426] [&>svg]:h-full [&>svg]:w-full"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted server-generated SVG
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
