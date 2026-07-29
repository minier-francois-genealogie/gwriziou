import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { formatNom } from "../utils/format";
import type { NotesModalTarget } from "../components/NotesModal";

export function useNotesIndex() {
  const [chemins, setChemins] = useState<Set<string>>(new Set());
  const [version, setVersion] = useState(0);

  const reload = useCallback(async () => {
    try {
      const res = await api.notesIndex();
      setChemins(new Set(res.chemins));
    } catch {
      setChemins(new Set());
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, version]);

  const hasNotes = useCallback(
    (chemin: string | null | undefined) => {
      if (!chemin) return false;
      return chemins.has(chemin);
    },
    [chemins],
  );

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return { hasNotes, refresh, chemins };
}

export function useNotesModal(onChanged?: () => void) {
  const [notesModal, setNotesModal] = useState<NotesModalTarget | null>(null);

  const openNotes = useCallback(
    (chemin: string | null | undefined, nom: string, prenoms: string | null) => {
      if (!chemin) return;
      setNotesModal({
        chemin,
        personName: formatNom(nom, prenoms),
      });
    },
    [],
  );

  const openNotesForPerson = useCallback(
    async (id: string, nom: string, prenoms: string | null) => {
      try {
        const detail = await api.personne(id);
        const chemin = detail.dossier_actes?.chemin;
        if (!chemin) return;
        setNotesModal({
          chemin,
          personName: formatNom(nom, prenoms),
        });
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const closeNotes = useCallback(() => setNotesModal(null), []);

  const handleChanged = useCallback(() => {
    onChanged?.();
  }, [onChanged]);

  return useMemo(
    () => ({
      notesModal,
      openNotes,
      openNotesForPerson,
      closeNotes,
      handleChanged,
    }),
    [notesModal, openNotes, openNotesForPerson, closeNotes, handleChanged],
  );
}
