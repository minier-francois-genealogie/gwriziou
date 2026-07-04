import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import { ActeModal } from "../components/ActeModal";
import { PhotoModal } from "../components/PhotoModal";
import { TreeNavPad } from "../components/TreeNavPad";
import { TreeView, type TreeViewHandle } from "../components/TreeView";
import { useApp } from "../context/AppContext";
import { useAsync } from "../hooks/useApi";
import { useKeyboardNav } from "../hooks/useKeyboardNav";
import { usePhotoModal } from "../hooks/usePhotoModal";
import type { ActeType, ArbreResponse } from "../types/api";
import { layoutTree } from "../utils/treeLayout";
import { buildTreeNavIndex, type TreeNavDirection } from "../utils/treeNav";

const NAV_MESSAGE = "Navigation uniquement sur l'arbre chargé";

export function TreePage() {
  const {
    ancrePersonneId,
    setAncrePersonneId,
    focusPersonneId,
    setFocusPersonneId,
    ancetres,
    descendants,
  } = useApp();

  const [fetchKey, setFetchKey] = useState(0);
  const fetchAncreRef = useRef(ancrePersonneId);
  fetchAncreRef.current = ancrePersonneId;

  const [toast, setToast] = useState<string | null>(null);
  const treeRef = useRef<TreeViewHandle>(null);
  const skipFocusPanRef = useRef(false);

  const [acteModal, setActeModal] = useState<{
    type: ActeType;
    url: string;
    name: string;
  } | null>(null);

  const { photoModal, openPhotosForPerson, closePhotos } = usePhotoModal();

  useEffect(() => {
    setFetchKey((k) => k + 1);
  }, [ancrePersonneId, ancetres, descendants]);

  const { data: arbre, loading: arbreLoading, error: arbreError } = useAsync(
    () => api.arbre(fetchAncreRef.current, ancetres, descendants),
    [fetchKey, ancetres, descendants],
  );

  const layout = useMemo(
    () =>
      arbre
        ? layoutTree(
            arbre.centre,
            arbre.noeuds,
            arbre.unions ?? [],
            arbre.aretes,
            arbre.ancetres,
            arbre.descendants,
          )
        : null,
    [arbre],
  );

  const navIndex = useMemo(
    () =>
      layout && arbre
        ? buildTreeNavIndex(layout, arbre.aretes, arbre.noeuds)
        : null,
    [layout, arbre],
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const tryFocus = useCallback(
    (id: string) => {
      if (!navIndex?.graphIds.has(id)) {
        showToast(NAV_MESSAGE);
        return;
      }
      setFocusPersonneId(id);
    },
    [navIndex, setFocusPersonneId, showToast],
  );

  const handleAncre = useCallback(
    (id: string) => {
      if (id === ancrePersonneId) return;
      setAncrePersonneId(id);
    },
    [ancrePersonneId, setAncrePersonneId],
  );

  const tryMove = useCallback(
    (direction: TreeNavDirection) => {
      const next = navIndex?.move(focusPersonneId, direction);
      if (next) setFocusPersonneId(next);
    },
    [navIndex, focusPersonneId, setFocusPersonneId],
  );

  useEffect(() => {
    if (!arbre || !navIndex?.graphIds.has(ancrePersonneId)) return;
    skipFocusPanRef.current = true;
    setFocusPersonneId(ancrePersonneId);
    requestAnimationFrame(() => {
      treeRef.current?.recenterOn(ancrePersonneId);
      skipFocusPanRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arbre]);

  useEffect(() => {
    if (skipFocusPanRef.current) return;
    if (!arbre || !navIndex?.graphIds.has(focusPersonneId)) return;
    treeRef.current?.panTo(focusPersonneId);
  }, [focusPersonneId, arbre, navIndex]);

  useKeyboardNav({
    onHome: () => tryFocus(ancrePersonneId),
    onParent: () => tryMove("up"),
    onChild: () => tryMove("down"),
    onSiblingPrev: () => tryMove("left"),
    onSiblingNext: () => tryMove("right"),
  });

  const handleActeClick = useCallback(
    (type: ActeType, url: string, name = "Personne") => {
      setActeModal({ type, url, name });
    },
    [],
  );

  const handlePhotoClick = useCallback(
    (id: string, nom: string, prenoms: string | null) => {
      void openPhotosForPerson(id, nom, prenoms);
    },
    [openPhotosForPerson],
  );

  const canUp = navIndex?.canMove(focusPersonneId, "up") ?? false;
  const canDown = navIndex?.canMove(focusPersonneId, "down") ?? false;
  const canLeft = navIndex?.canMove(focusPersonneId, "left") ?? false;
  const canRight = navIndex?.canMove(focusPersonneId, "right") ?? false;

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
        <>
          <TreeView
            ref={treeRef}
            arbre={arbre as ArbreResponse}
            focusId={focusPersonneId}
            ancreId={ancrePersonneId}
            onFocus={tryFocus}
            onAncre={handleAncre}
            onActeClick={handleActeClick}
            onPhotoClick={handlePhotoClick}
          />
          <div className="pointer-events-none absolute bottom-3 right-3 z-40">
            <TreeNavPad
              canUp={canUp}
              canDown={canDown}
              canLeft={canLeft}
              canRight={canRight}
              onMove={tryMove}
            />
          </div>
        </>
      )}

      {acteModal && (
        <ActeModal
          type={acteModal.type}
          url={acteModal.url}
          personName={acteModal.name}
          onClose={() => setActeModal(null)}
        />
      )}

      {photoModal && (
        <PhotoModal
          photos={photoModal.photos}
          personName={photoModal.personName}
          onClose={closePhotos}
        />
      )}
    </div>
  );
}
