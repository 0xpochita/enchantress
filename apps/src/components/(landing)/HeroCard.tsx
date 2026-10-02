import Link from "next/link";
import { IconPipeline } from "./IconPipeline";

export function HeroCard() {
  return (
    <section className="hero-card" aria-labelledby="hero-heading">
      <div className="hero-grid" />
      <IconPipeline />
      <div className="hero-content">
        <h1 id="hero-heading" className="hero-heading">
          The simple way
          <strong>to earn on Monad</strong>
        </h1>
        <p className="hero-sub">
          Build a yield basket and deposit any token from any chain.
          <br />
          One intent routes every slice to the best vault.
        </p>
        <Link href="/aggregators" className="btn-cta">
          Start earning
        </Link>
      </div>
    </section>
  );
}
