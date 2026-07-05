/** App ouverte depuis l’écran d’accueil (PWA), pas dans le navigateur. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (pwaTestMode() === "allow") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  if (pwaIosTestMode()) return true;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Téléphone ou tablette tactile (pas desktop souris/clavier). */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  if (pwaTestMode() === "block") return true;
  const ua = navigator.userAgent;
  if (/iPhone|iPod|iPad/.test(ua)) return true;
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  if (/Android/i.test(ua)) return true;
  return (
    window.matchMedia("(pointer: coarse)").matches &&
    window.matchMedia("(hover: none)").matches &&
    window.matchMedia("(max-width: 1024px)").matches
  );
}

type PwaTestMode = "block" | "allow";

/** ?pwa_test=block simule le blocage ; ?pwa_test=allow simule l’app installée. */
function pwaTestMode(): PwaTestMode | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("pwa_test");
  if (v === "1" || v === "block" || v === "gate") return "block";
  if (v === "allow" || v === "standalone") return "allow";
  return null;
}

/** ?pwa_ios=1 affiche les instructions iOS (test desktop). */
function pwaIosTestMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("pwa_ios") === "1";
}

export function isPwaTestMode(): boolean {
  return pwaTestMode() === "block";
}

/** Blocage navigateur sur mobile/tablette sauf en dev ou si désactivé au build. */
export function requiresTouchPwa(): boolean {
  const test = pwaTestMode();
  if (test === "block") return true;
  if (test === "allow") return false;
  if (import.meta.env.DEV) return false;
  if (import.meta.env.VITE_REQUIRE_PWA_MOBILE === "false") return false;
  return isTouchDevice() && !isStandalone();
}
