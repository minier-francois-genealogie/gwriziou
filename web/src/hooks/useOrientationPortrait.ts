import { useEffect, useState } from "react";

/** True when the viewport is in portrait orientation. */
export function useOrientationPortrait(): boolean {
  const [portrait, setPortrait] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(orientation: portrait)").matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const update = () => setPortrait(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return portrait;
}
