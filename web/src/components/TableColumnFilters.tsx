import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function toggleSetValue(
  current: Set<string>,
  value: string,
  setter: (next: Set<string>) => void,
) {
  const next = new Set(current);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  setter(next);
}

function filterSummary(
  options: ReadonlyArray<{ code: string; label: string }>,
  selected: Set<string>,
): string | null {
  if (selected.size === 0) return "Aucun";
  if (selected.size === options.length) return "Tous";
  return `${selected.size} sélectionné${selected.size > 1 ? "s" : ""}`;
}

function longestFilterSummary(optionsCount: number): string {
  let longest = "Tous";
  for (const text of ["Aucun", "Tous"]) {
    if (text.length > longest.length) longest = text;
  }
  for (let n = 1; n <= optionsCount; n++) {
    const text = `${n} sélectionné${n > 1 ? "s" : ""}`;
    if (text.length > longest.length) longest = text;
  }
  return longest;
}

function longestOptionLabel(
  options: ReadonlyArray<{ code: string; label: string }>,
): string {
  return options.reduce(
    (longest, opt) => (opt.label.length > longest.length ? opt.label : longest),
    "",
  );
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

const FILTER_CONTROL_BASE =
  "rounded-md border px-2 py-1 text-xs font-normal normal-case tracking-normal focus:outline-none focus:ring-2 focus:ring-sky-500/40";

const FILTER_CONTROL_FULL = `w-full min-w-[8.5rem] ${FILTER_CONTROL_BASE}`;

export function filterControlClass(active: boolean, fullWidth = true): string {
  const width = fullWidth ? FILTER_CONTROL_FULL : FILTER_CONTROL_BASE;
  return `${width} ${
    active ? "border-sky-300 bg-sky-50/50" : "border-slate-200 bg-white"
  }`;
}

export function ColumnHeader({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </span>
      {children}
    </div>
  );
}

export function ColumnHeaderSearch({
  title,
  value,
  onChange,
  placeholder,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const active = value.trim().length > 0;
  return (
    <ColumnHeader title={title}>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Rechercher…"}
        aria-label={`Filtrer ${title}`}
        className={`${filterControlClass(active)} text-slate-800 placeholder:text-slate-400`}
      />
    </ColumnHeader>
  );
}

export function ColumnHeaderMultiSelect({
  title,
  options,
  selected,
  setSelected,
}: {
  title: string;
  options: ReadonlyArray<{ code: string; label: string }>;
  selected: Set<string>;
  setSelected: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const switchRef = useRef<HTMLInputElement>(null);
  const summary = useMemo(() => filterSummary(options, selected), [options, selected]);
  const summaryAnchor = useMemo(
    () => longestFilterSummary(options.length),
    [options.length],
  );
  const listAnchor = useMemo(() => longestOptionLabel(options), [options]);
  const filtered = selected.size > 0 && selected.size < options.length;
  const allSelected = options.length > 0 && selected.size === options.length;
  const noneSelected = selected.size === 0;
  const indeterminate = !allSelected && !noneSelected;

  const selectAll = useCallback(() => {
    setSelected(new Set(options.map((opt) => opt.code)));
  }, [options, setSelected]);

  const selectNone = useCallback(() => {
    setSelected(new Set());
  }, [setSelected]);

  const onToggle = useCallback(
    (code: string) => toggleSetValue(selected, code, setSelected),
    [selected, setSelected],
  );

  useEffect(() => {
    if (switchRef.current) {
      switchRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const updateMenuPos = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPos();
    window.addEventListener("scroll", updateMenuPos, true);
    window.addEventListener("resize", updateMenuPos);
    return () => {
      window.removeEventListener("scroll", updateMenuPos, true);
      window.removeEventListener("resize", updateMenuPos);
    };
  }, [open, updateMenuPos]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const menu =
    open &&
    createPortal(
      <div
        ref={menuRef}
        role="listbox"
        aria-multiselectable="true"
        aria-label={`Filtrer ${title}`}
        style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 1200 }}
        className="inline-grid max-h-[min(24rem,70vh)] rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg"
      >
        <span
          aria-hidden
          className="invisible col-start-1 row-start-1 flex items-center gap-2 whitespace-nowrap px-3 py-1.5 text-sm"
        >
          <span className="inline-block h-4 w-4 shrink-0" />
          <span>{listAnchor}</span>
        </span>
        <div className="col-start-1 row-start-1 flex max-h-[min(24rem,70vh)] flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-3 py-2">
            <span className="text-xs font-medium text-slate-500">Tout / Rien</span>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
              <span className={noneSelected ? "font-semibold text-slate-800" : ""}>Rien</span>
              <input
                ref={switchRef}
                type="checkbox"
                role="switch"
                aria-label={`Tout ou rien — ${title}`}
                checked={allSelected}
                onChange={(e) => (e.target.checked ? selectAll() : selectNone())}
                className="h-4 w-7 shrink-0 cursor-pointer appearance-none rounded-full bg-slate-300 transition checked:bg-sky-600 indeterminate:bg-sky-300 before:block before:h-3 before:w-3 before:translate-x-0.5 before:rounded-full before:bg-white before:transition before:content-[''] checked:before:translate-x-3.5 indeterminate:before:translate-x-2"
              />
              <span className={allSelected ? "font-semibold text-slate-800" : ""}>Tout</span>
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {options.map((opt) => (
              <label
                key={opt.code}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm font-normal text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selected.has(opt.code)}
                  onChange={() => onToggle(opt.code)}
                  className="shrink-0 rounded border-slate-300 text-sky-700 focus:ring-sky-500"
                />
                <span className="whitespace-nowrap leading-snug">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <ColumnHeader title={title}>
      <div className="inline-grid max-w-full">
        <span
          aria-hidden
          className="invisible col-start-1 row-start-1 inline-flex items-center justify-between gap-1.5 whitespace-nowrap px-2 py-1 text-xs"
        >
          <span>{summaryAnchor}</span>
          <span className="inline-block h-3.5 w-3.5 shrink-0" />
        </span>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={`col-start-1 row-start-1 inline-flex w-full items-center justify-between gap-1.5 text-left text-slate-800 transition hover:border-slate-300 ${filterControlClass(filtered, false)}`}
        >
          <span className="truncate">{summary}</span>
          <svg
            viewBox="0 0 20 20"
            className={`h-3.5 w-3.5 shrink-0 opacity-60 transition ${open ? "rotate-180" : ""}`}
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      {menu}
    </ColumnHeader>
  );
}

/** Décalage en-tête 1ʳᵉ colonne sous le menu flottant. */
export const MENU_CLEARANCE = "pl-[calc(env(safe-area-inset-left,0px)+3.75rem)]";

export const FILTER_TABLE_CLASS = "w-full min-w-[28rem] table-fixed text-left text-sm";
