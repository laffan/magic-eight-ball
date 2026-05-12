import {
  MONTHS_PER_YEAR,
  monthLabel,
  useStore,
  xToDateParts,
} from "../state/store";

type Props = {
  x: number; // cursor position in viewport
  y: number;
  contentX: number; // cursor position within canvas content
  span?: { startMonthIdx: number; endMonthIdx: number } | null;
};

export default function CursorTooltip({ x, y, contentX, span }: Props) {
  const startYear = useStore((s) => s.startYear);
  const numYears = useStore((s) => s.numYears);

  let text: string;

  if (span) {
    const sYear = startYear + Math.floor(span.startMonthIdx / MONTHS_PER_YEAR);
    const eYear = startYear + Math.floor(span.endMonthIdx / MONTHS_PER_YEAR);
    const sLabel = `${monthLabel(span.startMonthIdx)} ${sYear}`;
    const eLabel = `${monthLabel(span.endMonthIdx)} ${eYear}`;
    text = sLabel === eLabel ? sLabel : `${sLabel} – ${eLabel}`;
  } else {
    const parts = xToDateParts(contentX, startYear);
    if (parts.year < startYear || parts.year >= startYear + numYears) return null;
    text = `${monthLabel(parts.month)} ${parts.day}, ${parts.year}`;
  }

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
