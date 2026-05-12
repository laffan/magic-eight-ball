import { useEffect, useRef, useState } from "react";
import {
  MONTH_WIDTH,
  dateToEndX,
  dateToX,
  useStore,
  xToDateParts,
} from "../state/store";
import type { Layer } from "../types";
import InlineLabelEditor from "./InlineLabelEditor";

type Props = {
  layer: Layer;
  rowIndex: number;
  rowHeight: number;
  rowPadTop: number;
  monthsTotal: number;
  onDragEnd?: (id: string, clientY: number) => void;
  onHoverChange?: (id: string, hovered: boolean) => void;
  onDragChange?: (id: string, dragging: boolean) => void;
};

type DragMode = "move" | "resize-left" | "resize-right";

type DragStart = {
  clientX: number;
  baseLeftX: number;
  baseRightX: number;
};

export default function LayerBar({
  layer,
  rowIndex,
  rowHeight,
  rowPadTop,
  monthsTotal,
  onDragEnd,
  onHoverChange,
  onDragChange,
}: Props) {
  const selectedId = useStore((s) => s.selectedId);
  const setSelected = useStore((s) => s.setSelected);
  const updateLayer = useStore((s) => s.updateLayer);
  const startYear = useStore((s) => s.startYear);

  const [dragging, setDragging] = useState<DragMode | null>(null);
  const [editing, setEditing] = useState(false);
  const startRef = useRef<DragStart | null>(null);

  const isSelected = selectedId === layer.id;

  const top = rowPadTop + rowIndex * rowHeight + 4;
  const height = rowHeight - 8;
  const left = dateToX(layer.startMonthIdx, layer.startDayOfMonth, startYear);
  const rightX = dateToEndX(layer.endMonthIdx, layer.endDayOfMonth, startYear);
  const width = Math.max(2, rightX - left);

  const contentWidth = monthsTotal * MONTH_WIDTH;

  const onMouseDown = (mode: DragMode) => (e: React.MouseEvent) => {
    if (editing) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setSelected(layer.id);
    setDragging(mode);
    onDragChange?.(layer.id, true);
    startRef.current = {
      clientX: e.clientX,
      baseLeftX: dateToX(layer.startMonthIdx, layer.startDayOfMonth, startYear),
      baseRightX: dateToEndX(layer.endMonthIdx, layer.endDayOfMonth, startYear),
    };
  };

  useEffect(() => {
    if (!dragging) return;

    // Suppress text selection while a span drag is in progress.
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const onMove = (e: MouseEvent) => {
      if (!startRef.current) return;
      const { clientX, baseLeftX, baseRightX } = startRef.current;
      const dx = e.clientX - clientX;

      if (dragging === "move") {
        const spanWidth = baseRightX - baseLeftX;
        let newLeftX = baseLeftX + dx;
        if (newLeftX < 0) newLeftX = 0;
        if (newLeftX + spanWidth > contentWidth) newLeftX = contentWidth - spanWidth;
        const newRightX = newLeftX + spanWidth;
        const startParts = xToDateParts(newLeftX, startYear);
        const endParts = xToDateParts(Math.max(0, newRightX - 0.5), startYear);
        updateLayer(layer.id, {
          startMonthIdx: startParts.monthIdx,
          startDayOfMonth: startParts.day,
          endMonthIdx: endParts.monthIdx,
          endDayOfMonth: endParts.day,
        });
      } else if (dragging === "resize-left") {
        const newLeftX = Math.max(0, Math.min(baseRightX - 1, baseLeftX + dx));
        const parts = xToDateParts(newLeftX, startYear);
        updateLayer(layer.id, {
          startMonthIdx: parts.monthIdx,
          startDayOfMonth: parts.day,
        });
      } else if (dragging === "resize-right") {
        const newRightX = Math.max(
          baseLeftX + 1,
          Math.min(contentWidth, baseRightX + dx)
        );
        const parts = xToDateParts(Math.max(0, newRightX - 0.5), startYear);
        updateLayer(layer.id, {
          endMonthIdx: parts.monthIdx,
          endDayOfMonth: parts.day,
        });
      }
    };

    const onUp = (e: MouseEvent) => {
      if (dragging === "move" && onDragEnd) onDragEnd(layer.id, e.clientY);
      onDragChange?.(layer.id, false);
      setDragging(null);
      startRef.current = null;
      document.body.style.userSelect = prevUserSelect;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = prevUserSelect;
    };
  }, [
    dragging,
    layer.id,
    contentWidth,
    onDragChange,
    onDragEnd,
    startYear,
    updateLayer,
  ]);

  return (
    <div
      data-interactive
      className={`layer-bar ${isSelected ? "is-selected" : ""} ${dragging ? "is-dragging" : ""} ${editing ? "is-editing" : ""}`}
      style={{ left, top, width, height }}
      onMouseDown={onMouseDown("move")}
      onMouseEnter={() => onHoverChange?.(layer.id, true)}
      onMouseLeave={() => onHoverChange?.(layer.id, false)}
      onClick={(e) => {
        e.stopPropagation();
        setSelected(layer.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setSelected(layer.id);
        setEditing(true);
      }}
      title={layer.label}
    >
      <span
        className="layer-handle layer-handle-left"
        onMouseDown={onMouseDown("resize-left")}
        data-interactive
      />
      {editing ? (
        <InlineLabelEditor
          className="layer-label-input"
          value={layer.label}
          onCommit={(next) => {
            const trimmed = next.trim();
            if (trimmed) updateLayer(layer.id, { label: trimmed });
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <span className="layer-label">{layer.label}</span>
      )}
      <span
        className="layer-handle layer-handle-right"
        onMouseDown={onMouseDown("resize-right")}
        data-interactive
      />
    </div>
  );
}
