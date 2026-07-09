import { useOrientationPortrait } from "../hooks/useOrientationPortrait";
import { isTouchDevice } from "../utils/pwaMode";

function RotatePhoneIcon() {
  return (
    <svg
      className="h-16 w-16 text-sky-200"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="18" y="8" width="28" height="48" rx="4" />
      <circle cx="32" cy="50" r="2" fill="currentColor" stroke="none" />
      <path
        d="M48 20a12 12 0 1 1-4 9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M48 14v6h-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Invite l'utilisateur à passer en paysage sur téléphone / tablette. */
export function PortraitRotateOverlay() {
  const portrait = useOrientationPortrait();

  if (!isTouchDevice() || !portrait) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-sky-950 px-8 text-center text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rotate-title"
      aria-describedby="rotate-desc"
    >
      <RotatePhoneIcon />
      <h2 id="rotate-title" className="mt-6 text-lg font-semibold">
        Passez en mode paysage
      </h2>
      <p id="rotate-desc" className="mt-3 max-w-xs text-sm leading-relaxed text-sky-100">
        Gwriziou est conçu pour le mode paysage sur téléphone et tablette. Tournez
        votre appareil pour continuer.
      </p>
    </div>
  );
}
