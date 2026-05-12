import { MONTHS_PER_YEAR, useStore } from "../state/store";

export default function YearDividers() {
  const numYears = useStore((s) => s.numYears);
  const monthWidth = useStore((s) => s.monthWidth);
  const monthsVisible = useStore((s) => s.monthsVisible);
  const yearWidth = monthWidth * MONTHS_PER_YEAR;
  const totalMonths = numYears * MONTHS_PER_YEAR;
  // Lighter per-month dividers appear once the user zooms to ≤ 1 year.
  const showMonthDividers = monthsVisible <= 12;

  return (
    <div className="year-dividers" aria-hidden>
      {showMonthDividers &&
        Array.from({ length: totalMonths }, (_, i) => {
          // Skip year boundaries — those are drawn by year dividers below.
          if (i === 0 || i % MONTHS_PER_YEAR === 0) return null;
          return (
            <div
              key={`m-${i}`}
              className="month-divider"
              style={{ left: i * monthWidth }}
            />
          );
        })}
      {Array.from({ length: numYears + 1 }, (_, i) => (
        <div
          key={`y-${i}`}
          className="year-divider"
          style={{ left: i * yearWidth }}
        />
      ))}
    </div>
  );
}
