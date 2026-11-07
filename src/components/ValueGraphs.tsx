import { useMemo, useState } from "react";
import { useStore, dateToX } from "../state/store";
import { valueSeries, dayParts } from "../state/valueMath";
export default function ValueGraphs({ top }: { top: number }) {
  const values = useStore((s) => s.values),
    layers = useStore((s) => s.layers),
    dates = useStore((s) => s.dates),
    year = useStore((s) => s.startYear),
    years = useStore((s) => s.numYears),
    width = useStore((s) => s.monthWidth),
    select = useStore((s) => s.setSelected);
  const [hover, setHover] = useState<{
    id: string;
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const series = useMemo(
    () => values.map((v) => valueSeries(v, layers, dates, year, years)),
    [values, layers, dates, year, years],
  );
  return (
    <>
      {values.map((v, i) => {
        const points = series[i],
          amounts = points.map((p) => p.amount),
          min = Math.min(...amounts),
          max = Math.max(...amounts),
          range = max - min || 1;
        const path = points
          .map((p) => {
            const d = dayParts(p.day, year);
            return `${dateToX(d.month, d.day, year, width)},${80 - ((p.amount - min) / range) * 50}`;
          })
          .join(" ");
        return (
          <div
            key={v.id}
            data-interactive
            className="value-graph"
            style={{ top: top + i * 110, width: years * 12 * width }}
          >
            <button onClick={() => select(v.id)}>
              {v.name} ·{" "}
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(points[points.length - 1]?.amount ?? v.startingValue)}
            </button>
            <svg
              width="100%"
              height="90"
              role="img"
              aria-label={`${v.name} value over time`}
              onMouseLeave={() => setHover(null)}
              onMouseMove={(e) => {
                const x =
                  e.clientX - e.currentTarget.getBoundingClientRect().left;
                const point = points.reduce<
                  (typeof points)[number] | undefined
                >((best, p) => {
                  const d = dayParts(p.day, year),
                    b = best && dayParts(best.day, year);
                  return !b ||
                    Math.abs(dateToX(d.month, d.day, year, width) - x) <
                      Math.abs(dateToX(b.month, b.day, year, width) - x)
                    ? p
                    : best;
                }, undefined);
                if (point)
                  setHover({
                    id: v.id,
                    x: e.clientX,
                    y: e.clientY,
                    text: `${new Date(point.day * 86400000).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" })} · ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(point.amount)}`,
                  });
              }}
              onClick={() => select(v.id)}
            >
              <polyline
                points={path}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            {hover?.id === v.id && (
              <div
                role="tooltip"
                className="value-tooltip"
                style={{ left: hover.x, top: hover.y }}
              >
                {hover.text}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
