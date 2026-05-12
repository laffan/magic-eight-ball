import { MONTHS_PER_YEAR, useStore } from "../state/store";

export default function YearDividers() {
  const numYears = useStore((s) => s.numYears);
  const monthWidth = useStore((s) => s.monthWidth);
  const yearWidth = monthWidth * MONTHS_PER_YEAR;

  return (
    <div className="year-dividers" aria-hidden>
      {Array.from({ length: numYears + 1 }, (_, i) => (
        <div
          key={i}
          className="year-divider"
          style={{ left: i * yearWidth }}
        />
      ))}
    </div>
  );
}
