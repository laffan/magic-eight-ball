import { valueColor } from "./valueColor";
import { useMemo, useState, useId } from "react";
import { useStore, dateToX } from "../state/store";
import { valueSeries, dayParts } from "../state/valueMath";
export default function ValueGraphs({ top }: { top: number }) {
  const gradientPrefix = useId();
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
    amount: number;
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
        const lastAmount = points[points.length - 1]?.amount ?? v.startingValue;
        const zeroOffset = Math.max(0, Math.min(1, (80 + min / range * 50) / 90));
        const gradientId = `${gradientPrefix}-${i}`;
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
            <button onClick={() => select(v.id)} style={{color: valueColor(lastAmount)}}>
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
                    amount: point.amount,
                    x: e.clientX,
                    y: e.clientY,
                    text: `${new Date(point.day * 86400000).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" })} · ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(point.amount)}`,
                  });
              }}
              onClick={() => select(v.id)}
            >
              <defs>
                <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="90">
                  <stop offset={zeroOffset} stopColor="#4a9d5b" />
                  <stop offset={zeroOffset} stopColor="#d23a3a" />
                </linearGradient>
              </defs>
              <polyline
                points={path}
                fill="none"
                stroke={min < 0 && max > 0 ? `url(#${gradientId})` : valueColor(min < 0 ? min : max)}
                strokeWidth="2"
              />
            </svg>
            {hover?.id === v.id && (
              <div
                role="tooltip"
                className="value-tooltip"
                style={{ left: hover.x, top: hover.y, color: valueColor(hover.amount) }}
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
