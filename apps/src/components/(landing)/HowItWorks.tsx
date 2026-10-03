import Image from "next/image";
import Link from "next/link";
import { StepStrip } from "./StepStrip";

const STEPS = [
  {
    label: "Step 1 · Pick an index",
    title: "A basket of yield, chosen or built by you.",
    href: "/invest",
    src: "/landing/pick-index.jpg",
  },
  {
    label: "Step 2 · Send from any chain",
    title: "Ethereum, Base, Arbitrum or Monad. One transfer.",
    href: "/deposit",
    src: "/landing/any-chain.jpg",
  },
  {
    label: "Step 3 · Earn where it pays most",
    title: "Every slice routed to the highest eligible APY.",
    href: "/invest",
    src: "/landing/best-vault.jpg",
  },
];

function StepCard({ step }: { step: (typeof STEPS)[number] }) {
  return (
    <Link href={step.href} className="step-card">
      <Image
        src={step.src}
        alt=""
        fill
        sizes="(max-width: 760px) 82vw, 360px"
        className="step-card-image"
      />
      <span className="step-card-copy">
        <span className="step-card-label">{step.label}</span>
        <span className="step-card-title">{step.title}</span>
      </span>
      <span className="step-card-arrow" aria-hidden="true">
        ↗
      </span>
    </Link>
  );
}

export function HowItWorks() {
  return (
    <section className="landing-section" aria-labelledby="how-heading">
      <h2 id="how-heading" className="section-heading">
        From any wallet to Monad yield in three steps
      </h2>
      <StepStrip>
        {STEPS.map((step) => (
          <StepCard key={step.label} step={step} />
        ))}
      </StepStrip>
    </section>
  );
}
