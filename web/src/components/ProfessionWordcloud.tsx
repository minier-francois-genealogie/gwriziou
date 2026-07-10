import { scaleLog } from "@visx/scale";
import { Text } from "@visx/text";
import { Wordcloud } from "@visx/wordcloud";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProfessionNuageItem } from "../types/api";

interface WordDatum {
  text: string;
  value: number;
}

const COLORS = ["#0c4a6e", "#075985", "#0369a1", "#0284c7", "#0ea5e9", "#38bdf8"] as const;
const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const STABLE_RANDOM = () => 0.5;

function useContainerSize(minHeight = 280) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: minHeight });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const width = Math.floor(el.clientWidth);
      const height = Math.max(minHeight, Math.floor(el.clientHeight));
      setSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minHeight]);

  return { ref, width: size.width, height: size.height };
}

function toWords(lignes: ProfessionNuageItem[]): WordDatum[] {
  return lignes.map((l) => ({ text: l.profession, value: l.effectif }));
}

export function ProfessionWordcloud({ lignes }: { lignes: ProfessionNuageItem[] }) {
  const { ref, width, height } = useContainerSize();
  const [hovered, setHovered] = useState<string | null>(null);

  const words = useMemo(() => toWords(lignes), [lignes]);

  const effectifByText = useMemo(
    () => new Map(lignes.map((l) => [l.profession, l.effectif])),
    [lignes],
  );

  const fontSize = useMemo(() => {
    if (words.length === 0) return () => 14;
    const values = words.map((w) => w.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const scale = scaleLog({
      domain: min === max ? [min, min + 1] : [min, max],
      range: [13, Math.min(52, width > 0 ? width / 9 : 48)],
    });
    return (datum: WordDatum) => scale(datum.value);
  }, [words, width]);

  const ready = width > 0 && height > 0 && words.length > 0;

  return (
    <div
      ref={ref}
      className="min-h-[min(70vh,28rem)] w-full flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      {ready && (
        <svg width={width} height={height} className="mx-auto block overflow-visible">
          <Wordcloud
            words={words}
            width={width}
            height={height}
            font={FONT}
            fontSize={fontSize}
            fontWeight={600}
            padding={3}
            spiral="archimedean"
            rotate={0}
            random={STABLE_RANDOM}
          >
            {(cloudWords) =>
              cloudWords.map((w, i) => {
                const label = w.text ?? "";
                const effectif = effectifByText.get(label) ?? 0;
                const active = hovered === label;
                return (
                  <g
                    key={`${label}-${i}`}
                    transform={`translate(${w.x ?? 0}, ${w.y ?? 0}) rotate(${w.rotate ?? 0})`}
                    onMouseEnter={() => setHovered(label)}
                    onMouseLeave={() => setHovered(null)}
                    className="cursor-default"
                  >
                    <title>{`${label} — ${effectif}`}</title>
                    <Text
                      textAnchor="middle"
                      verticalAnchor="middle"
                      fill={active ? "#0c4a6e" : COLORS[i % COLORS.length]}
                      fontSize={w.size}
                      fontFamily={w.font}
                      fontWeight={w.weight}
                      style={{ transition: "fill 120ms ease" }}
                    >
                      {label}
                    </Text>
                  </g>
                );
              })
            }
          </Wordcloud>
        </svg>
      )}
    </div>
  );
}
