import { Card } from "@/components/ui";

function Bone({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`block animate-pulse rounded-md bg-surface-raised ${className}`}
    />
  );
}

const SLOT_IDS = ["a", "b", "c", "d", "e", "f"];

function slots(count: number): string[] {
  return SLOT_IDS.slice(0, count);
}

function Loading({ label }: { label: string }) {
  return <output className="sr-only">{label}</output>;
}

function PageTitle({ wide = false }: { wide?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <Bone className="h-9 w-64" />
      {wide && <Bone className="h-4 w-full max-w-xl" />}
    </div>
  );
}

function DetailRows({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-line px-5 py-4">
      {slots(count).map((row) => (
        <div key={row} className="flex justify-between">
          <Bone className="h-4 w-24" />
          <Bone className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

function DepositFormBones() {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <Bone className="h-36 w-full" />
      <Bone className="h-36 w-full" />
      <DetailRows count={5} />
      <Bone className="mt-2 h-12 w-full rounded-full" />
    </Card>
  );
}

export function DepositSkeleton() {
  return (
    <>
      <Loading label="Loading deposit" />
      <PageTitle wide />
      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <DepositFormBones />
        <Card className="flex min-h-96 flex-col items-center gap-3 p-6">
          <Bone className="h-7 w-72" />
          <Bone className="h-4 w-48" />
          <Bone className="mt-auto size-28 rounded-full" />
        </Card>
      </div>
    </>
  );
}

function IndexCardBones() {
  return (
    <Card className="flex flex-col gap-8 p-6">
      <div className="flex items-center gap-3">
        <Bone className="size-8 rounded-full" />
        <div className="flex flex-col gap-2">
          <Bone className="h-4 w-28" />
          <Bone className="h-3 w-20" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Bone className="h-10 w-32" />
        <Bone className="h-3 w-24" />
      </div>
    </Card>
  );
}

const CARD_COUNT = 6;

export function InvestSkeleton() {
  return (
    <>
      <Loading label="Loading indexes" />
      <Card className="flex flex-col gap-10 p-6 md:p-10">
        <PageTitle wide />
        <div className="flex gap-8">
          {slots(4).map((stat) => (
            <Bone key={stat} className="h-12 w-20" />
          ))}
        </div>
      </Card>
      <Bone className="h-6 w-40" />
      <Bone className="h-11 w-full max-w-md rounded-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slots(CARD_COUNT).map((card) => (
          <IndexCardBones key={card} />
        ))}
      </div>
    </>
  );
}

function BuilderBones() {
  return (
    <div className="flex flex-col gap-4 rounded-md bg-surface-raised/40 p-5">
      <Bone className="h-4 w-32" />
      <Bone className="h-12 w-full" />
      <Bone className="h-4 w-32" />
      <Bone className="h-16 w-full" />
      <Bone className="h-11 w-full rounded-full" />
      <Bone className="h-12 w-full" />
      <Bone className="h-12 w-full rounded-full" />
    </div>
  );
}

export function CreateSkeleton() {
  return (
    <>
      <Loading label="Loading index builder" />
      <PageTitle />
      <Card className="flex flex-col gap-6 p-6">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {slots(4).map((stat) => (
            <Bone key={stat} className="h-14 w-32" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-[2fr_3fr]">
          <BuilderBones />
          <Bone className="min-h-96 w-full" />
        </div>
      </Card>
    </>
  );
}

export function PortfolioBodySkeleton() {
  return (
    <>
      <Loading label="Loading portfolio" />
      <Bone className="h-7 w-28" />
      <Card className="grid gap-6 p-6 md:grid-cols-3">
        <Bone className="h-16 w-40" />
        <Bone className="h-32 w-full" />
        <Bone className="h-24 w-full" />
      </Card>
      <Bone className="h-20 w-full" />
      <Bone className="h-7 w-40" />
      <div className="flex gap-2">
        {slots(4).map((chip) => (
          <Bone key={chip} className="h-10 w-28 rounded-full" />
        ))}
      </div>
      <Bone className="h-48 w-full" />
    </>
  );
}

export function PortfolioSkeleton() {
  return (
    <>
      <div className="flex items-center gap-5">
        <Bone className="size-20 rounded-full" />
        <Bone className="h-10 w-56" />
      </div>
      <div className="flex gap-6 border-b border-line pb-3">
        <Bone className="h-5 w-20" />
        <Bone className="h-5 w-16" />
      </div>
      <PortfolioBodySkeleton />
    </>
  );
}
