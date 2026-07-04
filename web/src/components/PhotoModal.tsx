import { useCallback, useEffect, useState } from "react";
import type { PhotoPersonne } from "../types/api";

interface PhotoModalProps {
  photos: PhotoPersonne[];
  personName: string;
  onClose: () => void;
}

export function PhotoModal({ photos, personName, onClose }: PhotoModalProps) {
  const [index, setIndex] = useState(0);
  const total = photos.length;
  const current = photos[index];

  const goPrev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : total - 1));
  }, [total]);

  const goNext = useCallback(() => {
    setIndex((i) => (i < total - 1 ? i + 1 : 0));
  }, [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goPrev, goNext]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/85 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Photos — ${personName}`}
      onClick={onClose}
    >
      <header
        className="mb-2 flex shrink-0 items-center justify-between gap-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-sm text-slate-300">Photos</p>
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
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {total > 1 && (
          <button
            type="button"
            onClick={goPrev}
            aria-label="Photo précédente"
            className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 sm:left-3"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <div className="flex max-h-full max-w-full flex-col items-center gap-2 px-10 sm:px-14">
          <img
            src={current.url}
            alt={current.suffixe ?? `Photo — ${personName}`}
            className="max-h-[calc(100vh-8rem)] max-w-full object-contain shadow-2xl"
          />
          {(current.suffixe || total > 1) && (
            <p className="text-center text-sm text-slate-300">
              {total > 1 && <span>{index + 1} / {total}</span>}
              {current.suffixe && total > 1 && " — "}
              {current.suffixe}
            </p>
          )}
        </div>
        {total > 1 && (
          <button
            type="button"
            onClick={goNext}
            aria-label="Photo suivante"
            className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 sm:right-3"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
