import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import { ActeModal } from "../components/ActeModal";
import { TreeView, type TreeViewHandle } from "../components/TreeView";
import { useApp } from "../context/AppContext";
import { useAsync } from "../hooks/useApi";
import { pickNavTarget, useKeyboardNav } from "../hooks/useKeyboardNav";
import type { ActeType, ArbreResponse, PersonneDetail } from "../types/api";

const NAV_MESSAGE = "Navigation uniquement sur l'arbre chargé";

export function TreePage() {
  const { personneId, setPersonneId, ancetres, descendants } = useApp();
  const [siblingIdx, setSiblingIdx] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const fetchCentreRef = useRef(personneId);
  fetchCentreRef.current = personneId;
  const treeRef = useRef<TreeViewHandle>(null);
  const mountedRef = useRef(false);
  const [acteModal, setActeModal] = useState<{
    type: ActeType;
    url: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    setFetchKey((k) => k + 1);
    mountedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mountedRef.current) return;
    setFetchKey((k) => k + 1);
  }, [ancetres, descendants]);

  const { data: arbre, loading: arbreLoading, error: arbreError } = useAsync(
    () => api.arbre(fetchCentreRef.current, ancetres, descendants),
    [fetchKey, ancetres, descendants],
  );

  const { data: personne } = useAsync(
    () => api.personne(personneId),
    [personneId],
  );

  const graphIds = useMemo(
    () => new Set((arbre?.noeuds ?? []).map((n) => n.id_gedcom)),
    [arbre],
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const trySelect = useCallback(
    (id: string): boolean => {
      if (!graphIds.has(id)) {
        showToast(NAV_MESSAGE);
        return false;
      }
      setPersonneId(id);
      return true;
    },
    [graphIds, setPersonneId, showToast],
  );

  const handleHighlight = useCallback(
    (id: string) => {
      trySelect(id);
    },
    [trySelect],
  );

  const handleRecenter = useCallback(
    (id: string) => {
      trySelect(id);
    },
    [trySelect],
  );

  useEffect(() => {
    if (!arbre || !graphIds.has(personneId)) return;
    treeRef.current?.recenterOn(personneId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arbre]);

  useEffect(() => {
    setSiblingIdx(0);
  }, [personneId]);

  const tryNav = useCallback(
    (direction: "parent" | "child" | "siblingPrev" | "siblingNext" | "spouse") => {
      const next = pickNavTarget(
        personne as PersonneDetail | null,
        direction,
        siblingIdx,
      );
      if (!next) return;
      if (!trySelect(next)) return;
      if (direction === "siblingPrev") setSiblingIdx((i) => i - 1);
      if (direction === "siblingNext") setSiblingIdx((i) => i + 1);
    },
    [personne, siblingIdx, trySelect],
  );

  useKeyboardNav({
    onHome: () => {
      if (arbre?.centre) trySelect(arbre.centre);
    },
    onParent: () => tryNav("parent"),
    onChild: () => tryNav("child"),
    onSiblingPrev: () => tryNav("siblingPrev"),
    onSiblingNext: () => tryNav("siblingNext"),
    onSpouseNext: () => tryNav("spouse"),
  });

  const handleActeClick = useCallback(
    (type: ActeType, url: string, name = "Personne") => {
      setActeModal({ type, url, name });
    },
    [],
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {toast && (
        <div className="absolute left-1/2 top-2 z-50 -translate-x-1/2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {arbreLoading && (
        <p className="flex flex-1 items-center justify-center text-slate-500">
          Chargement de l&apos;arbre…
        </p>
      )}

      {arbreError && (
        <p className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {arbreError}
        </p>
      )}

      {arbre && (
        <TreeView
          ref={treeRef}
          arbre={arbre as ArbreResponse}
          selectedId={personneId}
          onHighlight={handleHighlight}
          onRecenter={handleRecenter}
          onActeClick={handleActeClick}
        />
      )}

      {acteModal && (
        <ActeModal
          type={acteModal.type}
          url={acteModal.url}
          personName={acteModal.name}
          onClose={() => setActeModal(null)}
        />
      )}
    </div>
  );
}
