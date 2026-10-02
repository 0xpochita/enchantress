import { useRef, useState } from "react";

export type FlowStatus =
  | "idle"
  | "confirming"
  | "pending"
  | "success"
  | "failed";

const MOCK_SUBMIT_MS = 1600;

export function useSubmitFlow(onReset: () => void) {
  const [status, setStatus] = useState<FlowStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const confirm = (canSucceed: boolean) => {
    setStatus("pending");
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => setStatus(canSucceed ? "success" : "failed"),
      MOCK_SUBMIT_MS,
    );
  };
  return {
    status,
    review: () => setStatus("confirming"),
    confirm,
    dismiss: () => setStatus("idle"),
    finish: () => {
      setStatus("idle");
      onReset();
    },
  };
}

export type SubmitFlow = ReturnType<typeof useSubmitFlow>;
