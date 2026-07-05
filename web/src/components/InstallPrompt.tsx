import { useEffect, useState } from "react";
import { isIos, isTouchDevice, isStandalone } from "../utils/pwaMode";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem("gwriziou-install-dismissed") === "1",
  );
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const onInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);

  if (isStandalone() || dismissed || isTouchDevice()) return null;

  const dismiss = () => {
    sessionStorage.setItem("gwriziou-install-dismissed", "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  if (deferred) {
    return (
      <div className="border-b border-sky-200 bg-sky-50 px-3 py-2 sm:px-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2 text-sm text-sky-950">
          <span>Utiliser Gwriziou en plein écran, comme une application.</span>
          <button
            type="button"
            onClick={() => void install()}
            className="rounded-lg bg-sky-700 px-3 py-1.5 font-medium text-white hover:bg-sky-800"
          >
            Installer
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg px-2 py-1.5 text-sky-700 hover:bg-sky-100"
          >
            Plus tard
          </button>
        </div>
      </div>
    );
  }

  if (isIos()) {
    return (
      <div className="border-b border-sky-200 bg-sky-50 px-3 py-2 sm:px-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2 text-sm text-sky-950">
          {!showIosHelp ? (
            <>
              <span>Sur iPhone/iPad : ajoutez Gwriziou à l’écran d’accueil pour le plein écran.</span>
              <button
                type="button"
                onClick={() => setShowIosHelp(true)}
                className="rounded-lg bg-sky-700 px-3 py-1.5 font-medium text-white hover:bg-sky-800"
              >
                Comment faire
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg px-2 py-1.5 text-sky-700 hover:bg-sky-100"
              >
                OK
              </button>
            </>
          ) : (
            <p className="text-center leading-snug">
              Touchez <strong>Partager</strong> <span aria-hidden="true">⎋</span> en bas de Safari, puis{" "}
              <strong>Sur l’écran d’accueil</strong> → <strong>Ajouter</strong>.
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
