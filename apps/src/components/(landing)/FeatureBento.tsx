import { CryptoIcon, SpotlightCard } from "@/components/ui";
import { BentoLive } from "./BentoLive";
import { RecipeCycle } from "./RecipeCycle";

const ROUTE_TARGET = { x: 264, y: 75 };
const ROUTE_HUB = { x: 150, y: 75 };

const SOURCES = [
  { name: "Ethereum", iconKey: "eth", y: 25 },
  { name: "Base", iconKey: "base", y: 75 },
  { name: "Arbitrum", iconKey: "arb", y: 125 },
];

const VENUES = [
  { name: "Aave v3", iconKey: "/crypto/aave.png" },
  { name: "Neverland", iconKey: "/logo/neverland-logo.jpg" },
  { name: "Morpho", iconKey: "/crypto/morpho.png" },
];

const ORBITERS = [
  { key: "aave", iconKey: "/crypto/aave.png", delay: "0s" },
  { key: "morpho", iconKey: "/crypto/morpho.png", delay: "-7s" },
];

function routePath(y: number): string {
  const hub = ROUTE_HUB;
  return `M36 ${y} C95 ${y}, 95 ${hub.y}, ${hub.x} ${hub.y} L${ROUTE_TARGET.x} ${ROUTE_TARGET.y}`;
}

function RouteVisual() {
  return (
    <div className="bento-route" aria-hidden="true">
      <svg
        className="bento-route-paths"
        viewBox="0 0 300 150"
        aria-hidden="true"
      >
        {SOURCES.map((s) => (
          <path key={s.name} d={routePath(s.y)} />
        ))}
      </svg>
      {SOURCES.map((s, i) => (
        <span key={s.name}>
          <span className="bento-route-source" style={{ top: s.y - 16 }}>
            <CryptoIcon iconKey={s.iconKey} label="" size={32} />
          </span>
          <span
            className="bento-packet"
            style={{
              offsetPath: `path("${routePath(s.y)}")`,
              animationDelay: `${i * 0.8}s`,
            }}
          />
        </span>
      ))}
      <span className="bento-route-hub">
        <span className="bento-route-hub-logo">
          <CryptoIcon iconKey="/crypto/aurora.png" label="" size={26} />
        </span>
        <span className="bento-route-hub-label">Aurora Intents</span>
      </span>
      <span className="bento-route-target">
        <CryptoIcon iconKey="monad" label="" size={40} />
      </span>
    </div>
  );
}

function VenueVisual() {
  return (
    <div className="bento-venues">
      <span className="bento-venue-scan" aria-hidden="true">
        <span className="bento-venue-check">Best rate</span>
      </span>
      <ul>
        {VENUES.map((v) => (
          <li key={v.name}>
            <CryptoIcon iconKey={v.iconKey} label="" size={28} />
            {v.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CustodyVisual() {
  return (
    <div className="bento-custody" aria-hidden="true">
      <span className="bento-custody-ring" />
      <span className="bento-custody-ring inner" />
      {ORBITERS.map((o) => (
        <span
          key={o.key}
          className="bento-orbit"
          style={{ animationDelay: o.delay }}
        >
          <span className="bento-orbiter" style={{ animationDelay: o.delay }}>
            <CryptoIcon iconKey={o.iconKey} label="" size={22} />
          </span>
        </span>
      ))}
      <span className="bento-custody-core">
        <CryptoIcon iconKey="usdc" label="" size={30} />
      </span>
    </div>
  );
}

function Tile({
  title,
  body,
  wide,
  children,
}: {
  title: string;
  body: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <SpotlightCard className={wide ? "bento-tile wide" : "bento-tile"}>
      <div className="bento-visual">{children}</div>
      <h3 className="bento-title">{title}</h3>
      <p className="bento-body">{body}</p>
    </SpotlightCard>
  );
}

export function FeatureBento() {
  return (
    <section className="landing-section" aria-labelledby="bento-heading">
      <h2 id="bento-heading" className="section-heading">
        Everything an index needs, nothing for you to manage
      </h2>
      <BentoLive>
        <Tile
          wide
          title="Deposit from where you already are"
          body="Aurora Intents brings tokens from Ethereum, Base or Arbitrum to Monad as USDC. You confirm one transfer."
        >
          <RouteVisual />
        </Tile>
        <Tile
          title="Routed to the best vault"
          body="Each slice goes to the highest eligible APY across three Monad venues."
        >
          <VenueVisual />
        </Tile>
        <Tile
          title="Your wallet, your positions"
          body="aTokens and vault shares sit in your own wallet. Revoke app access at any time."
        >
          <CustodyVisual />
        </Tile>
        <Tile
          wide
          title="Your recipe, your weights"
          body="Build an index with up to six assets and set every weight yourself. Examples shown."
        >
          <RecipeCycle />
        </Tile>
      </BentoLive>
    </section>
  );
}
