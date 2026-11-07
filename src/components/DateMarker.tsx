import { Fragment, useEffect, useRef, useState } from "react";
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
  onDragChange?: (id: string, dragging: boolean) => void;
};

export default function DateMarker({ date, mode, yCenter, onDragEnd, onDragChange }: Props) {
  const selectedId = useStore((s) => s.selectedId);
  const setSelected = useStore((s) => s.setSelected);
  const updateDate = useStore((s) => s.updateDate);
  const startYear = useStore((s) => s.startYear);
  const numYears = useStore((s) => s.numYears);
  const monthWidth = useStore((s) => s.monthWidth);

  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{
    clientX: number;
    monthIdx: number;
    day: number;
  } | null>(null);

  const isSelected = selectedId === date.id;
  const occurrences = generateDateOccurrences(date, startYear, numYears, monthWidth);
  const repeats = !!date.repeat && date.repeat !== "none";

  const commit = (next: string) => {
    const trimmed = next.trim();
    if (trimmed) updateDate(date.id, { label: trimmed });
    setEditing(false);
  };

  const startDotDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (editing) return;
    e.preventDefault();
    e.stopPropagation();
    setSelected(date.id);
    setDragging(true);
    onDragChange?.(date.id, true);
    dragStartRef.current = {
      clientX: e.clientX,
      monthIdx: date.monthIdx,
      day: date.dayOfMonth,
    };
  };

  useEffect(() => {
    if (!dragging) return;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    const onMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const baseX = dateToX(
        dragStartRef.current.monthIdx,
        dragStartRef.current.day,
        startYear,
        monthWidth
      );
      const newX = Math.max(0, baseX + (e.clientX - dragStartRef.current.clientX));
      const parts = xToDateParts(newX, startYear, monthWidth);
      updateDate(date.id, { monthIdx: parts.monthIdx, dayOfMonth: parts.day });
    };
    const onUp = (e: MouseEvent) => {
      if (onDragEnd) onDragEnd(date.id, e.clientY);
      onDragChange?.(date.id, false);
      setDragging(false);
      dragStartRef.current = null;
      document.body.style.userSelect = prevUserSelect;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = prevUserSelect;
    };
  }, [dragging, date.id, monthWidth, onDragChange, onDragEnd, startYear, updateDate]);

  if (mode === "line") {
    // Line and label are rendered as siblings with very different z-indices:
    // the line sits beneath other canvas content, the label tab sits above.
    return (
      <>
        {occurrences.map((occ, i) => {
          const lineStyle: React.CSSProperties = { left: occ.x };
          if (date.color) lineStyle.background = date.color;
          return (
            <Fragment key={`${date.id}-${i}`}>
              <div
                data-interactive={occ.isBase ? "" : undefined}
                className={`date-line ${isSelected ? "is-selected" : ""} ${
                  occ.isBase ? "is-base" : "is-repeat"
                }`}
                style={lineStyle}
                onMouseDown={(e) => occ.isBase && e.stopPropagation()}
                onClick={(e) => {
                  if (!occ.isBase) return;
                  e.stopPropagation();
                  setSelected(date.id);
                }}
                title={date.label}
              />
              {occ.isBase && (
                <div
                  data-interactive
                  className={`date-line-label-wrap ${isSelected ? "is-selected" : ""}`}
                  style={{ left: occ.x }}
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
                      className="date-line-label-input"
                      value={date.label}
                      onCommit={commit}
                      onCancel={() => setEditing(false)}
                    />
                  ) : (
                    <span
                      className="date-line-label"
                      style={date.color ? { borderColor: date.color } : undefined}
                    >
                      {date.label}
                    </span>
                  )}
                </div>
              )}
            </Fragment>
          );
        })}
      </>
    );
  }

  return (
    <>
      {occurrences.map((occ, i) => {
        const showLabel = occ.isBase;
        const style: React.CSSProperties = { left: occ.x, top: yCenter ?? "50%" };
        // For repeating dates each occurrence is a full dot (its own row, not a ghost).
        const variantClass = occ.isBase || repeats ? "is-base" : "is-repeat";
        const dotColor = date.valueEffect?.amount ? (date.valueEffect.amount > 0 ? "#4a9d5b" : "#d23a3a") : date.color;
        const dotStyle = dotColor
          ? ({ background: dotColor, borderColor: dotColor } as React.CSSProperties)
          : undefined;
        return (
          <div
            key={`${date.id}-${i}`}
            data-interactive={occ.isBase ? "" : undefined}
            className={`date-dot-wrap ${isSelected ? "is-selected" : ""} ${variantClass}`}
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
            <span className="date-dot" style={dotStyle} />
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
