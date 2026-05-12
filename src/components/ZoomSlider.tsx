import { ZOOM_STOPS, useStore } from "../state/store";
import type { MonthsVisible } from "../state/store";

const LABELS: Record<MonthsVisible, string> = {
  36: "3y",
  12: "1y",
  6: "6m",
  3: "3m",
  1: "1m",
};

export default function ZoomSlider() {
  const monthsVisible = useStore((s) => s.monthsVisible);
  const setMonthsVisible = useStore((s) => s.setMonthsVisible);

  return (
    <div className="zoom-slider" role="radiogroup" aria-label="Zoom">
      <div className="zoom-track" aria-hidden />
      {ZOOM_STOPS.map((stop) => (
        <button
          key={stop}
          type="button"
          role="radio"
          aria-checked={monthsVisible === stop}
          className={`zoom-stop ${monthsVisible === stop ? "is-active" : ""}`}
          onClick={() => setMonthsVisible(stop)}
          title={`${LABELS[stop]} visible`}
        >
          <span className="zoom-tick" aria-hidden />
          <span className="zoom-label">{LABELS[stop]}</span>
        </button>
      ))}
    </div>
  );
}
