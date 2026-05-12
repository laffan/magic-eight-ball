import { useEffect, useRef, useState } from "react";
import { MONTH_WIDTH, useStore } from "../state/store";
import type { Layer } from "../types";
import InlineLabelEditor from "./InlineLabelEditor";

type Props = {
  layer: Layer;
  rowIndex: number;
  rowHeight: number;
  rowPadTop: number;
  monthsTotal: number;
};

type DragMode = "move" | "resize-left" | "resize-right";

export default function LayerBar({ layer, rowIndex, rowHeight, rowPadTop, monthsTotal }: Props) {
  const selectedId = useStore((s) => s.selectedId);
  const setSelected = useStore((s) => s.setSelected);
  const updateLayer = useStore((s) => s.updateLayer);

  const [dragging, setDragging] = useState<DragMode | null>(null);
  const [editing, setEditing] = useState(false);
  const startRef = useRef<{ x: number; start: number; end: number } | null>(null);

  const isSelected = selectedId === layer.id;

  const top = rowPadTop + rowIndex * rowHeight + 4;
  const height = rowHeight - 8;
  const left = layer.startMonthIdx * MONTH_WIDTH;
  const width = (layer.endMonthIdx - layer.startMonthIdx + 1) * MONTH_WIDTH;

  const onMouseDown = (mode: DragMode) => (e: React.MouseEvent) => {
    if (editing) return;
    e.stopPropagation();
    if (e.button !== 0) return;
    setSelected(layer.id);
    setDragging(mode);
    startRef.current = {
      x: e.clientX,
      start: layer.startMonthIdx,
      end: layer.endMonthIdx,
    };
  };

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      if (!startRef.current) return;
      const dx = e.clientX - startRef.current.x;
      const dMonths = Math.round(dx / MONTH_WIDTH);
      const { start, end } = startRef.current;

      if (dragging === "move") {
        const span = end - start;
        let ns = start + dMonths;
        let ne = end + dMonths;
        if (ns < 0) {
          ns = 0;
          ne = span;
        }
        if (ne > monthsTotal - 1) {
          ne = monthsTotal - 1;
          ns = ne - span;
        }
        updateLayer(layer.id, { startMonthIdx: ns, endMonthIdx: ne });
      } else if (dragging === "resize-left") {
        const ns = Math.min(end, Math.max(0, start + dMonths));
        updateLayer(layer.id, { startMonthIdx: ns });
      } else if (dragging === "resize-right") {
        const ne = Math.max(start, Math.min(monthsTotal - 1, end + dMonths));
        updateLayer(layer.id, { endMonthIdx: ne });
      }
    };

    const onUp = () => {
      setDragging(null);
      startRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, layer.id, monthsTotal, updateLayer]);

  return (
    <div
      data-interactive
      className={`layer-bar ${isSelected ? "is-selected" : ""} ${dragging ? "is-dragging" : ""} ${editing ? "is-editing" : ""}`}
      style={{ left, top, width, height }}
      onMouseDown={onMouseDown("move")}
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
