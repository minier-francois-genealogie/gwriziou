import naissancePng from "../assets/icons/naissance.png";
import mariagePng from "../assets/icons/mariage.png";
import decesPng from "../assets/icons/deces.png";
import photoPng from "../assets/icons/photo.png";
import notePng from "../assets/icons/note.png";
import checkedPng from "../assets/icons/checked.png";

export type GlyphName =
  | "naissance"
  | "mariage"
  | "deces"
  | "photo"
  | "note"
  | "checked";

const GLYPH_SRC: Record<GlyphName, string> = {
  naissance: naissancePng,
  mariage: mariagePng,
  deces: decesPng,
  photo: photoPng,
  note: notePng,
  checked: checkedPng,
};

const SIZE_CLASS = {
  xs: "h-2.5 w-2.5",
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
} as const;

export type GlyphSize = keyof typeof SIZE_CLASS;

/**
 * Glyphe PNG affiché via masque CSS — la couleur vient de `currentColor`
 * (blanc sur disque actif, gris sur disque inactif).
 */
export function GlyphIcon({
  name,
  size = "sm",
  className = "",
}: {
  name: GlyphName;
  size?: GlyphSize;
  className?: string;
}) {
  return (
    <span
      className={`block shrink-0 bg-current ${SIZE_CLASS[size]} ${className}`}
      style={{
        WebkitMaskImage: `url(${GLYPH_SRC[name]})`,
        maskImage: `url(${GLYPH_SRC[name]})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
      aria-hidden="true"
    />
  );
}
