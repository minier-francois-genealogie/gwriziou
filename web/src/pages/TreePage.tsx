import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { ActeModal } from "../components/ActeModal";
import { PersonPanel } from "../components/PersonPanel";
import { TreeView } from "../components/TreeView";
import { useAsync } from "../hooks/useApi";
import { pickNavTarget, useKeyboardNav } from "../hooks/useKeyboardNav";
import type { ActeType, ArbreResponse, PersonneDetail } from "../types/api";
import { decodeGedcomId, normalizeGedcomId } from "../utils/format";

const DEFAULT_ANCETRES = 4;
const DEFAULT_DESCENDANTS = 2;

export function TreePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [ancetres, setAncetres] = useState(DEFAULT_ANCETRES);
  const [descendants, setDescendants] = useState(DEFAULT_DESCENDANTS);
  const [siblingIdx, setSiblingIdx] = useState(0);
  const [acteModal, setActeModal] = useState<{
    type: ActeType;
    url: string;
    name: string;
  } | null>(null);

  const { data: status } = useAsync(() => api.status(), []);
  const rootId = status?.id_gedcom_racine ?? "@655@";

  const paramId = decodeGedcomId(searchParams.get("id"));
  const currentId = normalizeGedcomId(paramId ?? rootId);

  const { data: arbre, loading: arbreLoading, error: arbreError } = useAsync(
    () => api.arbre(currentId, ancetres, descendants),
    [currentId, ancetres, descendants],
  );

  const { data: personne, loading: personneLoading } = useAsync(
    () => api.personne(currentId),
    [currentId],
  );

  const goToPerson = useCallback(
    (id: string) => {
      setSearchParams({ id: normalizeGedcomId(id) }, { replace: false });
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (!paramId && status?.id_gedcom_racine) {
      setSearchParams({ id: status.id_gedcom_racine }, { replace: true });
    }
  }, [paramId, status?.id_gedcom_racine, setSearchParams]);

  useEffect(() => {
    setSiblingIdx(0);
  }, [currentId]);

  useKeyboardNav({
    onHome: () => goToPerson(rootId),
    onParent: () => {
      const next = pickNavTarget(personne, "parent");
      if (next) goToPerson(next);
    },
    onChild: () => {
      const next = pickNavTarget(personne, "child");
      if (next) goToPerson(next);
    },
    onSiblingPrev: () => {
      const next = pickNavTarget(personne, "siblingPrev", siblingIdx);
      if (next) {
        goToPerson(next);
        setSiblingIdx((i) => i - 1);
      }
    },
    onSiblingNext: () => {
      const next = pickNavTarget(personne, "siblingNext", siblingIdx);
      if (next) {
        goToPerson(next);
        setSiblingIdx((i) => i + 1);
      }
    },
    onSpouseNext: () => {
      const next = pickNavTarget(personne, "spouse");
      if (next) goToPerson(next);
    },
  });

  const handleActeClick = useCallback(
    (type: ActeType, url: string, name = "Personne") => {
      setActeModal({ type, url, name });
    },
    [],
  );

  const controls = useMemo(
    () => (
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-slate-500">Ancêtres</span>
          <input
            type="range"
            min={0}
            max={8}
            value={ancetres}
            onChange={(e) => setAncetres(Number(e.target.value))}
            className="w-24"
          />
          <span className="w-4 font-medium">{ancetres}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-slate-500">Descendants</span>
          <input
            type="range"
            min={0}
            max={6}
            value={descendants}
            onChange={(e) => setDescendants(Number(e.target.value))}
            className="w-24"
          />
          <span className="w-4 font-medium">{descendants}</span>
        </label>
        <button
          type="button"
          onClick={() => goToPerson(rootId)}
          className="ml-auto rounded-lg bg-sky-700 px-3 py-1.5 text-white hover:bg-sky-800"
          title="Retour à la souche"
        >
          ⌂ Souche
        </button>
      </div>
    ),
    [ancetres, descendants, goToPerson, rootId],
  );

  return (
    <div className="space-y-3">
      {controls}

      {arbreLoading && (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
          Chargement de l'arbre…
        </p>
      )}

      {arbreError && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {arbreError}
        </p>
      )}

      {arbre && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <TreeView
            arbre={arbre as ArbreResponse}
            selectedId={currentId}
            onSelect={goToPerson}
            onActeClick={handleActeClick}
          />
          <PersonPanel
            personne={personne as PersonneDetail | null}
            loading={personneLoading}
            onActeClick={handleActeClick}
            onNavigate={goToPerson}
          />
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
    </div>
  );
}
