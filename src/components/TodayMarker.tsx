import { MONTH_WIDTH, useStore } from "../state/store";

export default function TodayMarker() {
  const startYear = useStore((s) => s.startYear);
  const numYears = useStore((s) => s.numYears);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  if (year < startYear || year >= startYear + numYears) return null;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthIdx = (year - startYear) * 12 + month;
  const left = monthIdx * MONTH_WIDTH + ((day - 1) / daysInMonth) * MONTH_WIDTH;

  return <div className="today-marker" style={{ left }} aria-hidden />;
}
