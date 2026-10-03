"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  type ReactNode,
  type SyntheticEvent,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { isWalletPromptOpen, subscribeWalletPrompt } from "@/lib/wallet-prompt";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  size?: keyof typeof PANEL_WIDTHS;
  children: ReactNode;
}

const PANEL_WIDTHS = { md: "max-w-md", lg: "max-w-3xl" };

const PANEL_SPRING = { type: "spring", stiffness: 380, damping: 32 } as const;

export function Modal({
  isOpen,
  onClose,
  label,
  size = "lg",
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const isPrompting = useSyncExternalStore(
    subscribeWalletPrompt,
    isWalletPromptOpen,
    () => false,
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    const wantsModal = !isPrompting;
    if (dialog.open && dialog.matches(":modal") === wantsModal) return;
    if (dialog.open) dialog.close();
    if (wantsModal) dialog.showModal();
    else dialog.show();
  }, [isOpen, isPrompting]);

  const handleCancel = (event: SyntheticEvent) => {
    event.preventDefault();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      onCancel={handleCancel}
      onClose={() => {
        if (isOpen && !dialogRef.current?.open) onClose();
      }}
      className="fixed inset-0 m-0 size-full max-h-none max-w-none items-center justify-center bg-transparent p-4 text-ink backdrop:bg-transparent open:flex"
    >
      <AnimatePresence onExitComplete={() => dialogRef.current?.close()}>
        {isOpen && (
          <>
            <motion.button
              key="overlay"
              type="button"
              tabIndex={-1}
              aria-label="Close dialog"
              onClick={onClose}
              className="fixed inset-0 cursor-default bg-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              key="panel"
              className={`relative w-full ${PANEL_WIDTHS[size]} overflow-hidden rounded-lg border border-line bg-surface shadow-2xl`}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={PANEL_SPRING}
            >
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </dialog>
  );
}
