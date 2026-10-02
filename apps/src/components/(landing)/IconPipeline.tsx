"use client";

import { useBeamAnimation } from "@/hooks/useBeamAnimation";
import { BeamSvg } from "./BeamSvg";
import { RotatingLogos } from "./RotatingLogos";

const SOURCE_TOKENS = ["usdc"];
const NETWORKS = ["monad", "eth", "sol", "btc", "avax", "bnb", "matic"];
const PROTOCOLS = [
  "/crypto/aave.png",
  "/crypto/comp.png",
  "/crypto/crv.png",
  "/crypto/spark.png",
];

export function IconPipeline() {
  const nodes = useBeamAnimation().current;
  return (
    <div
      className="icon-pipeline"
      aria-hidden
      ref={(el) => {
        nodes.pipeline = el;
      }}
    >
      <BeamSvg nodes={nodes} />
      <div
        className="icon-node node-light-right"
        ref={(el) => {
          nodes.source = el;
        }}
      >
        <RotatingLogos iconKeys={SOURCE_TOKENS} size={26} />
      </div>
      <div className="pipeline-line" />
      <div className="pipeline-center">
        <div
          className="splash"
          ref={(el) => {
            nodes.splash = el;
          }}
        />
        <div
          className="icon-node-center"
          ref={(el) => {
            nodes.center = el;
          }}
        >
          <RotatingLogos iconKeys={NETWORKS} size={34} />
        </div>
      </div>
      <div className="pipeline-line right" />
      <div
        className="icon-node node-light-left"
        ref={(el) => {
          nodes.target = el;
        }}
      >
        <RotatingLogos iconKeys={PROTOCOLS} size={26} />
      </div>
    </div>
  );
}
