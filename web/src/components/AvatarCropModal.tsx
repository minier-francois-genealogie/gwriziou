import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import { LoadingSpinner } from "./LoadingSpinner";

const OUT_SIZE = 256;

interface AvatarCropModalProps {
  idGedcom: string;
  personName: string;
  onClose: () => void;
  onSaved: (url: string) => void;
}

export function AvatarCropModal({
  idGedcom,
  personName,
  onClose,
  onSaved,
}: AvatarCropModalProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [src]);

  const onFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choisissez une image (JPEG ou PNG).");
      return;
    }
    setError(null);
    if (src) URL.revokeObjectURL(src);
    const url = URL.createObjectURL(file);
    setSrc(url);
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const onImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    // Remplir le cadre carré
    const frame = frameRef.current?.clientWidth || 240;
    const fit = Math.max(frame / img.naturalWidth, frame / img.naturalHeight);
    setScale(fit);
    setOffset({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!src) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setDragging(false);
    dragStart.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const exportJpeg = useCallback((): string | null => {
    const img = imgRef.current;
    const frame = frameRef.current;
    if (!img || !frame || !natural.w) return null;
    const frameSize = frame.clientWidth;
    const canvas = document.createElement("canvas");
    canvas.width = OUT_SIZE;
    canvas.height = OUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Image affichée : centrée dans le cadre + offset + scale
    const dispW = natural.w * scale;
    const dispH = natural.h * scale;
    const left = (frameSize - dispW) / 2 + offset.x;
    const top = (frameSize - dispH) / 2 + offset.y;
    const ratio = OUT_SIZE / frameSize;

    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(0, 0, OUT_SIZE, OUT_SIZE);
    ctx.drawImage(
      img,
      left * ratio,
      top * ratio,
      dispW * ratio,
      dispH * ratio,
    );
    return canvas.toDataURL("image/jpeg", 0.88);
  }, [natural.h, natural.w, offset.x, offset.y, scale]);

  const handleSave = async () => {
    const dataUrl = exportJpeg();
    if (!dataUrl) {
      setError("Impossible de générer l'avatar.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await api.uploadAvatar(idGedcom, dataUrl);
      onSaved(res.url);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Avatar — ${personName}`}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Avatar</h2>
            <p className="text-sm text-slate-500">{personName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Fermer
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />

        {!src ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-60 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm text-slate-600 hover:border-slate-400 hover:bg-slate-100"
          >
            <span className="text-2xl font-light text-slate-400">+</span>
            Choisir une photo
          </button>
        ) : (
          <>
            <div
              ref={frameRef}
              className="relative mx-auto aspect-square w-60 touch-none overflow-hidden rounded-full bg-slate-200 ring-2 ring-slate-300"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <img
                ref={imgRef}
                src={src}
                alt=""
                onLoad={onImgLoad}
                draggable={false}
                className="pointer-events-none absolute max-w-none select-none"
                style={{
                  width: natural.w ? natural.w * scale : "auto",
                  height: natural.h ? natural.h * scale : "auto",
                  left: "50%",
                  top: "50%",
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                }}
              />
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              Zoom
              <input
                type="range"
                min={0.2}
                max={3}
                step={0.02}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="flex-1"
              />
            </label>
            <p className="mt-1 text-xs text-slate-400">
              Glisser pour cadrer · enregistré en JPEG type A dans documents/
            </p>
          </>
        )}

        {error && (
          <p className="mt-2 rounded-md bg-red-50 px-2 py-1.5 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          {src && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              disabled={saving}
            >
              Autre photo
            </button>
          )}
          <button
            type="button"
            disabled={!src || saving}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving && <LoadingSpinner variant="inline" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
