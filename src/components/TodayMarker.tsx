import { dateToX, useStore } from "../state/store";

export default function TodayMarker() {
  const startYear = useStore((s) => s.startYear);
  const numYears = useStore((s) => s.numYears);
  const monthWidth = useStore((s) => s.monthWidth);

  const today = new Date();
  const year = today.getFullYear();
  if (year < startYear || year >= startYear + numYears) return null;

  const month = today.getMonth();
  const day = today.getDate();
  const monthIdx = (year - startYear) * 12 + month;
  const left = dateToX(monthIdx, day, startYear, monthWidth);

  return <div className="today-marker" style={{ left }} aria-hidden />;
}
