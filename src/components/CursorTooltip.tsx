import {
  MONTHS_PER_YEAR,
  monthLabel,
  useStore,
  xToDateParts,
} from "../state/store";

type FocusDate = { monthIdx: number; day: number };

type Props = {
  x: number;
  y: number;
  contentX: number;
  span?: { startMonthIdx: number; endMonthIdx: number } | null;
  focusDate?: FocusDate | null;
};

export default function CursorTooltip({ x, y, contentX, span, focusDate }: Props) {
  const startYear = useStore((s) => s.startYear);
  const numYears = useStore((s) => s.numYears);
  const monthWidth = useStore((s) => s.monthWidth);

  let text: string;

  if (focusDate) {
    const year = startYear + Math.floor(focusDate.monthIdx / MONTHS_PER_YEAR);
    text = `${monthLabel(focusDate.monthIdx)} ${focusDate.day}, ${year}`;
  } else if (span) {
    const sYear = startYear + Math.floor(span.startMonthIdx / MONTHS_PER_YEAR);
    const eYear = startYear + Math.floor(span.endMonthIdx / MONTHS_PER_YEAR);
    const sLabel = `${monthLabel(span.startMonthIdx)} ${sYear}`;
    const eLabel = `${monthLabel(span.endMonthIdx)} ${eYear}`;
    text = sLabel === eLabel ? sLabel : `${sLabel} – ${eLabel}`;
  } else {
    const parts = xToDateParts(contentX, startYear, monthWidth);
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
