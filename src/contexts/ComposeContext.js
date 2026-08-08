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
  // Files dropped on an entry point BEFORE the modal is open (e.g.
  // HomeCompose's collapsed row) — since ComposeModal stays mounted for the
  // whole session (never remounts), there's no "fresh mount" moment to seed
  // its media state via a constructor arg the way an edit form would. This
  // is the hand-off instead: openCompose(files) stages them here, and
  // ComposeModal drains + clears them itself once it's actually open.
  const [pendingFiles, setPendingFiles] = useState(null);

  const openCompose = useCallback((files) => {
    if (files && files.length > 0) setPendingFiles(files);
    setIsOpen(true);
  }, []);
  const closeCompose = useCallback(() => setIsOpen(false), []);
  const clearPendingFiles = useCallback(() => setPendingFiles(null), []);

  const value = useMemo(
    () => ({ isComposeOpen: isOpen, openCompose, closeCompose }),
    [isOpen, openCompose, closeCompose]
  );

  return (
    <ComposeContext.Provider value={value}>
      {children}
      <ComposeModal
        open={isOpen}
        onClose={closeCompose}
        pendingFiles={pendingFiles}
        onPendingFilesConsumed={clearPendingFiles}
      />
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
