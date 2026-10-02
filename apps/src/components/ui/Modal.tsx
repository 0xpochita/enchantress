"use client";

import { type ReactNode, useEffect, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, label, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-3xl rounded-lg border border-line bg-surface p-0 text-ink"
    >
      {children}
    </dialog>
  );
}
