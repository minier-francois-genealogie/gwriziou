import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadTreeViewBoxZoom, saveTreeViewBoxZoom } from "../utils/appStorage";

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Zoom conservé entre rechargements d'arbre et entre sessions (localStorage). */
let persistedViewBox: ViewBox | null = (() => {
  const saved = loadTreeViewBoxZoom();
  return saved ? { x: 0, y: 0, w: saved.w, h: saved.h } : null;
})();

export function hasSavedTreeZoom(): boolean {
  return persistedViewBox != null;
}

interface UseSvgViewportOptions {
  contentWidth: number;
  contentHeight: number;
  enabled?: boolean;
  /** Molette : zoom si true, sinon ignorée (déplacement seul au glisser). */
  wheelZoom?: boolean;
  /** Pincement à deux doigts : zoom si true. */
  pinchZoom?: boolean;
  /** Clic court sur une cellule `[data-person-id]` (sans drag). */
  onPersonTap?: (id: string) => void;
}

/** Même logique que preserveAspectRatio="xMidYMid meet" sur un SVG viewBox. */
function getSvgViewportMapping(
  containerW: number,
  containerH: number,
  vb: ViewBox,
): { scale: number; padX: number; padY: number } {
  const scale = Math.min(
    containerW / Math.max(vb.w, 1e-6),
    containerH / Math.max(vb.h, 1e-6),
  );
  return {
    scale,
    padX: (containerW - vb.w * scale) / 2,
    padY: (containerH - vb.h * scale) / 2,
  };
}

export function useSvgViewport({
  contentWidth,
  contentHeight,
  enabled = true,
  wheelZoom = false,
  pinchZoom: _pinchZoom = false,
  onPersonTap,
}: UseSvgViewportOptions) {
  void _pinchZoom;
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState<ViewBox>(() => {
    if (persistedViewBox) {
      return { ...persistedViewBox };
    }
    return {
      x: 0,
      y: 0,
      w: Math.max(contentWidth, 1),
      h: Math.max(contentHeight, 1),
    };
  });
  const [containerSize, setContainerSize] = useState({ w: 1, h: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef<{
    x: number;
    y: number;
    vb: ViewBox;
    pid: number;
    moved: boolean;
    target: EventTarget | null;
  } | null>(null);
  const viewBoxRef = useRef(viewBox);
  const animFrameRef = useRef<number | null>(null);
  const onPersonTapRef = useRef(onPersonTap);

  viewBoxRef.current = viewBox;
  onPersonTapRef.current = onPersonTap;

  const PAN_DRAG_THRESHOLD_PX = 6;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setContainerSize({
        w: Math.max(el.clientWidth, 1),
        h: Math.max(el.clientHeight, 1),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cancelPanAnimation = useCallback(() => {
    if (animFrameRef.current != null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  useEffect(() => () => cancelPanAnimation(), [cancelPanAnimation]);

  useEffect(() => {
    persistedViewBox = viewBox;
  }, [viewBox]);

  useEffect(() => {
    saveTreeViewBoxZoom({ w: viewBox.w, h: viewBox.h });
  }, [viewBox.w, viewBox.h]);

  const clampViewBox = useCallback(
    (vb: ViewBox): ViewBox => {
      const minW = Math.min(contentWidth, 120);
      const minH = Math.min(contentHeight, 80);
      const w = Math.max(minW, Math.min(contentWidth * 3, vb.w));
      const h = Math.max(minH, Math.min(contentHeight * 3, vb.h));
      // Marge = une demi-fenêtre : on peut sortir un peu du contenu sans se bloquer.
      const marginX = w * 0.5;
      const marginY = h * 0.5;
      const x = Math.max(-marginX, Math.min(contentWidth - w + marginX, vb.x));
      const y = Math.max(-marginY, Math.min(contentHeight - h + marginY, vb.y));
      return { x, y, w, h };
    },
    [contentWidth, contentHeight],
  );

  useEffect(() => {
    if (!enabled) return;
    setViewBox((vb) =>
      clampViewBox({
        x: vb.x,
        y: vb.y,
        w: vb.w,
        h: vb.h,
      }),
    );
  }, [contentWidth, contentHeight, enabled, clampViewBox]);

  const animateViewBox = useCallback(
    (target: ViewBox, options?: { durationMs?: number; animate?: boolean }) => {
      const clampedTarget = clampViewBox(target);

      if (options?.animate === false) {
        cancelPanAnimation();
        setViewBox(clampedTarget);
        return;
      }

      cancelPanAnimation();
      const start = viewBoxRef.current;
      const durationMs = options?.durationMs ?? 280;
      const startTime = performance.now();
      const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

      const tick = (now: number) => {
        const progress = Math.min(1, (now - startTime) / durationMs);
        const eased = easeOutCubic(progress);
        setViewBox(
          clampViewBox({
            x: start.x + (clampedTarget.x - start.x) * eased,
            y: start.y + (clampedTarget.y - start.y) * eased,
            w: start.w + (clampedTarget.w - start.w) * eased,
            h: start.h + (clampedTarget.h - start.h) * eased,
          }),
        );
        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          animFrameRef.current = null;
        }
      };

      animFrameRef.current = requestAnimationFrame(tick);
    },
    [cancelPanAnimation, clampViewBox],
  );

  const panTo = useCallback(
    (cx: number, cy: number, options?: { animate?: boolean }) => {
      const current = viewBoxRef.current;
      animateViewBox(
        {
          ...current,
          x: cx - current.w / 2,
          y: cy - current.h / 2,
        },
        options,
      );
    },
    [animateViewBox],
  );

  const recenterOn = useCallback(
    (cx: number, cy: number, zoomFactor = 0.55, options?: { animate?: boolean }) => {
      const el = containerRef.current;
      const aspect = el ? el.clientHeight / Math.max(el.clientWidth, 1) : 0.65;
      const w = contentWidth * zoomFactor;
      const h = w * aspect;
      animateViewBox(
        {
          x: cx - w / 2,
          y: cy - h / 2,
          w,
          h,
        },
        { ...options, durationMs: 380 },
      );
    },
    [animateViewBox, contentWidth],
  );

  const fitAll = useCallback(() => {
    cancelPanAnimation();
    setViewBox({
      x: 0,
      y: 0,
      w: Math.max(contentWidth, 1),
      h: Math.max(contentHeight, 1),
    });
  }, [cancelPanAnimation, contentWidth, contentHeight]);

  const zoomBy = useCallback(
    (factor: number) => {
      if (!enabled) return;
      cancelPanAnimation();
      const vb = viewBoxRef.current;
      const mx = vb.x + vb.w / 2;
      const my = vb.y + vb.h / 2;
      const nw = vb.w * factor;
      const nh = vb.h * factor;
      setViewBox(
        clampViewBox({
          w: nw,
          h: nh,
          x: mx - (mx - vb.x) * (nw / vb.w),
          y: my - (my - vb.y) * (nh / vb.h),
        }),
      );
    },
    [cancelPanAnimation, clampViewBox, enabled],
  );

  const zoomIn = useCallback(() => zoomBy(0.88), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1.12), [zoomBy]);

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    const blockWheelZoom = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!wheelZoom) return;

      cancelPanAnimation();
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const vb = viewBoxRef.current;
      const mx = ((e.clientX - rect.left) / rect.width) * vb.w + vb.x;
      const my = ((e.clientY - rect.top) / rect.height) * vb.h + vb.y;
      const factor = e.deltaY > 0 ? 1.12 : 0.88;
      setViewBox(
        clampViewBox({
          w: vb.w * factor,
          h: vb.h * factor,
          x: mx - (mx - vb.x) * ((vb.w * factor) / vb.w),
          y: my - (my - vb.y) * ((vb.h * factor) / vb.h),
        }),
      );
    };

    const blockGesture = (e: Event) => {
      e.preventDefault();
    };

    el.addEventListener("wheel", blockWheelZoom, { passive: false });
    el.addEventListener("gesturestart", blockGesture);
    el.addEventListener("gesturechange", blockGesture);
    el.addEventListener("gestureend", blockGesture);

    return () => {
      el.removeEventListener("wheel", blockWheelZoom);
      el.removeEventListener("gesturestart", blockGesture);
      el.removeEventListener("gesturechange", blockGesture);
      el.removeEventListener("gestureend", blockGesture);
    };
  }, [cancelPanAnimation, clampViewBox, enabled, wheelZoom]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const detachWindowPanListeners = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      detachWindowPanListeners.current?.();
      detachWindowPanListeners.current = null;
    };
  }, []);

  /**
   * Pan via listeners sur window (pas de setPointerCapture).
   * Pattern fiable pour enchaîner plusieurs glisser-déposer à la souris.
   */
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || e.button !== 0) return;
      // Un seul pan à la fois
      detachWindowPanListeners.current?.();
      detachWindowPanListeners.current = null;

      cancelPanAnimation();
      const target = e.target;
      if (target instanceof Element && target.closest("[data-tree-interactive]")) {
        return;
      }

      const pointerId = e.pointerId;
      let originX = e.clientX;
      let originY = e.clientY;
      let originVb = { ...viewBoxRef.current };
      const tapTarget = e.target;
      let moved = false;

      panRef.current = {
        x: originX,
        y: originY,
        vb: originVb,
        pid: pointerId,
        moved: false,
        target: tapTarget,
      };
      setIsPanning(true);

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const dist = Math.hypot(ev.clientX - originX, ev.clientY - originY);
        if (!moved && dist < PAN_DRAG_THRESHOLD_PX) return;
        moved = true;
        if (panRef.current) panRef.current.moved = true;

        const el = containerRef.current;
        if (!el) return;
        const dx = ev.clientX - originX;
        const dy = ev.clientY - originY;
        const { scale } = getSvgViewportMapping(
          el.clientWidth,
          el.clientHeight,
          originVb,
        );
        const desired = {
          ...originVb,
          x: originVb.x - dx / scale,
          y: originVb.y - dy / scale,
        };
        const clamped = clampViewBox(desired);
        setViewBox(clamped);

        // Au bord du clamp : recentrer l'origine souris pour éviter une zone morte
        // (sinon il faut « remonter » tout le surplus avant que le pan reparte).
        if (clamped.x !== desired.x || clamped.y !== desired.y) {
          originX = ev.clientX;
          originY = ev.clientY;
          originVb = { ...clamped };
          if (panRef.current) {
            panRef.current.x = originX;
            panRef.current.y = originY;
            panRef.current.vb = originVb;
          }
        }
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        detachWindowPanListeners.current?.();
        detachWindowPanListeners.current = null;

        const wasTap = !moved;
        panRef.current = null;
        setIsPanning(false);

        if (wasTap && tapTarget instanceof Element) {
          const person = tapTarget.closest("[data-person-id]");
          const id = person?.getAttribute("data-person-id");
          if (id) onPersonTapRef.current?.(id);
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      detachWindowPanListeners.current = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
    },
    [cancelPanAnimation, clampViewBox, enabled],
  );

  /**
   * Pan/zoom via CSS transform (viewBox SVG fixe).
   * Safari iOS ne resynchronise pas les foreignObject quand le viewBox change ;
   * transformer le SVG HTML entier déplace traits + cellules ensemble.
   */
  const svgTransform = useMemo(() => {
    const { scale, padX, padY } = getSvgViewportMapping(
      containerSize.w,
      containerSize.h,
      viewBox,
    );
    return `translate(${padX - viewBox.x * scale}px, ${padY - viewBox.y * scale}px) scale(${scale})`;
  }, [containerSize.h, containerSize.w, viewBox]);

  return {
    containerRef,
    viewBox,
    svgTransform,
    recenterOn,
    panTo,
    fitAll,
    zoomIn,
    zoomOut,
    onWheel,
    onPointerDown,
    isPanning,
  };
}
