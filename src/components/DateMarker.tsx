import { useState } from "react";
import { MONTH_WIDTH, useStore } from "../state/store";
import type { DateMark } from "../types";
import InlineLabelEditor from "./InlineLabelEditor";

export default function DateMarker({ date }: { date: DateMark }) {
  const selectedId = useStore((s) => s.selectedId);
  const setSelected = useStore((s) => s.setSelected);
  const updateDate = useStore((s) => s.updateDate);
  const [editing, setEditing] = useState(false);

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
      onDoubleClick={(e) => {
        e.stopPropagation();
        setSelected(date.id);
        setEditing(true);
      }}
      title={date.label}
    >
      {editing ? (
        <InlineLabelEditor
          className="date-marker-tab-input"
          value={date.label}
          onCommit={(next) => {
            const trimmed = next.trim();
            if (trimmed) updateDate(date.id, { label: trimmed });
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <span className="date-marker-tab">{date.label}</span>
      )}
    </div>
  );
}
