import {
  type Edge,
  Handle,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Link } from "@tanstack/react-router";
import { Coins } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { DashIcon } from "@/components/dash-icon";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiTransaction, ApiVIn, ApiVOut } from "@/lib/api/types";
import { formatDuffs } from "@/lib/format";

type InputNodeData = {
  index: number;
  address: string | null;
  amount: number | null;
  prevTxHash: string | null;
  vOutIndex: number | null;
  isCoinbase: boolean;
};

type OutputNodeData = {
  index: number;
  address: string | null;
  amount: number;
  scriptPubKeyASM: string;
};

type JunctionData = Record<string, never>;

type InputNodeType = Node<InputNodeData, "tx-in">;
type OutputNodeType = Node<OutputNodeData, "tx-out">;
type JunctionNodeType = Node<JunctionData, "junction">;
type FlowNode = InputNodeType | OutputNodeType | JunctionNodeType;

function truncateAddress(value: string, head = 6, tail = 6) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

const InputNode = memo(({ data }: NodeProps<InputNodeType>) => {
  const { index, address, amount, prevTxHash, vOutIndex, isCoinbase } = data;
  return (
    <div className="flex h-full w-full items-center gap-2.5 rounded-md border border-border bg-card px-3 py-2 text-xs shadow-xs">
      <Handle
        type="source"
        position={Position.Right}
        className="!h-1.5 !w-1.5 !min-w-0 !min-h-0 !border-0 !bg-accent"
      />
      <span className="flex size-5 shrink-0 items-center justify-center rounded bg-accent/10 font-mono text-[10px] font-semibold text-accent">
        {index}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        {isCoinbase ? (
          <Badge variant="soft-accent" className="w-fit">
            <Coins className="size-3" /> Coinbase
          </Badge>
        ) : address ? (
          <Link
            to="/address/$address"
            params={{ address }}
            search={{ page: 1, limit: 10 }}
            className="truncate font-mono text-[11px] text-accent hover:underline"
          >
            {truncateAddress(address, 6, 6)}
          </Link>
        ) : (
          <span className="text-[11px] text-muted-foreground">No address</span>
        )}
        {prevTxHash ? (
          <Link
            to="/transactions/$hash"
            params={{ hash: prevTxHash }}
            className="truncate font-mono text-[10px] text-muted-foreground hover:text-accent"
          >
            {prevTxHash.slice(0, 8)}…:{vOutIndex ?? 0}
          </Link>
        ) : null}
      </div>
      <span className="shrink-0 font-mono text-[11px] tabular-nums">
        {amount != null ? formatDuffs(amount) : "—"} <DashIcon />
      </span>
    </div>
  );
});
InputNode.displayName = "InputNode";

const OutputNode = memo(({ data }: NodeProps<OutputNodeType>) => {
  const { index, address, amount, scriptPubKeyASM } = data;
  const isOpReturn = scriptPubKeyASM?.startsWith("OP_RETURN");
  return (
    <div className="flex h-full w-full items-center gap-2.5 rounded-md border border-border bg-card px-3 py-2 text-xs shadow-xs">
      <Handle
        type="target"
        position={Position.Left}
        className="!h-1.5 !w-1.5 !min-w-0 !min-h-0 !border-0 !bg-success"
      />
      <span className="flex size-5 shrink-0 items-center justify-center rounded bg-success/10 font-mono text-[10px] font-semibold text-success">
        {index}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        {isOpReturn ? (
          <Badge variant="outline" className="w-fit text-[10px]">
            OP_RETURN
          </Badge>
        ) : address ? (
          <Link
            to="/address/$address"
            params={{ address }}
            search={{ page: 1, limit: 10 }}
            className="truncate font-mono text-[11px] text-accent hover:underline"
          >
            {truncateAddress(address, 6, 6)}
          </Link>
        ) : (
          <span className="text-[11px] text-muted-foreground">No address</span>
        )}
      </div>
      <span className="shrink-0 font-mono text-[11px] tabular-nums">
        {formatDuffs(amount)} <DashIcon />
      </span>
    </div>
  );
});
OutputNode.displayName = "OutputNode";

const JunctionNode = memo(() => {
  return (
    <div className="relative h-2 w-2">
      <Handle
        type="target"
        position={Position.Left}
        className="!left-1/2 !top-1/2 !h-0 !w-0 !min-w-0 !min-h-0 !-translate-x-1/2 !-translate-y-1/2 !border-0 !bg-transparent"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!left-1/2 !top-1/2 !h-0 !w-0 !min-w-0 !min-h-0 !-translate-x-1/2 !-translate-y-1/2 !border-0 !bg-transparent"
      />
      <div className="absolute inset-0 rounded-full bg-accent" />
    </div>
  );
});
JunctionNode.displayName = "JunctionNode";

const nodeTypes = {
  "tx-in": InputNode,
  "tx-out": OutputNode,
  junction: JunctionNode,
};

const NODE_WIDTH = 320;
const NODE_HEIGHT = 52;
const NODE_GAP = 8;
const COLUMN_GAP = 200;
const JUNCTION_SIZE = 12;
const Y_PADDING = 12;

function buildNodesAndEdges(tx: ApiTransaction): {
  nodes: FlowNode[];
  edges: Edge[];
  height: number;
  width: number;
} {
  const inputs: ApiVIn[] = tx.vIn ?? [];
  const outputs: ApiVOut[] = tx.vOut ?? [];

  const allAmounts = [
    ...inputs.map((v) => Number(v.amount) || 0),
    ...outputs.map((v) => Number(v.value) || 0),
  ];
  const maxAmount = Math.max(1, ...allAmounts);
  const MIN_STROKE = 1;
  const MAX_STROKE = 4.5;
  const MIN_OPACITY = 0.35;
  const MAX_OPACITY = 0.95;
  const weightFor = (amount: number | null | undefined) => {
    const value = Number(amount) || 0;
    const ratio = Math.sqrt(Math.max(0, value) / maxAmount);
    return {
      strokeWidth: MIN_STROKE + (MAX_STROKE - MIN_STROKE) * ratio,
      opacity: MIN_OPACITY + (MAX_OPACITY - MIN_OPACITY) * ratio,
    };
  };

  const inputsHeight =
    inputs.length === 0
      ? NODE_HEIGHT
      : inputs.length * NODE_HEIGHT + (inputs.length - 1) * NODE_GAP;
  const outputsHeight =
    outputs.length === 0
      ? NODE_HEIGHT
      : outputs.length * NODE_HEIGHT + (outputs.length - 1) * NODE_GAP;
  const innerHeight = Math.max(inputsHeight, outputsHeight);
  const totalHeight = innerHeight + Y_PADDING * 2;

  const inputsStartY = Y_PADDING + (innerHeight - inputsHeight) / 2;
  const outputsStartY = Y_PADDING + (innerHeight - outputsHeight) / 2;

  const inputX = 0;
  const outputX = NODE_WIDTH + COLUMN_GAP;
  const totalWidth = outputX + NODE_WIDTH;

  const junctionX = inputX + NODE_WIDTH + (COLUMN_GAP - JUNCTION_SIZE) / 2;
  const junctionY = totalHeight / 2 - JUNCTION_SIZE / 2;

  const nodes: FlowNode[] = [];
  const edges: Edge[] = [];

  inputs.forEach((input, i) => {
    const id = `in-${i}`;
    nodes.push({
      id,
      type: "tx-in",
      position: { x: inputX, y: inputsStartY + i * (NODE_HEIGHT + NODE_GAP) },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      data: {
        index: i,
        address: input.address,
        amount: input.amount,
        prevTxHash: input.prevTxHash,
        vOutIndex: input.vOutIndex,
        isCoinbase: !input.prevTxHash,
      },
    });
    const w = weightFor(input.amount);
    edges.push({
      id: `e-${id}`,
      source: id,
      target: "junction",
      type: "bezier",
      style: { stroke: "#4c7eff", ...w },
    });
  });

  nodes.push({
    id: "junction",
    type: "junction",
    position: { x: junctionX, y: junctionY },
    width: JUNCTION_SIZE,
    height: JUNCTION_SIZE,
    data: {},
    draggable: false,
    selectable: false,
  });

  outputs.forEach((output, i) => {
    const id = `out-${i}`;
    nodes.push({
      id,
      type: "tx-out",
      position: { x: outputX, y: outputsStartY + i * (NODE_HEIGHT + NODE_GAP) },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      data: {
        index: output.number,
        address: output.address,
        amount: output.value,
        scriptPubKeyASM: output.scriptPubKeyASM,
      },
    });
    const w = weightFor(output.value);
    edges.push({
      id: `e-${id}`,
      source: "junction",
      target: id,
      type: "bezier",
      style: { stroke: "#95bf40", ...w },
    });
  });

  return { nodes, edges, height: totalHeight, width: totalWidth };
}

export function TransactionFlow({ tx }: { tx: ApiTransaction }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { nodes, edges, height, width } = buildNodesAndEdges(tx);

  if (!mounted) {
    return <Skeleton className="h-[280px] w-full" />;
  }

  return (
    <div className="overflow-x-auto">
      <div className="relative mx-auto" style={{ width, height }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={1}
          maxZoom={1}
          colorMode="light"
          className="!bg-transparent [&_.react-flow__node]:!pointer-events-auto [&_.react-flow__node]:!shadow-none [&_.react-flow__node]:outline-none [&_.react-flow__node]:focus:outline-none [&_.react-flow__node.selected]:!shadow-none [&_.react-flow__handle]:pointer-events-none"
        />
      </div>
    </div>
  );
}
