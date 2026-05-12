import { useEffect, useRef, useState } from "react";
import {
  dateToX,
  generateDateOccurrences,
  useStore,
  xToDateParts,
} from "../state/store";
import type { DateMark } from "../types";
import InlineLabelEditor from "./InlineLabelEditor";

type Props = {
  date: DateMark;
  mode: "dot" | "line";
  yCenter?: number;
  onDragEnd?: (id: string, clientY: number) => void;
};

export default function DateMarker({ date, mode, yCenter, onDragEnd }: Props) {
  const selectedId = useStore((s) => s.selectedId);
  const setSelected = useStore((s) => s.setSelected);
  const updateDate = useStore((s) => s.updateDate);
  const startYear = useStore((s) => s.startYear);
  const numYears = useStore((s) => s.numYears);

  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{
    clientX: number;
    monthIdx: number;
    day: number;
  } | null>(null);

  const isSelected = selectedId === date.id;
  const occurrences = generateDateOccurrences(date, startYear, numYears);

  const commit = (next: string) => {
    const trimmed = next.trim();
    if (trimmed) updateDate(date.id, { label: trimmed });
    setEditing(false);
  };

  const startDotDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (editing) return;
    e.stopPropagation();
    setSelected(date.id);
    setDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      monthIdx: date.monthIdx,
      day: date.dayOfMonth,
    };
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const baseX = dateToX(
        dragStartRef.current.monthIdx,
        dragStartRef.current.day,
        startYear
      );
      const newX = Math.max(0, baseX + (e.clientX - dragStartRef.current.clientX));
      const parts = xToDateParts(newX, startYear);
      updateDate(date.id, { monthIdx: parts.monthIdx, dayOfMonth: parts.day });
    };
    const onUp = (e: MouseEvent) => {
      if (onDragEnd) onDragEnd(date.id, e.clientY);
      setDragging(false);
      dragStartRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, date.id, onDragEnd, startYear, updateDate]);

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

  return (
    <>
      {occurrences.map((occ, i) => {
        const showLabel = occ.isBase;
        const style = { left: occ.x, top: yCenter ?? "50%" } as const;
        return (
          <div
            key={`${date.id}-${i}`}
            data-interactive={occ.isBase ? "" : undefined}
            className={`date-dot-wrap ${isSelected ? "is-selected" : ""} ${
              occ.isBase ? "is-base" : "is-repeat"
            }`}
            style={style}
            onMouseDown={occ.isBase ? startDotDrag : undefined}
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

