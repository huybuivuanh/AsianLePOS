import { useState, useCallback } from "react";

type Disclosure = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

/**
 * Manages a boolean open/close state — replaces useState(false) for modals,
 * drawers, dropdowns, and any togglable UI element.
 *
 * @example
 * const cashModal = useDisclosure();
 * // cashModal.isOpen, cashModal.open(), cashModal.close(), cashModal.toggle()
 */
export function useDisclosure(initialOpen = false): Disclosure {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  return { isOpen, open, close, toggle };
}
