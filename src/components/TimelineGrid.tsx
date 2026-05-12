import { MONTHS_PER_YEAR, monthLabel, useStore } from "../state/store";

export default function TimelineGrid() {
  const startYear = useStore((s) => s.startYear);
  const numYears = useStore((s) => s.numYears);
  const monthWidth = useStore((s) => s.monthWidth);
  const monthsVisible = useStore((s) => s.monthsVisible);

  const yearWidth = monthWidth * MONTHS_PER_YEAR;
  const years = Array.from({ length: numYears }, (_, i) => startYear + i);
  // At the 3y zoom the month cells are narrow, so we show the month number
  // (1..12) rather than its abbreviated name.
  const useNumericMonth = monthsVisible === 36;

  return (
    <div
      className="timeline-grid"
      style={{ width: numYears * yearWidth }}
      aria-hidden
    >
      {years.map((year, yi) => (
        <div
          key={year}
          className="year-col"
          style={{ width: yearWidth, left: yi * yearWidth }}
        >
          <h1 className="year-label">{year}</h1>
          <div className="month-row">
            {Array.from({ length: MONTHS_PER_YEAR }, (_, mi) => (
              <div
                key={mi}
                className="month-cell"
                style={{ width: monthWidth }}
              >
                <span className="month-label">
                  {useNumericMonth ? mi + 1 : monthLabel(mi)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
