import { YEAR_WIDTH, useStore } from "../state/store";

export default function YearDividers() {
  const numYears = useStore((s) => s.numYears);
  return (
    <div className="year-dividers" aria-hidden>
      {Array.from({ length: numYears + 1 }, (_, i) => (
        <div
          key={i}
          className="year-divider"
          style={{ left: i * YEAR_WIDTH }}
        />
      ))}
    </div>
  );
}
