import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api/client";
import { useAsync } from "../hooks/useApi";
import type { GeolocCommune } from "../types/api";

const FRANCE_CENTER: L.LatLngExpression = [47.5, 2.5];
const DEFAULT_ZOOM = 6;

function markerRadius(nombre: number): number {
  return Math.min(22, 7 + Math.sqrt(nombre) * 2.5);
}

function FitBounds({ communes }: { communes: GeolocCommune[] }) {
  const map = useMap();
  useEffect(() => {
    if (communes.length === 0) {
      map.setView(FRANCE_CENTER, DEFAULT_ZOOM);
      return;
    }
    if (communes.length === 1) {
      const c = communes[0];
      map.setView([c.latitude, c.longitude], 11);
      return;
    }
    const bounds = L.latLngBounds(
      communes.map((c) => [c.latitude, c.longitude] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 });
  }, [map, communes]);
  return null;
}

export function GeolocPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data, loading, error } = useAsync(
    () => api.geoloc(year),
    [year],
  );

  useEffect(() => {
    if (!data) return;
    if (year < data.annee_min) setYear(data.annee_min);
    else if (year > data.annee_max) setYear(data.annee_max);
  }, [data, year]);

  const communes = data?.communes ?? [];
  const boundsKey = useMemo(
    () => communes.map((c) => `${c.lieu_id}:${c.nombre}`).join("|"),
    [communes],
  );

  const anneeMin = data?.annee_min ?? currentYear;
  const anneeMax = data?.annee_max ?? currentYear;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <MapContainer
        center={FRANCE_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full flex-1"
        scrollWheelZoom
        zoomControl={false}
      >
        <ZoomControl position="topright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds key={boundsKey} communes={communes} />
        {communes.map((c) => (
          <CircleMarker
            key={c.lieu_id}
            center={[c.latitude, c.longitude]}
            radius={markerRadius(c.nombre)}
            pathOptions={{
              color: "#0369a1",
              fillColor: "#0ea5e9",
              fillOpacity: 0.55,
              weight: 1.5,
            }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
              <span className="font-medium">{c.commune}</span>
              {c.departement && (
                <span className="text-slate-600"> ({c.departement})</span>
              )}
              <span className="block tabular-nums">{c.nombre} personne{c.nombre > 1 ? "s" : ""}</span>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] pl-[calc(env(safe-area-inset-left,0px)+3.75rem)] pr-3 pt-3">
        <div className="pointer-events-auto inline-flex max-w-full flex-col gap-1 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 shadow-md backdrop-blur-sm">
          <h1 className="text-sm font-bold text-slate-900">Géoloc</h1>
          {loading && !data && (
            <p className="text-xs text-slate-500">Chargement…</p>
          )}
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
          {data && (
            <p className="text-xs text-slate-600">
              {data.nombre_personnes} vivant{data.nombre_personnes > 1 ? "s" : ""} en {data.annee}
              {" · "}
              {data.communes.length} commune{data.communes.length > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pl-[calc(env(safe-area-inset-left,0px)+0.75rem)]">
        <div className="pointer-events-auto rounded-xl border border-slate-200/90 bg-white/95 px-4 py-3 shadow-md backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Année
            </span>
            <span className="text-lg font-bold tabular-nums text-sky-800">{year}</span>
          </div>
          <input
            type="range"
            min={anneeMin}
            max={anneeMax}
            step={1}
            value={Math.min(anneeMax, Math.max(anneeMin, year))}
            onChange={(e) => setYear(Number.parseInt(e.target.value, 10))}
            className="w-full accent-sky-700"
            aria-label="Année affichée"
          />
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-slate-400">
            <span>{anneeMin}</span>
            <span>{anneeMax}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
