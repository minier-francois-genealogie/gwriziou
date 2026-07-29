import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";

export function useCheckedIndex() {
  const [chemins, setChemins] = useState<Set<string>>(new Set());
  const [version, setVersion] = useState(0);
  const [pending, setPending] = useState<Set<string>>(new Set());

  const reload = useCallback(async () => {
    try {
      const res = await api.checkedIndex();
      setChemins(new Set(res.chemins));
    } catch {
      setChemins(new Set());
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, version]);

  const isChecked = useCallback(
    (chemin: string | null | undefined) => {
      if (!chemin) return false;
      return chemins.has(chemin);
    },
    [chemins],
  );

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const toggleChecked = useCallback(
    async (chemin: string | null | undefined, next: boolean) => {
      if (!chemin) return;
      setPending((prev) => new Set(prev).add(chemin));
      setChemins((prev) => {
        const n = new Set(prev);
        if (next) n.add(chemin);
        else n.delete(chemin);
        return n;
      });
      try {
        await api.setChecked(chemin, next);
      } catch {
        setVersion((v) => v + 1);
      } finally {
        setPending((prev) => {
          const n = new Set(prev);
          n.delete(chemin);
          return n;
        });
      }
    },
    [],
  );

  const isPending = useCallback(
    (chemin: string | null | undefined) => {
      if (!chemin) return false;
      return pending.has(chemin);
    },
    [pending],
  );

  return { isChecked, toggleChecked, isPending, refresh, chemins };
}
