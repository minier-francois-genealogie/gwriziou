import { useEffect, useState, type ReactNode } from "react";
import { isIos, isPwaTestMode, requiresTouchPwa } from "../utils/pwaMode";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function MobileInstallScreen() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const ios = isIos();

  useEffect(() => {
    const onInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <div className="flex h-dvh flex-col items-center justify-center bg-slate-100 px-6 text-center">
      <img
        src="/icon-192.png"
        alt=""
        className="mb-5 h-24 w-24 rounded-2xl shadow-md"
        aria-hidden="true"
      />
      <h1 className="text-xl font-bold text-sky-900">Gwriziou</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
        Sur téléphone ou tablette, ouvrez Gwriziou depuis l&apos;icône installée sur votre
        écran d&apos;accueil.
      </p>

      {ios ? (
        <ol className="mt-6 max-w-sm space-y-2 text-left text-sm text-slate-700">
          <li>
            1. Touchez <strong>Partager</strong>{" "}
            <span aria-hidden="true">⎋</span> (Safari)
          </li>
          <li>
            2. Choisissez <strong>Sur l&apos;écran d&apos;accueil</strong>
          </li>
          <li>
            3. Touchez <strong>Ajouter</strong>, puis ouvrez Gwriziou via l&apos;icône
          </li>
        </ol>
      ) : deferred ? (
        <button
          type="button"
          onClick={() => void install()}
          className="mt-6 rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-800"
        >
          Installer Gwriziou
        </button>
      ) : (
        <p className="mt-6 max-w-sm text-sm text-slate-500">
          Utilisez le menu du navigateur (Chrome : ⋮ → <strong>Installer l&apos;application</strong>
          ), puis relancez depuis l&apos;écran d&apos;accueil.
        </p>
      )}

      {isPwaTestMode() && (
        <p className="mt-8 max-w-sm text-xs text-slate-400">
          Mode test (<code className="rounded bg-slate-200 px-1">?pwa_test=block</code>
          ). App normale :{" "}
          <code className="rounded bg-slate-200 px-1">?pwa_test=allow</code>
        </p>
      )}
    </div>
  );
}

export function MobilePwaGate({ children }: { children: ReactNode }) {
  if (requiresTouchPwa()) {
    return <MobileInstallScreen />;
  }
  return children;
}
