import { useEffect } from "react";
import type { ActeType } from "../types/api";

interface ActeModalProps {
  type: ActeType;
  url: string;
  personName: string;
  onClose: () => void;
}

const TITLES: Record<ActeType, string> = {
  naissance: "Acte de naissance",
  mariage: "Acte de mariage",
  deces: "Acte de décès",
};

export function ActeModal({ type, url, personName, onClose }: ActeModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const isPdf = url.toLowerCase().includes(".pdf");

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/85 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${TITLES[type]} — ${personName}`}
      onClick={onClose}
    >
      <header
        className="mb-2 flex shrink-0 items-center justify-between gap-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-sm text-slate-300">{TITLES[type]}</p>
          <h2 className="text-lg font-semibold">{personName}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
        >
          Fermer
        </button>
      </header>
      <div
        className="flex min-h-0 flex-1 items-center justify-center overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {isPdf ? (
          <iframe
            src={url}
            title={`${TITLES[type]} — ${personName}`}
            className="h-full w-full max-w-5xl rounded-lg bg-white"
          />
        ) : (
          <img
            src={url}
            alt={`${TITLES[type]} — ${personName}`}
            className="max-h-full max-w-full object-contain shadow-2xl"
          />
        )}
      </div>
    </div>
  );
}
