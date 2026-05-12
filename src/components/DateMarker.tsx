import { MONTH_WIDTH, useStore } from "../state/store";
import type { DateMark } from "../types";

export default function DateMarker({ date }: { date: DateMark }) {
  const selectedId = useStore((s) => s.selectedId);
  const setSelected = useStore((s) => s.setSelected);

  const left = date.monthIdx * MONTH_WIDTH + MONTH_WIDTH / 2 - 1;
  const isSelected = selectedId === date.id;

  return (
    <div
      data-interactive
      className={`date-marker ${isSelected ? "is-selected" : ""}`}
      style={{ left }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        setSelected(date.id);
      }}
      title={date.label}
    >
      <span className="date-marker-tab">{date.label}</span>
    </div>
  );
}
