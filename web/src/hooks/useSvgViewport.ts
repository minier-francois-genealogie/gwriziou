import { useCallback, useEffect, useRef, useState } from "react";

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface UseSvgViewportOptions {
  contentWidth: number;
  contentHeight: number;
  enabled?: boolean;
}

export function useSvgViewport({
  contentWidth,
  contentHeight,
  enabled = true,
}: UseSvgViewportOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState<ViewBox>(() => ({
    x: 0,
    y: 0,
    w: Math.max(contentWidth, 1),
    h: Math.max(contentHeight, 1),
  }));
  const panRef = useRef<{ x: number; y: number; vb: ViewBox; pid: number } | null>(
    null,
  );
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());

  useEffect(() => {
    if (!enabled) return;
    setViewBox({
      x: 0,
      y: 0,
      w: Math.max(contentWidth, 1),
      h: Math.max(contentHeight, 1),
    });
  }, [contentWidth, contentHeight, enabled]);

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

  const recenterOn = useCallback(
    (cx: number, cy: number, zoomFactor = 0.55) => {
      const el = containerRef.current;
      const aspect = el ? el.clientHeight / Math.max(el.clientWidth, 1) : 0.65;
      const w = contentWidth * zoomFactor;
      const h = w * aspect;
      setViewBox(
        clampViewBox({
          x: cx - w / 2,
          y: cy - h / 2,
          w,
          h,
        }),
      );
    },
    [clampViewBox, contentWidth],
  );

  const fitAll = useCallback(() => {
    setViewBox({
      x: 0,
      y: 0,
      w: Math.max(contentWidth, 1),
      h: Math.max(contentHeight, 1),
    });
  }, [contentWidth, contentHeight]);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!enabled) return;
      e.preventDefault();
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * viewBox.w + viewBox.x;
      const my = ((e.clientY - rect.top) / rect.height) * viewBox.h + viewBox.y;
      const factor = e.deltaY > 0 ? 1.12 : 0.88;
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
    },
    [clampViewBox, enabled, viewBox],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointersRef.current.size === 1 && e.button === 0) {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        panRef.current = { x: e.clientX, y: e.clientY, vb: viewBox, pid: e.pointerId };
      }
    },
    [enabled, viewBox],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      if (pointersRef.current.has(e.pointerId)) {
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (pointersRef.current.size === 2) {
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

      if (panRef.current && panRef.current.pid === e.pointerId && e.buttons === 1) {
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
    [clampViewBox, enabled, viewBox],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size === 0) panRef.current = null;
  }, []);

  const viewBoxString = `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;

  return {
    containerRef,
    viewBox,
    viewBoxString,
    recenterOn,
    fitAll,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
