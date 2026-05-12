import { monthLabel, useStore, xToDateParts } from "../state/store";

type Props = {
  x: number; // viewport x (client coordinates)
  y: number; // viewport y
  contentX: number; // x within canvas content (for date computation)
};

export default function CursorTooltip({ x, y, contentX }: Props) {
  const startYear = useStore((s) => s.startYear);
  const numYears = useStore((s) => s.numYears);
  const parts = xToDateParts(contentX, startYear);

  if (parts.year < startYear || parts.year >= startYear + numYears) return null;

  const text = `${monthLabel(parts.month)} ${parts.day}, ${parts.year}`;

  return (
    <div
      className="cursor-tooltip"
      style={{ left: x + 14, top: y + 14 }}
      aria-hidden
    >
      {text}
    </div>
  );
}
