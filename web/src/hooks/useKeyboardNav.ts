import { useCallback, useEffect } from "react";
import type { PersonneDetail } from "../types/api";

interface KeyboardNavHandlers {
  onHome: () => void;
  onParent?: () => void;
  onChild?: () => void;
  onSiblingPrev?: () => void;
  onSiblingNext?: () => void;
  onSpouseNext?: () => void;
}

export function useKeyboardNav(handlers: KeyboardNavHandlers) {
  const handleKey = useCallback(
    (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (event.key) {
        case "Home":
          event.preventDefault();
          handlers.onHome();
          break;
        case "ArrowUp":
          event.preventDefault();
          handlers.onParent?.();
          break;
        case "ArrowDown":
          event.preventDefault();
          handlers.onChild?.();
          break;
        case "ArrowLeft":
          event.preventDefault();
          handlers.onSiblingPrev?.();
          break;
        case "ArrowRight":
          event.preventDefault();
          handlers.onSiblingNext?.();
          break;
        case "Tab":
          if (event.shiftKey) break;
          if (handlers.onSpouseNext) {
            event.preventDefault();
            handlers.onSpouseNext();
          }
          break;
      }
    },
    [handlers],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);
}

export function pickNavTarget(
  personne: PersonneDetail | null,
  direction: "parent" | "child" | "siblingPrev" | "siblingNext" | "spouse",
  siblingIndex = 0,
): string | null {
  if (!personne) return null;
  const { relations } = personne;

  switch (direction) {
    case "parent":
      return relations.parents[0]?.id_gedcom ?? null;
    case "child":
      return relations.enfants[0]?.id_gedcom ?? null;
    case "siblingPrev": {
      const sibs = relations.fratrie;
      if (sibs.length === 0) return null;
      const idx = ((siblingIndex - 1) % sibs.length + sibs.length) % sibs.length;
      return sibs[idx]!.id_gedcom;
    }
    case "siblingNext": {
      const sibs = relations.fratrie;
      if (sibs.length === 0) return null;
      const idx = siblingIndex % sibs.length;
      return sibs[idx]!.id_gedcom;
    }
    case "spouse":
      return relations.conjoints[0]?.id_gedcom ?? null;
  }
}
