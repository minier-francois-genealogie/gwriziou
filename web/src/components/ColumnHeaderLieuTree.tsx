import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ColumnHeader,
  filterControlClass,
} from "./TableColumnFilters";
import type { LieuTreeNode } from "../utils/lieuTree";
import {
  collectAllNodeIds,
  lieuSelectionSummary,
  toggleLieuNodeSelection,
} from "../utils/lieuTree";

function LieuTreeRow({
  node,
  selected,
  onToggle,
  expanded,
  toggleExpanded,
}: {
  node: LieuTreeNode;
  selected: ReadonlySet<string>;
  onToggle: (nodeId: string, checked: boolean) => void;
  expanded: Set<string>;
  toggleExpanded: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const expandedNow = expanded.has(node.id);
  const checked = selected.has(node.id);

  return (
    <>
      <div
        className="flex items-center gap-1 py-1 pr-3 hover:bg-slate-50"
        style={{ paddingLeft: `${8 + node.depth * 14}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => toggleExpanded(node.id)}
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-200/80"
            aria-label={expandedNow ? "Replier" : "Déplier"}
          >
            <svg
              viewBox="0 0 20 20"
              className={`h-3 w-3 transition ${expandedNow ? "rotate-90" : ""}`}
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.17 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" />
            </svg>
          </button>
        ) : (
          <span className="inline-block h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggle(node.id, !checked)}
            className="shrink-0 rounded border-slate-300 text-sky-700 focus:ring-sky-500"
          />
          <span className="truncate leading-snug">{node.label}</span>
        </label>
      </div>
      {hasChildren &&
        expandedNow &&
        node.children.map((child) => (
          <LieuTreeRow
            key={child.id}
            node={child}
            selected={selected}
            onToggle={onToggle}
            expanded={expanded}
            toggleExpanded={toggleExpanded}
          />
        ))}
    </>
  );
}

export function ColumnHeaderLieuTree({
  title,
  tree,
  selectedIds,
  setSelectedIds,
}: {
  title: string;
  tree: LieuTreeNode[];
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["monde", "monde/france"]));
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const switchRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allIds = useMemo(() => collectAllNodeIds(tree), [tree]);
  const summary = useMemo(
    () => lieuSelectionSummary(selectedIds.length, allIds.length),
    [selectedIds.length, allIds.length],
  );
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const noneSelected = selectedIds.length === 0;
  const indeterminate = !allSelected && !noneSelected;
  const filtered = !allSelected && !noneSelected;

  const onToggle = useCallback(
    (nodeId: string, checked: boolean) => {
      setSelectedIds((prev) => toggleLieuNodeSelection(prev, nodeId, checked));
    },
    [setSelectedIds],
  );

  const selectAll = useCallback(() => {
    setSelectedIds(allIds);
  }, [allIds, setSelectedIds]);

  const selectNone = useCallback(() => {
    setSelectedIds([]);
  }, [setSelectedIds]);

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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

  useEffect(() => {
    const rootIds = tree.map((n) => n.id);
    setExpanded((current) => {
      const next = new Set(current);
      rootIds.forEach((id) => next.add(id));
      return next;
    });
  }, [tree]);

  const menu =
    open &&
    createPortal(
      <div
        ref={menuRef}
        role="dialog"
        aria-label={`Filtrer ${title}`}
        style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 1200 }}
        className="flex max-h-[min(28rem,70vh)] w-[min(20rem,calc(100vw-2rem))] flex-col rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg"
      >
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
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {tree.map((node) => (
            <LieuTreeRow
              key={node.id}
              node={node}
              selected={selected}
              onToggle={onToggle}
              expanded={expanded}
              toggleExpanded={toggleExpanded}
            />
          ))}
        </div>
      </div>,
      document.body,
    );

  return (
    <ColumnHeader title={title}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`inline-flex w-full min-w-[8.5rem] items-center justify-between gap-1.5 text-left text-xs text-slate-800 transition hover:border-slate-300 ${filterControlClass(filtered, false)}`}
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
      {menu}
    </ColumnHeader>
  );
}
