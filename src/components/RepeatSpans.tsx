import type { Layer } from "../types";
import { useStore, dateToX, dateToEndX } from "../state/store";
import { spanOccurrences, spanDays, dayParts } from "../state/valueMath";
export default function RepeatSpans({
  layer,
  rowIndex,
}: {
  layer: Layer;
  rowIndex: number;
}) {
  const year = useStore((s) => s.startYear),
    years = useStore((s) => s.numYears),
    width = useStore((s) => s.monthWidth),
    select = useStore((s) => s.setSelected);
  return (
    <>
      {spanOccurrences(layer, year, years)
        .slice(1)
        .map((day) => {
          const start = dayParts(day, year),
            end = dayParts(day + spanDays(layer, year) - 1, year);
          const left = dateToX(start.month, start.day, year, width),
            right = dateToEndX(end.month, end.day, year, width);
          return (
            <button
              key={day}
              data-interactive
              className="repeat-span"
              style={{ left, width: right - left, top: 12 + rowIndex * 36 + 4 }}
              onClick={() => select(layer.id)}
              title="Repeating span — edit the original"
            >
              {layer.label}
            </button>
          );
        })}
    </>
  );
}
