import { registerSW } from "virtual:pwa-register";
import { isIos, isStandalone } from "./utils/pwaMode";

let reloadWithUpdate: (() => Promise<void>) | null = null;

export function reloadPwaUpdate(): Promise<void> {
  if (reloadWithUpdate) return reloadWithUpdate();
  window.location.reload();
  return Promise.resolve();
}

/** Enregistre le SW et vérifie les mises à jour (critique pour iOS écran d'accueil). */
export function registerPwa(): void {
  if (!import.meta.env.PROD) return;

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const check = () => {
        if (document.visibilityState === "visible") {
          void registration.update();
        }
      };

      check();
      document.addEventListener("visibilitychange", check);
      window.addEventListener("focus", check);
      window.setInterval(check, 60 * 60 * 1000);
    },
    onNeedRefresh() {
      reloadWithUpdate = () => updateSW(true);
      window.dispatchEvent(new CustomEvent("gwriziou-pwa-update"));
      // iOS standalone recharge mal en auto : laisser l'utilisateur confirmer.
      if (!(isIos() && isStandalone())) {
        void updateSW(true);
      }
    },
  });
}
