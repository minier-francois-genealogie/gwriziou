import type { DirigeantFrance } from "../types/api";

function initials(nom: string): string {
  const parts = nom.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  return nom.slice(0, 2).toUpperCase();
}

export function DirigeantsFranceSection({
  dirigeants,
}: {
  dirigeants: DirigeantFrance[];
}) {
  if (dirigeants.length === 0) return null;

  return (
    <section className="mb-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Chefs d&apos;État
      </h3>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-3">
        {dirigeants.map((d) => (
          <li
            key={d.slug}
            className="flex flex-col items-center rounded-lg border border-slate-100 bg-slate-50/80 p-2 text-center"
          >
            {d.photo_url ? (
              <img
                src={d.photo_url}
                alt=""
                loading="lazy"
                className="h-16 w-16 rounded-full border border-slate-200 object-cover object-top"
              />
            ) : (
              <span
                aria-hidden
                className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-200 text-sm font-semibold text-slate-600"
              >
                {initials(d.nom)}
              </span>
            )}
            <span className="mt-2 text-xs font-semibold leading-snug text-slate-800">
              {d.nom}
            </span>
            <span className="mt-0.5 text-[10px] leading-snug text-slate-500">{d.titre}</span>
            <span className="mt-1 text-[10px] tabular-nums text-slate-400">{d.periode}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
