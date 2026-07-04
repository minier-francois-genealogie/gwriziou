import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  loadAncetres,
  loadDescendants,
  loadPersonneId,
  saveAncetres,
  saveDescendants,
  savePersonneId,
} from "../utils/appStorage";
import { normalizeGedcomId } from "../utils/format";

interface AppContextValue {
  personneId: string;
  setPersonneId: (id: string) => void;
  ancetres: number;
  descendants: number;
  setAncetres: (n: number) => void;
  setDescendants: (n: number) => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  toggleMenu: () => void;
  initPersonneId: (rootId: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [personneId, setPersonneIdState] = useState("@655@");
  const [initialized, setInitialized] = useState(false);
  const [ancetres, setAncetresState] = useState(loadAncetres);
  const [descendants, setDescendantsState] = useState(loadDescendants);
  const [menuOpen, setMenuOpen] = useState(false);

  const initPersonneId = useCallback(
    (rootId: string) => {
      if (initialized) return;
      setPersonneIdState(loadPersonneId(rootId));
      setInitialized(true);
    },
    [initialized],
  );

  const setPersonneId = useCallback((id: string) => {
    const normalized = normalizeGedcomId(id);
    setPersonneIdState(normalized);
    savePersonneId(normalized);
  }, []);

  const setAncetres = useCallback((n: number) => {
    setAncetresState(n);
    saveAncetres(n);
  }, []);

  const setDescendants = useCallback((n: number) => {
    setDescendantsState(n);
    saveDescendants(n);
  }, []);

  const toggleMenu = useCallback(() => setMenuOpen((o) => !o), []);

  const value = useMemo(
    () => ({
      personneId,
      setPersonneId,
      ancetres,
      descendants,
      setAncetres,
      setDescendants,
      menuOpen,
      setMenuOpen,
      toggleMenu,
      initPersonneId,
    }),
    [
      personneId,
      setPersonneId,
      ancetres,
      descendants,
      setAncetres,
      setDescendants,
      menuOpen,
      toggleMenu,
      initPersonneId,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
