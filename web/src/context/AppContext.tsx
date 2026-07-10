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
  loadAncrePersonneId,
  loadDescendants,
  saveAncetres,
  saveAncrePersonneId,
  saveDescendants,
} from "../utils/appStorage";
import { normalizeGedcomId } from "../utils/format";

interface AppContextValue {
  ancrePersonneId: string;
  setAncrePersonneId: (id: string) => void;
  focusPersonneId: string;
  setFocusPersonneId: (id: string) => void;
  resetFocusToAncre: () => void;
  ancetres: number;
  descendants: number;
  setAncetres: (n: number) => void;
  setDescendants: (n: number) => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  toggleMenu: () => void;
  initAncrePersonneId: (rootId: string) => void;
  importEnCours: boolean;
  setImportEnCours: (value: boolean) => void;
  dataRefreshTick: number;
  bumpDataRefresh: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ancrePersonneId, setAncrePersonneIdState] = useState("@655@");
  const [focusPersonneId, setFocusPersonneIdState] = useState("@655@");
  const [initialized, setInitialized] = useState(false);
  const [ancetres, setAncetresState] = useState(loadAncetres);
  const [descendants, setDescendantsState] = useState(loadDescendants);
  const [menuOpen, setMenuOpen] = useState(false);
  const [importEnCours, setImportEnCours] = useState(false);
  const [dataRefreshTick, setDataRefreshTick] = useState(0);

  const bumpDataRefresh = useCallback(() => {
    setDataRefreshTick((t) => t + 1);
  }, []);

  const initAncrePersonneId = useCallback(
    (rootId: string) => {
      if (initialized) return;
      const id = loadAncrePersonneId(rootId);
      setAncrePersonneIdState(id);
      setFocusPersonneIdState(id);
      setInitialized(true);
    },
    [initialized],
  );

  const setAncrePersonneId = useCallback((id: string) => {
    const normalized = normalizeGedcomId(id);
    setAncrePersonneIdState(normalized);
    saveAncrePersonneId(normalized);
  }, []);

  const setFocusPersonneId = useCallback((id: string) => {
    setFocusPersonneIdState(normalizeGedcomId(id));
  }, []);

  const resetFocusToAncre = useCallback(() => {
    setFocusPersonneIdState(ancrePersonneId);
  }, [ancrePersonneId]);

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
      ancrePersonneId,
      setAncrePersonneId,
      focusPersonneId,
      setFocusPersonneId,
      resetFocusToAncre,
      ancetres,
      descendants,
      setAncetres,
      setDescendants,
      menuOpen,
      setMenuOpen,
      toggleMenu,
      initAncrePersonneId,
      importEnCours,
      setImportEnCours,
      dataRefreshTick,
      bumpDataRefresh,
    }),
    [
      ancrePersonneId,
      setAncrePersonneId,
      focusPersonneId,
      setFocusPersonneId,
      resetFocusToAncre,
      ancetres,
      descendants,
      setAncetres,
      setDescendants,
      menuOpen,
      toggleMenu,
      initAncrePersonneId,
      importEnCours,
      dataRefreshTick,
      bumpDataRefresh,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
