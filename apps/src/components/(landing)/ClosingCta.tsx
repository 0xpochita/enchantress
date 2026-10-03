import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { LightRays, ThemedLogoMark } from "@/components/ui";

const RAY_GOLD: [number, number, number] = [1, 0.82, 0.45];
const RAY_VIOLET: [number, number, number] = [0.45, 0.32, 0.95];

export function ClosingCta() {
  return (
    <section className="closing-scene" aria-labelledby="closing-heading">
      <div className="closing-backdrop" aria-hidden="true">
        <LightRays
          color={RAY_GOLD}
          lightColor={RAY_VIOLET}
          className="closing-rays"
        />
        <div className="closing-vignette" />
      </div>
      <div className="closing-content">
        <span className="closing-mark">
          <ThemedLogoMark />
          enchantress
        </span>
        <h2 id="closing-heading" className="closing-heading">
          Put idle tokens to work
          <strong>on Monad</strong>
        </h2>
        <p className="closing-sub">
          Pick an index, deposit from the chain you are already on, and let
          every slice earn in the best vault.
        </p>
        <div className="closing-actions">
          <Link href="/deposit" className="btn-cta">
            Start earning
            <span className="btn-arrow" aria-hidden>
              <ArrowRight />
            </span>
          </Link>
          <Link href="/create" className="btn-login">
            Create an index
          </Link>
        </div>
        <p className="closing-foot">Your positions stay in your own wallet.</p>
      </div>
    </section>
  );
}
