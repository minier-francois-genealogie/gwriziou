import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const GAP = 6;
const MARGIN = 8;

type TooltipAlign = "center" | "start" | "end";

export interface FloatingTooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  maxWidth?: number;
  multiline?: boolean;
  align?: TooltipAlign;
  disabled?: boolean;
}

function hasContent(content: ReactNode): boolean {
  return content != null && content !== "";
}

function computePosition(
  rect: DOMRect,
  maxWidth: number,
  align: TooltipAlign,
): { x: number; y: number; transform: string } {
  const y = rect.top - GAP;

  if (align === "start") {
    const x = Math.max(MARGIN, Math.min(window.innerWidth - MARGIN - maxWidth, rect.left));
    return { x, y, transform: "translate(0, -100%)" };
  }

  if (align === "end") {
    const x = Math.max(
      MARGIN + maxWidth,
      Math.min(window.innerWidth - MARGIN, rect.right),
    );
    return { x, y, transform: "translate(-100%, -100%)" };
  }

  const centerX = rect.left + rect.width / 2;
  const half = maxWidth / 2;
  const x = Math.max(MARGIN + half, Math.min(window.innerWidth - MARGIN - half, centerX));
  return { x, y, transform: "translate(-50%, -100%)" };
}

export function FloatingTooltip({
  content,
  children,
  className = "",
  contentClassName = "",
  maxWidth = 240,
  multiline = false,
  align = "center",
  disabled = false,
}: FloatingTooltipProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, transform: "translate(-50%, -100%)" });

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    setPos(computePosition(el.getBoundingClientRect(), maxWidth, align));
  }, [align, maxWidth]);

  const show = useCallback(() => {
    if (disabled || !hasContent(content)) return;
    updatePosition();
    setVisible(true);
  }, [content, disabled, updatePosition]);

  const hide = useCallback(() => setVisible(false), []);

  useEffect(() => {
    if (!visible) return;
    const onScroll = () => hide();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", hide);
    };
  }, [visible, hide]);

  const whitespace = multiline ? "whitespace-pre-line" : "whitespace-nowrap";

  return (
    <span
      ref={anchorRef}
      className={`inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible &&
        createPortal(
          <div
            role="tooltip"
            className={`pointer-events-none fixed z-[3000] rounded-md bg-slate-800 px-2 py-1 text-left text-[10px] font-normal leading-snug text-white shadow-lg ${whitespace} ${contentClassName}`}
            style={{
              left: pos.x,
              top: pos.y,
              transform: pos.transform,
              maxWidth,
            }}
          >
            {content}
          </div>,
          document.body,
        )}
    </span>
  );
}
