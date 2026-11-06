import { useEffect, useRef, useState } from "react";
import { dateToEndX, dateToX, useStore, xToDateParts } from "../state/store";
import type { Layer } from "../types";
import InlineLabelEditor from "./InlineLabelEditor";

export type LayerDragMode = "move" | "resize-left" | "resize-right";

type Props = {
  layer: Layer;
  rowIndex: number;
  rowHeight: number;
  rowPadTop: number;
  monthsTotal: number;
  onDragEnd?: (id: string, clientY: number) => void;
  onHoverChange?: (id: string, hovered: boolean) => void;
  onDragChange?: (id: string, mode: LayerDragMode | null) => void;
};

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
  const addLayer = useStore((s) => s.addLayer);
  const updateLayer = useStore((s) => s.updateLayer);
  const startYear = useStore((s) => s.startYear);
  const monthWidth = useStore((s) => s.monthWidth);

  const [dragging, setDragging] = useState<LayerDragMode | null>(null);
  const [editing, setEditing] = useState(false);
  const startRef = useRef<DragStart | null>(null);
  // The id actually being mutated by this drag. Normally `layer.id`, but when
  // the user holds Option/Alt at mousedown we create a duplicate first and the
  // drag operates on the duplicate so the original stays in place.
  const dragIdRef = useRef<string>(layer.id);

  const isSelected = selectedId === layer.id;

  const top = rowPadTop + rowIndex * rowHeight + 4;
  const height = rowHeight - 8;
  const left = dateToX(layer.startMonthIdx, layer.startDayOfMonth, startYear, monthWidth);
  const rightX = dateToEndX(layer.endMonthIdx, layer.endDayOfMonth, startYear, monthWidth);
  const width = Math.max(2, rightX - left);

  const contentWidth = monthsTotal * monthWidth;

  const onMouseDown = (mode: LayerDragMode) => (e: React.MouseEvent) => {
    if (editing) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    let dragLayer: Layer = layer;
    if (mode === "move" && e.altKey) {
      dragLayer = addLayer(
        layer.startMonthIdx,
        layer.startDayOfMonth,
        layer.endMonthIdx,
        layer.endDayOfMonth,
        { label: layer.label, containerId: layer.containerId }
      );
    }

    if (dragLayer.id !== layer.id) updateLayer(dragLayer.id, {
      repeat: layer.repeat, repeatEveryDays: layer.repeatEveryDays, valueEffect: layer.valueEffect,
    });
    dragIdRef.current = dragLayer.id;
    setSelected(dragLayer.id);
    setDragging(mode);
    onDragChange?.(dragLayer.id, mode);
    startRef.current = {
      clientX: e.clientX,
      baseLeftX: dateToX(dragLayer.startMonthIdx, dragLayer.startDayOfMonth, startYear, monthWidth),
      baseRightX: dateToEndX(dragLayer.endMonthIdx, dragLayer.endDayOfMonth, startYear, monthWidth),
    };
  };

  useEffect(() => {
    if (!dragging) return;

    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const onMove = (e: MouseEvent) => {
      if (!startRef.current) return;
      const { clientX, baseLeftX, baseRightX } = startRef.current;
      const dx = e.clientX - clientX;
      const id = dragIdRef.current;

      if (dragging === "move") {
        const spanWidth = baseRightX - baseLeftX;
        let newLeftX = baseLeftX + dx;
        if (newLeftX < 0) newLeftX = 0;
        if (newLeftX + spanWidth > contentWidth) newLeftX = contentWidth - spanWidth;
        const newRightX = newLeftX + spanWidth;
        const startParts = xToDateParts(newLeftX, startYear, monthWidth);
        const endParts = xToDateParts(Math.max(0, newRightX - 0.5), startYear, monthWidth);
        updateLayer(id, {
          startMonthIdx: startParts.monthIdx,
          startDayOfMonth: startParts.day,
          endMonthIdx: endParts.monthIdx,
          endDayOfMonth: endParts.day,
        });
      } else if (dragging === "resize-left") {
        const newLeftX = Math.max(0, Math.min(baseRightX - 1, baseLeftX + dx));
        const parts = xToDateParts(newLeftX, startYear, monthWidth);
        updateLayer(id, {
          startMonthIdx: parts.monthIdx,
          startDayOfMonth: parts.day,
        });
      } else if (dragging === "resize-right") {
        const newRightX = Math.max(baseLeftX + 1, Math.min(contentWidth, baseRightX + dx));
        const parts = xToDateParts(Math.max(0, newRightX - 0.5), startYear, monthWidth);
        updateLayer(id, {
          endMonthIdx: parts.monthIdx,
          endDayOfMonth: parts.day,
        });
      }
    };

    const onUp = (e: MouseEvent) => {
      const id = dragIdRef.current;
      if (dragging === "move" && onDragEnd) onDragEnd(id, e.clientY);
      onDragChange?.(id, null);
      setDragging(null);
      startRef.current = null;
      dragIdRef.current = layer.id;
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
    monthWidth,
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
