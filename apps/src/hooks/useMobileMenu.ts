import { useEffect, useState } from "react";

export function useMobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return {
    isOpen,
    toggle: () => setIsOpen((open) => !open),
    close: () => setIsOpen(false),
  };
}
