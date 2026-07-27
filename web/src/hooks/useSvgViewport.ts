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
}

export function useSvgViewport({
  contentWidth,
  contentHeight,
  enabled = true,
  wheelZoom = false,
  pinchZoom = false,
}: UseSvgViewportOptions) {
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
  const panRef = useRef<{ x: number; y: number; vb: ViewBox; pid: number } | null>(
    null,
  );
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const viewBoxRef = useRef(viewBox);
  const animFrameRef = useRef<number | null>(null);

  viewBoxRef.current = viewBox;

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
      const x = Math.max(-contentWidth * 0.5, Math.min(contentWidth, vb.x));
      const y = Math.max(-contentHeight * 0.5, Math.min(contentHeight, vb.y));
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

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      cancelPanAnimation();
      const target = e.target;
      if (target instanceof Element && target.closest("[data-tree-interactive]")) {
        return;
      }
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointersRef.current.size === 1 && e.button === 0) {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        panRef.current = { x: e.clientX, y: e.clientY, vb: viewBox, pid: e.pointerId };
        setIsPanning(true);
      }
    },
    [cancelPanAnimation, enabled, viewBox],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      if (pointersRef.current.has(e.pointerId)) {
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (pointersRef.current.size === 2) {
        if (!pinchZoom) return;
        const pts = [...pointersRef.current.values()];
        const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
        const el = containerRef.current;
        if (!el) return;
        const midX = (pts[0]!.x + pts[1]!.x) / 2;
        const midY = (pts[0]!.y + pts[1]!.y) / 2;
        const prev = panRef.current;
        if (prev && "pinchDist" in prev && typeof prev.pinchDist === "number") {
          const factor = prev.pinchDist / dist;
          const rect = el.getBoundingClientRect();
          const mx = ((midX - rect.left) / rect.width) * prev.vb.w + prev.vb.x;
          const my = ((midY - rect.top) / rect.height) * prev.vb.h + prev.vb.y;
          setViewBox((vb) => {
            const nw = vb.w * factor;
            const nh = vb.h * factor;
            return clampViewBox({
              w: nw,
              h: nh,
              x: mx - (mx - vb.x) * (nw / vb.w),
              y: my - (my - vb.y) * (nh / vb.h),
            });
          });
        }
        panRef.current = {
          x: midX,
          y: midY,
          vb: viewBox,
          pid: -1,
          pinchDist: dist,
        } as typeof panRef.current & { pinchDist: number };
        return;
      }

      // Sur iOS Safari, `buttons` peut rester à 0 pendant le drag tactile.
      if (panRef.current && panRef.current.pid === e.pointerId) {
        const el = containerRef.current;
        if (!el) return;
        const dx = e.clientX - panRef.current.x;
        const dy = e.clientY - panRef.current.y;
        const vb = panRef.current.vb;
        const scaleX = vb.w / el.clientWidth;
        const scaleY = vb.h / el.clientHeight;
        setViewBox(
          clampViewBox({
            ...vb,
            x: vb.x - dx * scaleX,
            y: vb.y - dy * scaleY,
          }),
        );
      }
    },
    [clampViewBox, enabled, pinchZoom, viewBox],
  );

  const endPan = useCallback((e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size === 0) {
      panRef.current = null;
      setIsPanning(false);
    }
  }, []);

  const onPointerUp = endPan;

  /**
   * Pan/zoom via CSS transform (viewBox SVG fixe).
   * Safari iOS ne resynchronise pas les foreignObject quand le viewBox change ;
   * transformer le SVG HTML entier déplace traits + cellules ensemble.
   */
  const svgTransform = useMemo(() => {
    const sx = containerSize.w / Math.max(viewBox.w, 1e-6);
    const sy = containerSize.h / Math.max(viewBox.h, 1e-6);
    return `translate(${-viewBox.x * sx}px, ${-viewBox.y * sy}px) scale(${sx}, ${sy})`;
  }, [containerSize.h, containerSize.w, viewBox.h, viewBox.w, viewBox.x, viewBox.y]);

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
    onPointerMove,
    onPointerUp,
    isPanning,
  };
}
