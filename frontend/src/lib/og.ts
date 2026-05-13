type OgPayload =
  | {
      kind: "block";
      height: number;
      hash: string;
      txCount: number;
      timestamp: string | number;
    }
  | {
      kind: "transaction";
      hash: string;
      type?: string;
      amount?: number;
    }
  | {
      kind: "address";
      address: string;
      balance?: number;
      txCount?: number;
    }
  | {
      kind: "masternode";
      proTxHash: string;
      ip?: string;
      status?: string;
      collateral?: number;
    };

const ACCENT: Record<OgPayload["kind"], string> = {
  block: "#1d70e3",
  transaction: "#7c5cff",
  address: "#f4a738",
  masternode: "#2bb6a7",
};

const LABEL: Record<OgPayload["kind"], string> = {
  block: "BLOCK",
  transaction: "TRANSACTION",
  address: "ADDRESS",
  masternode: "MASTERNODE",
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function shortHash(hash: string, head = 12, tail = 8): string {
  if (hash.length <= head + tail + 1) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function buildOgSvg(payload: OgPayload): string {
  const accent = ACCENT[payload.kind];
  const label = LABEL[payload.kind];
  const headline = renderHeadline(payload);
  const subline = renderSubline(payload);
  const stats = renderStats(payload);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="${escapeXml(label)} OG image">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a1426"/>
      <stop offset="100%" stop-color="#162338"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.15" cy="0.2" r="0.6">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="accentLine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#halo)"/>
  <g font-family="Manrope, system-ui, sans-serif" fill="#e9eef7">
    <text x="80" y="120" font-size="22" letter-spacing="6" fill="#8aa0bd">DASHSCAN · ${escapeXml(label)}</text>
    <rect x="80" y="148" width="180" height="3" fill="url(#accentLine)"/>
    <text x="80" y="260" font-size="${headline.fontSize}" font-weight="800" fill="#ffffff">${escapeXml(headline.text)}</text>
    ${
      subline
        ? `<text x="80" y="${headline.fontSize > 70 ? 320 : 310}" font-size="28" fill="#a8bbd9" font-family="ui-monospace, monospace">${escapeXml(subline)}</text>`
        : ""
    }
    ${stats}
    <g transform="translate(80, 540)">
      <text font-size="22" fill="#8aa0bd">dashscan.io</text>
    </g>
    <g transform="translate(1040, 80)" fill="${accent}">
      <circle cx="40" cy="40" r="40" fill="${accent}" opacity="0.15"/>
      <circle cx="40" cy="40" r="26" fill="${accent}" opacity="0.35"/>
      <circle cx="40" cy="40" r="12" fill="${accent}"/>
    </g>
  </g>
</svg>`;
}

function renderHeadline(payload: OgPayload): {
  text: string;
  fontSize: number;
} {
  switch (payload.kind) {
    case "block":
      return { text: `#${formatNumber(payload.height)}`, fontSize: 110 };
    case "transaction":
      return { text: shortHash(payload.hash, 14, 10), fontSize: 64 };
    case "address":
      return { text: shortHash(payload.address, 14, 10), fontSize: 64 };
    case "masternode":
      return {
        text: payload.ip ?? shortHash(payload.proTxHash, 14, 10),
        fontSize: 72,
      };
  }
}

function renderSubline(payload: OgPayload): string | null {
  switch (payload.kind) {
    case "block":
      return shortHash(payload.hash, 16, 10);
    case "transaction":
      return payload.type ? `Type · ${payload.type}` : null;
    case "address":
      return null;
    case "masternode":
      return shortHash(payload.proTxHash, 14, 10);
  }
}

function renderStats(payload: OgPayload): string {
  const stat = (x: number, label: string, value: string) =>
    `<g transform="translate(${x}, 420)">
      <text font-size="20" fill="#8aa0bd" letter-spacing="2">${escapeXml(label.toUpperCase())}</text>
      <text y="44" font-size="40" font-weight="700" fill="#ffffff" font-family="ui-monospace, monospace">${escapeXml(value)}</text>
    </g>`;

  switch (payload.kind) {
    case "block": {
      const date = new Date(payload.timestamp);
      const ts = Number.isFinite(date.getTime())
        ? date.toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "—";
      return [
        stat(80, "Transactions", formatNumber(payload.txCount)),
        stat(480, "Timestamp", ts),
      ].join("");
    }
    case "transaction": {
      const amount =
        payload.amount != null ? `${payload.amount.toFixed(4)} DASH` : "—";
      return stat(80, "Amount", amount);
    }
    case "address": {
      const balance =
        payload.balance != null ? `${payload.balance.toFixed(4)} DASH` : "—";
      const tx = payload.txCount != null ? formatNumber(payload.txCount) : "—";
      return [stat(80, "Balance", balance), stat(480, "Transactions", tx)].join(
        "",
      );
    }
    case "masternode": {
      const collat =
        payload.collateral != null
          ? `${formatNumber(payload.collateral)} DASH`
          : "—";
      const status = payload.status ?? "—";
      return [stat(80, "Status", status), stat(480, "Collateral", collat)].join(
        "",
      );
    }
  }
}

export type { OgPayload };
