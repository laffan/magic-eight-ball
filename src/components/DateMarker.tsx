import { useState } from "react";
import { generateDateOccurrences, useStore } from "../state/store";
import type { DateMark } from "../types";
import InlineLabelEditor from "./InlineLabelEditor";

type Props = {
  date: DateMark;
  mode: "dot" | "line";
};

export default function DateMarker({ date, mode }: Props) {
  const selectedId = useStore((s) => s.selectedId);
  const setSelected = useStore((s) => s.setSelected);
  const updateDate = useStore((s) => s.updateDate);
  const startYear = useStore((s) => s.startYear);
  const numYears = useStore((s) => s.numYears);
  const [editing, setEditing] = useState(false);

  const isSelected = selectedId === date.id;
  const occurrences = generateDateOccurrences(date, startYear, numYears);

  const commit = (next: string) => {
    const trimmed = next.trim();
    if (trimmed) updateDate(date.id, { label: trimmed });
    setEditing(false);
  };

  if (mode === "line") {
    return (
      <>
        {occurrences.map((occ, i) => {
          const showLabel = occ.isBase;
          return (
            <div
              key={`${date.id}-${i}`}
              data-interactive={occ.isBase ? "" : undefined}
              className={`date-line ${isSelected ? "is-selected" : ""} ${
                occ.isBase ? "is-base" : "is-repeat"
              }`}
              style={{ left: occ.x }}
              onMouseDown={(e) => occ.isBase && e.stopPropagation()}
              onClick={(e) => {
                if (!occ.isBase) return;
                e.stopPropagation();
                setSelected(date.id);
              }}
              onDoubleClick={(e) => {
                if (!occ.isBase) return;
                e.stopPropagation();
                setSelected(date.id);
                setEditing(true);
              }}
              title={date.label}
            >
              {showLabel && editing && (
                <InlineLabelEditor
                  className="date-line-label-input"
                  value={date.label}
                  onCommit={commit}
                  onCancel={() => setEditing(false)}
                />
              )}
              {showLabel && !editing && (
                <span className="date-line-label">{date.label}</span>
              )}
            </div>
          );
        })}
      </>
    );
  }

  // dot mode
  return (
    <>
      {occurrences.map((occ, i) => {
        const showLabel = occ.isBase;
        return (
          <div
            key={`${date.id}-${i}`}
            data-interactive={occ.isBase ? "" : undefined}
            className={`date-dot-wrap ${isSelected ? "is-selected" : ""} ${
              occ.isBase ? "is-base" : "is-repeat"
            }`}
            style={{ left: occ.x }}
            onMouseDown={(e) => occ.isBase && e.stopPropagation()}
            onClick={(e) => {
              if (!occ.isBase) return;
              e.stopPropagation();
              setSelected(date.id);
            }}
            onDoubleClick={(e) => {
              if (!occ.isBase) return;
              e.stopPropagation();
              setSelected(date.id);
              setEditing(true);
            }}
            title={date.label}
          >
            <span className="date-dot" />
            {showLabel && editing && (
              <InlineLabelEditor
                className="date-dot-label-input"
                value={date.label}
                onCommit={commit}
                onCancel={() => setEditing(false)}
              />
            )}
            {showLabel && !editing && (
              <span className="date-dot-label">{date.label}</span>
            )}
          </div>
        );
      })}
    </>
  );
}
