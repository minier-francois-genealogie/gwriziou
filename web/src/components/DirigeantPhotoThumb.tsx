import { useRef, useState } from "react";
import { createPortal } from "react-dom";

const PHOTO_PREVIEW_W = 220;
const PHOTO_PREVIEW_H = 280;

interface DirigeantPhotoThumbProps {
  src: string;
  alt: string;
  className?: string;
}

export function DirigeantPhotoThumb({
  src,
  alt,
  className = "h-14 w-11 cursor-zoom-in rounded object-cover object-top shadow-sm",
}: DirigeantPhotoThumbProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null);

  const showPreview = () => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 8;
    let x = rect.right + margin;
    if (x + PHOTO_PREVIEW_W > window.innerWidth - margin) {
      x = rect.left - PHOTO_PREVIEW_W - margin;
    }
    let y = rect.top;
    if (y + PHOTO_PREVIEW_H > window.innerHeight - margin) {
      y = Math.max(margin, window.innerHeight - PHOTO_PREVIEW_H - margin);
    }
    setPreview({ x, y });
  };

  return (
    <span
      ref={anchorRef}
      className="inline-block"
      onMouseEnter={showPreview}
      onMouseLeave={() => setPreview(null)}
      onFocus={showPreview}
      onBlur={() => setPreview(null)}
    >
      <img src={src} alt={alt} className={className} loading="lazy" />
      {preview &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[2000] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            style={{ left: preview.x, top: preview.y, width: PHOTO_PREVIEW_W }}
            role="tooltip"
            aria-hidden="true"
          >
            <img src={src} alt="" className="h-auto w-full object-cover object-top" />
          </div>,
          document.body,
        )}
    </span>
  );
}
