import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import ComposeModal from "../components/compose/ComposeModal";

const ComposeContext = createContext(null);

/**
 * Global composer entry point: every create affordance (the home compose row,
 * the nav rail's "+", the mobile bottom bar's "+") opens the SAME modal.
 *
 * The modal component stays MOUNTED while closed (it renders null) so an
 * unfinished draft — text, picked media, the area toggle — survives closing
 * and reopening: dismissing the modal is never destructive, which is why no
 * "discard draft?" confirmation is needed.
 */
export function ComposeProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openCompose = useCallback(() => setIsOpen(true), []);
  const closeCompose = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isComposeOpen: isOpen, openCompose, closeCompose }),
    [isOpen, openCompose, closeCompose]
  );

  return (
    <ComposeContext.Provider value={value}>
      {children}
      <ComposeModal open={isOpen} onClose={closeCompose} />
    </ComposeContext.Provider>
  );
}

export function useCompose() {
  const ctx = useContext(ComposeContext);
  if (!ctx) {
    throw new Error("useCompose must be used within a ComposeProvider");
  }
  return ctx;
}
