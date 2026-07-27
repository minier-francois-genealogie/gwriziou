import { useEffect, useState } from "react";
import { reloadPwaUpdate } from "../registerPwa";

export function PwaUpdateBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onUpdate = () => setShow(true);
    window.addEventListener("gwriziou-pwa-update", onUpdate);
    return () => window.removeEventListener("gwriziou-pwa-update", onUpdate);
  }, []);

  if (!show) return null;

  return (
    <div className="pointer-events-auto absolute inset-x-0 top-0 z-[100] border-b border-sky-200 bg-sky-50 px-3 py-2 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2 text-sm text-sky-950">
        <span>Une nouvelle version de Gwriziou est disponible.</span>
        <button
          type="button"
          onClick={() => void reloadPwaUpdate()}
          className="rounded-lg bg-sky-700 px-3 py-1.5 font-medium text-white hover:bg-sky-800"
        >
          Mettre à jour
        </button>
        <button
          type="button"
          onClick={() => setShow(false)}
          className="rounded-lg px-2 py-1.5 text-sky-700 hover:bg-sky-100"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
