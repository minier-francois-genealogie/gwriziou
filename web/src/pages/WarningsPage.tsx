import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { PersonName } from "../components/SexeIcon";
import { useApp } from "../context/AppContext";
import { useAsync } from "../hooks/useApi";
import type { WarningLigne } from "../types/api";
import { formatWarningDetail } from "../utils/format";

const EVENT_FILTERS = [
  { code: "NAISSANCE", label: "Naissance" },
  { code: "MARIAGE", label: "Mariage" },
  { code: "DECES", label: "Décès" },
] as const;

const WARNING_FILTERS = [
  { code: "MANQUE_ACTE", label: "Acte manquant" },
  { code: "MANQUE_GED", label: "Date/lieu GEDCOM manquant" },
  { code: "DATE_DIVERGENTE", label: "Date GEDCOM ≠ acte" },
  { code: "LIEU_DIVERGENTE", label: "Lieu GEDCOM ≠ acte" },
  { code: "MANQUE_BORNE_NAISSANCE", label: "Borne naissance inestimable" },
  { code: "MANQUE_BORNE_DECES", label: "Borne décès inestimable" },
] as const;

function toggleSetValue(
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

/** Plus long libellé affiché dans le bouton (Aucun, Tous, N sélectionné(s)). */
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

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function matchesIndividu(row: WarningLigne, query: string): boolean {
  const q = normalizeSearchText(query.trim());
  if (!q) return true;
  const haystack = normalizeSearchText(`${row.nom} ${row.prenoms ?? ""}`);
  return haystack.includes(q);
}

const FILTER_CONTROL_BASE =
  "rounded-md border px-2 py-1 text-xs font-normal normal-case tracking-normal focus:outline-none focus:ring-2 focus:ring-sky-500/40";

const FILTER_CONTROL_FULL = `w-full min-w-[8.5rem] ${FILTER_CONTROL_BASE}`;

function filterControlClass(active: boolean, fullWidth = true): string {
  const width = fullWidth ? FILTER_CONTROL_FULL : FILTER_CONTROL_BASE;
  return `${width} ${
    active ? "border-sky-300 bg-sky-50/50" : "border-slate-200 bg-white"
  }`;
}

function ColumnHeader({
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

function ColumnHeaderSearch({
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

function ColumnHeaderMultiSelect({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: ReadonlyArray<{ code: string; label: string }>;
  selected: Set<string>;
  onToggle: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const summary = useMemo(() => filterSummary(options, selected), [options, selected]);
  const summaryAnchor = useMemo(
    () => longestFilterSummary(options.length),
    [options.length],
  );
  const listAnchor = useMemo(() => longestOptionLabel(options), [options]);
  const filtered = selected.size > 0 && selected.size < options.length;

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
        className="inline-grid rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg"
      >
        <span
          aria-hidden
          className="invisible col-start-1 row-start-1 flex items-center gap-2 whitespace-nowrap px-3 py-1.5 text-sm"
        >
          <span className="inline-block h-4 w-4 shrink-0" />
          <span>{listAnchor}</span>
        </span>
        <div className="col-start-1 row-start-1 flex flex-col">
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

function filterLignes(
  lignes: WarningLigne[],
  eventTypes: Set<string>,
  warningCodes: Set<string>,
  individuQuery: string,
): WarningLigne[] {
  return lignes.filter(
    (row) =>
      eventTypes.has(row.type_evenement) &&
      warningCodes.has(row.code) &&
      matchesIndividu(row, individuQuery),
  );
}

const WARNINGS_TABLE_CLASS = "w-full min-w-[28rem] table-fixed text-left text-sm";

/** Décalage en-tête 1ʳᵉ colonne sous le menu flottant (filtre Individu uniquement). */
const MENU_CLEARANCE = "pl-[calc(env(safe-area-inset-left,0px)+3.75rem)]";

function WarningsTableColgroup() {
  return (
    <colgroup>
      <col style={{ width: "34%" }} />
      <col style={{ width: "30%" }} />
      <col style={{ width: "36%" }} />
    </colgroup>
  );
}

export function WarningsPage() {
  const { ancrePersonneId, ancetres, descendants } = useApp();
  const [zoneOnly, setZoneOnly] = useState(true);
  const [eventTypes, setEventTypes] = useState(
    () => new Set<string>(EVENT_FILTERS.map((f) => f.code)),
  );
  const [warningCodes, setWarningCodes] = useState(
    () => new Set<string>(WARNING_FILTERS.map((f) => f.code)),
  );
  const [individuQuery, setIndividuQuery] = useState("");
  const navigate = useNavigate();

  const { data: stats } = useAsync(
    () => api.warningsStats(ancrePersonneId, ancetres, descendants),
    [ancrePersonneId, ancetres, descendants],
  );

  const { data, loading, error } = useAsync(
    () => api.warnings(ancrePersonneId, ancetres, descendants, zoneOnly),
    [ancrePersonneId, ancetres, descendants, zoneOnly],
  );

  const filteredLignes = useMemo(
    () =>
      data ? filterLignes(data.lignes, eventTypes, warningCodes, individuQuery) : [],
    [data, eventTypes, warningCodes, individuQuery],
  );

  const openPerson = (id: string) => {
    navigate("/recherche", { state: { fichePersonneId: id } });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pl-[calc(env(safe-area-inset-left,0px)+0.75rem)]">
        {loading && (
          <p className="text-sm text-slate-500">Chargement des warnings…</p>
        )}
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}
        {data && data.lignes.length === 0 && (
          <p className="text-sm text-slate-500">Aucun warning.</p>
        )}
        {data && data.lignes.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
              <div className="shrink-0 border-b border-slate-300 bg-slate-50">
                <table className={WARNINGS_TABLE_CLASS}>
                  <WarningsTableColgroup />
                  <thead>
                    <tr>
                      <th className={`py-2 pr-3 align-top ${MENU_CLEARANCE}`}>
                        <ColumnHeaderSearch
                          title="Individu"
                          value={individuQuery}
                          onChange={setIndividuQuery}
                        />
                      </th>
                      <th className="px-3 py-2 align-top">
                        <ColumnHeaderMultiSelect
                          title="Événement"
                          options={EVENT_FILTERS}
                          selected={eventTypes}
                          onToggle={(code) =>
                            toggleSetValue(eventTypes, code, setEventTypes)
                          }
                        />
                      </th>
                      <th className="px-3 py-2 align-top">
                        <ColumnHeaderMultiSelect
                          title="Warning"
                          options={WARNING_FILTERS}
                          selected={warningCodes}
                          onToggle={(code) =>
                            toggleSetValue(warningCodes, code, setWarningCodes)
                          }
                        />
                      </th>
                    </tr>
                  </thead>
                </table>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <table className={WARNINGS_TABLE_CLASS}>
                  <WarningsTableColgroup />
                  <tbody>
                    {filteredLignes.map((row, i) => (
                      <tr
                        key={`${row.id_gedcom}-${row.type_evenement}-${row.code}-${i}`}
                        className="border-b border-slate-300 last:border-0 hover:bg-slate-50/80"
                      >
                        <td className="px-3 py-2 align-top">
                          <button
                            type="button"
                            className="text-left text-sky-700 hover:underline"
                            onClick={() => openPerson(row.id_gedcom)}
                          >
                            <PersonName
                              nom={row.nom}
                              prenoms={row.prenoms}
                              sexe={row.sexe}
                              showPhoto={false}
                            />
                          </button>
                        </td>
                        <td className="px-3 py-2 align-top text-slate-600">
                          <span className="block font-medium text-slate-700">
                            {row.evenement_label}
                          </span>
                          {row.evenement_date && (
                            <span className="mt-0.5 block tabular-nums text-xs text-slate-500">
                              {row.evenement_date}
                            </span>
                          )}
                          {row.evenement_lieu && (
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {row.evenement_lieu}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <span className="font-medium text-amber-800">{row.message}</span>
                          {row.detail && (
                            <span className="mt-0.5 block whitespace-pre-line text-xs text-slate-500">
                              {formatWarningDetail(row.detail)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-300 bg-slate-50 px-3 py-2">
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={zoneOnly}
                    onChange={(e) => setZoneOnly(e.target.checked)}
                    className="rounded border-slate-300 text-sky-700 focus:ring-sky-500"
                  />
                  Limiter à la zone de l&apos;arbre
                </label>
                <div className="text-right">
                  <p className="text-sm text-slate-500">
                    Zone : {stats?.nombre_warning_zone ?? data.nombre_warning_zone} — Total :{" "}
                    {stats?.nombre_warning_total ?? data.nombre_warning_total}
                  </p>
                  <p className="text-xs text-slate-400">
                    {filteredLignes.length} affiché{filteredLignes.length > 1 ? "s" : ""} sur{" "}
                    {data.lignes.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
