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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={zoneOnly}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-slate-300 text-sky-700 focus:ring-sky-500"
        />
        Limiter à la zone de l&apos;arbre
      </label>
      {scopeCount != null && totalCount != null && (
        <p className="text-sm text-slate-500">
          {zoneOnly ? (
            <>
              Zone : {scopeCount} — Total : {totalCount}
            </>
          ) : (
            <>Total : {totalCount}</>
          )}
        </p>
      )}
    </div>
  );
}

export function formatPercent(part: number, total: number): string {
  if (total <= 0) return "—";
  return `${Math.round((part / total) * 100)} %`;
}
