import { registerSW } from "virtual:pwa-register";

let reloadWithUpdate: (() => Promise<void>) | null = null;

export function reloadPwaUpdate(): Promise<void> {
  if (reloadWithUpdate) return reloadWithUpdate();
  window.location.reload();
  return Promise.resolve();
}

/** Enregistre le SW et propose une mise à jour (sans rechargement auto en boucle). */
export function registerPwa(): void {
  if (!import.meta.env.PROD) return;

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const check = () => {
        if (document.visibilityState === "visible") {
          void registration.update().catch(() => {
            /* réseau / SW indisponible */
          });
        }
      };

      check();
      document.addEventListener("visibilitychange", check);
    },
    onNeedRefresh() {
      reloadWithUpdate = () => updateSW(true);
      window.dispatchEvent(new CustomEvent("gwriziou-pwa-update"));
    },
  });
}
