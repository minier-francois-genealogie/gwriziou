/** Surface commune des icônes inactives / absence (photo, acte, ancre…). */
export const ICON_ABSENT_SURFACE = "bg-icon-absent-bg text-icon-absent";

/** Bouton rond inactif — même rendu partout. */
export const ICON_ABSENT_BTN = `cursor-default rounded-full ${ICON_ABSENT_SURFACE}`;

export const ICON_ABSENT_BTN_HOVER =
  "hover:bg-slate-100 hover:text-slate-700";

/** Photo / note actifs — jaune ambre. */
export const ICON_ACTIVE_AMBER =
  "rounded-full border border-amber-600 bg-amber-500 text-white";
export const ICON_ACTIVE_AMBER_HOVER = "hover:bg-amber-600";

/** Checked actif — vert. */
export const ICON_ACTIVE_GREEN =
  "rounded-full border border-emerald-700 bg-emerald-600 text-white";
export const ICON_ACTIVE_GREEN_HOVER = "hover:bg-emerald-700";

/** Ancre active — noir. */
export const ICON_ACTIVE_BLACK =
  "rounded-full border border-slate-800 bg-slate-900 text-white";
