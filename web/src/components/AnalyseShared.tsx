interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
}

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function AnalyseZoneToggle({
  zoneOnly,
  onChange,
  scopeCount,
  totalCount,
}: {
  zoneOnly: boolean;
  onChange: (zoneOnly: boolean) => void;
  scopeCount?: number;
  totalCount?: number;
}) {
  return (
    <div className="flex shrink-0 items-center justify-end gap-4 text-sm">
      <label className="flex cursor-pointer items-center gap-2 text-slate-700">
        <span>Limiter à la zone de l&apos;arbre</span>
        <input
          type="checkbox"
          role="switch"
          aria-label="Limiter à la zone de l'arbre"
          checked={zoneOnly}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-7 shrink-0 cursor-pointer appearance-none rounded-full bg-slate-300 transition checked:bg-sky-600 before:block before:h-3 before:w-3 before:translate-x-0.5 before:rounded-full before:bg-white before:transition before:content-[''] checked:before:translate-x-3.5"
        />
      </label>
      <span
        className="w-28 shrink-0 text-right tabular-nums text-slate-500"
        aria-hidden={!zoneOnly || scopeCount == null}
      >
        {zoneOnly && scopeCount != null ? `Zone : ${scopeCount}` : "\u00a0"}
      </span>
      <span className="w-32 shrink-0 text-right tabular-nums text-slate-500">
        {totalCount != null ? `Total : ${totalCount}` : "\u00a0"}
      </span>
    </div>
  );
}

export function formatPercent(part: number, total: number): string {
  if (total <= 0) return "—";
  return `${Math.round((part / total) * 100)} %`;
}
