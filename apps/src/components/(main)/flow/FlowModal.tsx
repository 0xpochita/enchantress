"use client";

import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useRef } from "react";
import { Modal } from "@/components/ui";
import type { FlowStatus } from "@/types/flow";

type FlowStep = Exclude<FlowStatus, "idle">;

interface FlowModalProps {
  flow: { status: FlowStatus; dismiss: () => void; finish: () => void };
  label: string;
  steps: Record<FlowStep, ReactNode>;
}

export function PendingStep({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
      <Loader2 aria-hidden className="size-10 animate-spin text-brand" />
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-light tracking-tight">{title}</h2>
        <p className="text-sm text-ink-muted">{message}</p>
      </div>
    </div>
  );
}

export function FlowModal({ flow, label, steps }: FlowModalProps) {
  const lastStep = useRef<FlowStep>("confirming");
  if (flow.status !== "idle") lastStep.current = flow.status;
  const close = () => {
    if (flow.status === "pending") return;
    if (flow.status === "success") flow.finish();
    else flow.dismiss();
  };
  return (
    <Modal
      isOpen={flow.status !== "idle"}
      onClose={close}
      label={label}
      size="md"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={lastStep.current}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {steps[lastStep.current]}
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
}
