import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import { ActeModal } from "../components/ActeModal";
import { PhotoModal } from "../components/PhotoModal";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { TreeViewControls } from "../components/TreeViewControls";
import { TreeNavPad } from "../components/TreeNavPad";
import { TreeZoomPad } from "../components/TreeZoomPad";
import { TreeView, type TreeViewHandle } from "../components/TreeView";
import { useApp } from "../context/AppContext";
import { useAsync } from "../hooks/useApi";
import { useKeyboardNav } from "../hooks/useKeyboardNav";
import { hasSavedTreeZoom } from "../hooks/useSvgViewport";
import { usePhotoModal } from "../hooks/usePhotoModal";
import type { ActeType, ArbreResponse } from "../types/api";
import { layoutTree, type TreeViewMode } from "../utils/treeLayout";
import { loadTreeViewMode, saveTreeViewMode } from "../utils/appStorage";
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
    setAncetres,
    setDescendants,
  } = useApp();

  const [fetchKey, setFetchKey] = useState(0);
  const fetchAncreRef = useRef(ancrePersonneId);
  fetchAncreRef.current = ancrePersonneId;

  const [toast, setToast] = useState<string | null>(null);
  const treeRef = useRef<TreeViewHandle>(null);
  const skipFocusPanRef = useRef(false);
  const initialTreeFramedRef = useRef(false);
  const [displayArbre, setDisplayArbre] = useState<ArbreResponse | null>(null);
  const [treeViewMode, setTreeViewMode] = useState<TreeViewMode>(() => loadTreeViewMode());

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

  useEffect(() => {
    if (arbre) setDisplayArbre(arbre as ArbreResponse);
  }, [arbre]);

  const layout = useMemo(
    () =>
      displayArbre
        ? layoutTree(
            displayArbre.centre,
            displayArbre.noeuds,
            displayArbre.unions ?? [],
            displayArbre.aretes,
            displayArbre.ancetres,
            displayArbre.descendants,
            treeViewMode,
          )
        : null,
    [displayArbre, treeViewMode],
  );

  const navIndex = useMemo(
    () =>
      layout && displayArbre
        ? buildTreeNavIndex(layout, displayArbre.aretes, displayArbre.noeuds)
        : null,
    [layout, displayArbre],
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
    if (!displayArbre || !navIndex?.graphIds.has(ancrePersonneId)) return;
    skipFocusPanRef.current = true;
    setFocusPersonneId(ancrePersonneId);
    requestAnimationFrame(() => {
      const keepZoom = initialTreeFramedRef.current || hasSavedTreeZoom();
      if (keepZoom) {
        treeRef.current?.panTo(ancrePersonneId);
      } else {
        treeRef.current?.recenterOn(ancrePersonneId);
        initialTreeFramedRef.current = true;
      }
      skipFocusPanRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayArbre]);

  useEffect(() => {
    if (skipFocusPanRef.current) return;
    if (!displayArbre || !navIndex?.graphIds.has(focusPersonneId)) return;
    treeRef.current?.panTo(focusPersonneId);
  }, [focusPersonneId, displayArbre, navIndex]);

  useEffect(() => {
    if (!displayArbre) return;
    requestAnimationFrame(() => treeRef.current?.fitAll());
    // fitAll uniquement au basculement compresser/détail (pas au rechargement de l'arbre)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeViewMode]);

  const handleTreeViewModeChange = useCallback((overview: boolean) => {
    const mode: TreeViewMode = overview ? "overview" : "detail";
    setTreeViewMode(mode);
    saveTreeViewMode(mode);
  }, []);

  useKeyboardNav({
    onHome: () => tryFocus(ancrePersonneId),
    onParent: () => tryMove("up"),
    onChild: () => tryMove("down"),
    onSiblingPrev: () => tryMove("left"),
    onSiblingNext: () => tryMove("right"),
    onZoomIn: () => treeRef.current?.zoomIn(),
    onZoomOut: () => treeRef.current?.zoomOut(),
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

      {arbreLoading && !displayArbre && <LoadingSpinner />}

      {!arbreLoading && arbreError && !displayArbre && (
        <p className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {arbreError}
        </p>
      )}

      {displayArbre && (
        <div className="relative flex min-h-0 flex-1 flex-col">
          {arbreLoading && <LoadingSpinner variant="overlay" />}
          <TreeView
            ref={treeRef}
            arbre={displayArbre}
            focusId={focusPersonneId}
            ancreId={ancrePersonneId}
            viewMode={treeViewMode}
            onFocus={tryFocus}
            onAncre={handleAncre}
            onActeClick={handleActeClick}
            onPhotoClick={handlePhotoClick}
          />
          <div className="pointer-events-none absolute right-3 top-3 z-40 pt-[calc(env(safe-area-inset-top,0px)+0.25rem)]">
            <TreeViewControls
              compress={treeViewMode === "overview"}
              onCompressChange={handleTreeViewModeChange}
              ancetres={ancetres}
              descendants={descendants}
              onAncetresChange={setAncetres}
              onDescendantsChange={setDescendants}
            />
          </div>
          <div className="pointer-events-none absolute bottom-3 right-3 z-40 flex items-end gap-2">
            <TreeNavPad
              canUp={canUp}
              canDown={canDown}
              canLeft={canLeft}
              canRight={canRight}
              onMove={tryMove}
            />
            <TreeZoomPad
              onZoomIn={() => treeRef.current?.zoomIn()}
              onZoomOut={() => treeRef.current?.zoomOut()}
              onFitAll={() => treeRef.current?.fitAll()}
            />
          </div>
        </div>
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
