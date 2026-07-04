import { useCallback, useEffect } from "react";

interface KeyboardNavHandlers {
  onHome?: () => void;
  onParent?: () => void;
  onChild?: () => void;
  onSiblingPrev?: () => void;
  onSiblingNext?: () => void;
}

export function useKeyboardNav(handlers: KeyboardNavHandlers) {
  const handleKey = useCallback(
    (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (event.key) {
        case "Home":
          event.preventDefault();
          handlers.onHome?.();
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
      }
    },
    [handlers],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);
}
