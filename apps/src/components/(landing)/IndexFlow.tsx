import { CryptoIcon } from "@/components/ui";
import { getIndexSummaries } from "@/features/indexes/services/index-catalog";
import type { IndexSummary } from "@/features/indexes/utils/route-index";
import type { RoutedAllocation } from "@/types/market";
import {
  type Box,
  band,
  flowBands,
  groupTargets,
  stackBoxes,
} from "@/utils/flow-layout";
import { formatPercent } from "@/utils/format";

const EXAMPLE_USD = 1000;
const H = 400;
const GAP = 16;
const X = { chains: 0, hub: 330, assets: 660, protocols: 1000 };
const BAR = 8;
const CHAINS = [
  { name: "Ethereum", iconKey: "eth" },
  { name: "Base", iconKey: "base" },
  { name: "Arbitrum", iconKey: "arb" },
  { name: "Monad", iconKey: "monad" },
];

interface Protocol {
  id: string;
  name: string;
  iconKey: string;
  slices: RoutedAllocation[];
}

async function richestIndex(): Promise<IndexSummary | undefined> {
  try {
    const summaries = await getIndexSummaries();
    const venues = (s: IndexSummary) =>
      new Set(s.allocations.map((a) => a.venue.id)).size;
    return summaries
      .filter((s) => s.index.isFeatured)
      .sort(
        (a, b) =>
          venues(b) - venues(a) || b.allocations.length - a.allocations.length,
      )[0];
  } catch {
    return undefined;
  }
}

function groupByProtocol(summary: IndexSummary): Protocol[] {
  const map = new Map<string, Protocol>();
  for (const slice of summary.allocations) {
    const { id, name, iconKey } = slice.venue;
    const entry = map.get(id) ?? { id, name, iconKey, slices: [] };
    entry.slices.push(slice);
    map.set(id, entry);
  }
  const total = (p: Protocol) => p.slices.reduce((s, a) => s + a.weight, 0);
  return [...map.values()].sort((a, b) => total(b) - total(a));
}

function protocolStats(protocol: Protocol) {
  const weight = protocol.slices.reduce((s, a) => s + a.weight, 0);
  const apy =
    protocol.slices.reduce((s, a) => s + a.apy * a.weight, 0) / weight;
  return `$${Math.round(EXAMPLE_USD * weight).toLocaleString("en-US")} · ${formatPercent(apy)}`;
}

function percentBox(box: Box) {
  return {
    top: `${(box.top / H) * 100}%`,
    height: `${(box.height / H) * 100}%`,
  };
}

function Paths({ paths, fill }: { paths: string[]; fill: string }) {
  return paths.map((d) => (
    <path key={d} d={d} className="flow-band" fill={`url(#${fill})`} />
  ));
}

function Gradient({ id, from, to }: { id: string; from: string; to: string }) {
  return (
    <linearGradient id={id} x1="0" x2="1">
      <stop offset="0" stopColor={from} stopOpacity="0.9" />
      <stop offset="1" stopColor={to} stopOpacity="0.9" />
    </linearGradient>
  );
}

function FlowCanvas({ layers }: { layers: string[][] }) {
  return (
    <svg
      className="flow-svg"
      viewBox={`0 0 ${X.protocols} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <Gradient id="flow-in" from="var(--flow-in)" to="var(--flow-fade)" />
        <Gradient id="flow-mid" from="var(--flow-fade)" to="var(--flow-out)" />
        <Gradient id="flow-end" from="var(--flow-out)" to="var(--flow-venue)" />
      </defs>
      <Paths paths={layers[0]} fill="flow-in" />
      <Paths paths={layers[1]} fill="flow-mid" />
      <Paths paths={layers[2]} fill="flow-end" />
    </svg>
  );
}

function ChainColumn() {
  const boxes = stackBoxes(
    CHAINS.map(() => 1),
    H,
    GAP,
  );
  return (
    <ul className="flow-nodes in">
      {CHAINS.map((chain, i) => (
        <li key={chain.name} style={percentBox(boxes[i])}>
          <span className="flow-bar" />
          <span className="flow-label-title">
            <CryptoIcon iconKey={chain.iconKey} label="" size={18} />
            {chain.name}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AssetNodes({
  slices,
  boxes,
}: {
  slices: RoutedAllocation[];
  boxes: Box[];
}) {
  return (
    <ul className="flow-assets">
      {slices.map((slice, i) => (
        <li
          key={`${slice.asset.symbol}-${slice.venue.id}`}
          style={percentBox(boxes[i])}
        >
          <span className="flow-bar mid" />
          <span className="flow-chip">
            <CryptoIcon iconKey={slice.asset.iconKey} label="" size={16} />
            {slice.asset.symbol} {Math.round(slice.weight * 100)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

function ProtocolColumn({
  protocols,
  boxes,
}: {
  protocols: Protocol[];
  boxes: Box[];
}) {
  return (
    <ul className="flow-nodes out">
      {protocols.map((p, i) => (
        <li key={p.id} style={percentBox(boxes[i])}>
          <span className="flow-bar venue" />
          <span className="flow-label">
            <span className="flow-label-title">
              <CryptoIcon iconKey={p.iconKey} label="" size={20} />
              {p.name}
            </span>
            <span className="flow-label-detail">{protocolStats(p)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function buildLayout(protocols: Protocol[]) {
  const slices = protocols.flatMap((p) => p.slices);
  const inBands = flowBands({
    weights: CHAINS.map(() => 1),
    height: H,
    gap: GAP,
    nodeX: X.chains,
    hubX: X.hub,
  });
  const midBands = flowBands({
    weights: slices.map((s) => s.weight),
    height: H,
    gap: GAP,
    nodeX: X.assets,
    hubX: X.hub,
  });
  const target = groupTargets(
    protocols.map((p) => p.slices.map((s) => s.weight)),
    H,
    GAP,
  );
  const segments = target.segments.flat();
  const endPaths = midBands.map((m, i) =>
    band(X.assets + BAR, [m.nodeTop, m.nodeTop + m.nodeHeight], X.protocols, [
      segments[i].top,
      segments[i].top + segments[i].height,
    ]),
  );
  const assetBoxes = midBands.map((m) => ({
    top: m.nodeTop,
    height: m.nodeHeight,
  }));
  return {
    slices,
    inBands,
    midBands,
    endPaths,
    assetBoxes,
    protocolBoxes: target.boxes,
  };
}

export async function IndexFlow() {
  const summary = await richestIndex();
  if (!summary) return null;
  const protocols = groupByProtocol(summary);
  const layout = buildLayout(protocols);
  const layers = [
    layout.inBands.map((b) => b.path),
    layout.midBands.map((b) => b.path),
    layout.endPaths,
  ];
  return (
    <section className="landing-section" aria-labelledby="flow-heading">
      <h2 id="flow-heading" className="section-heading">
        One deposit, split across several protocols
      </h2>
      <div className="flow">
        <ChainColumn />
        <div className="flow-stage">
          <FlowCanvas layers={layers} />
          <AssetNodes slices={layout.slices} boxes={layout.assetBoxes} />
          <div className="flow-center">
            <span className="flow-center-label">Example deposit</span>
            <span className="flow-center-value">
              ${EXAMPLE_USD.toLocaleString("en-US")}
            </span>
            <span className="flow-center-label">
              {summary.index.name} · {formatPercent(summary.apy)} APY
            </span>
          </div>
        </div>
        <ProtocolColumn protocols={protocols} boxes={layout.protocolBoxes} />
      </div>
      <p className="flow-note">
        Deposit from one chain. Slices, protocols and APYs are live for{" "}
        {summary.index.name}.
      </p>
    </section>
  );
}
