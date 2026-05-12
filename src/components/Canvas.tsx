import { useCallback, useRef, useState } from "react";
import { MONTH_WIDTH, totalMonths, useStore } from "../state/store";
import TimelineGrid from "./TimelineGrid";
import YearDividers from "./YearDividers";
import LayerBar from "./LayerBar";
import DateMarker from "./DateMarker";
import AddMenu from "./AddMenu";

const HEADER_HEIGHT = 64;
const ROW_HEIGHT = 36;
const ROW_PAD_TOP = 12;
const MIN_DRAG_PX = 5;

type Draft = {
  active: boolean;
  startX: number;
  currentX: number;
  rowIndex: number;
  startedAt: number;
};

export default function Canvas() {
  const numYears = useStore((s) => s.numYears);
  const layers = useStore((s) => s.layers);
  const dates = useStore((s) => s.dates);
  const addLayer = useStore((s) => s.addLayer);
  const addDate = useStore((s) => s.addDate);
  const setSelected = useStore((s) => s.setSelected);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [draft, setDraft] = useState<Draft | null>(null);

  const monthsTotal = totalMonths(numYears);
  const contentWidth = monthsTotal * MONTH_WIDTH;
  const minRows = Math.max(layers.length + 1, 8);
  const rowsAreaHeight = minRows * ROW_HEIGHT + ROW_PAD_TOP;

  const toContentCoords = useCallback((clientX: number, clientY: number) => {
    const el = contentRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const monthFromX = (x: number) =>
    Math.max(0, Math.min(monthsTotal - 1, Math.floor(x / MONTH_WIDTH)));

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-interactive]")) return;

    const { x, y } = toContentCoords(e.clientX, e.clientY);
    if (y < HEADER_HEIGHT) return;

    const rowIndex = Math.max(
      0,
      Math.floor((y - HEADER_HEIGHT - ROW_PAD_TOP) / ROW_HEIGHT)
    );

    setSelected(null);
    setDraft({
      active: true,
      startX: x,
      currentX: x,
      rowIndex,
      startedAt: Date.now(),
    });
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draft?.active) return;
    const { x } = toContentCoords(e.clientX, e.clientY);
    setDraft({ ...draft, currentX: x });
  };

  const finishDraft = () => {
    if (!draft) return;
    const distance = Math.abs(draft.currentX - draft.startX);

    if (distance >= MIN_DRAG_PX) {
      const startMonth = monthFromX(Math.min(draft.startX, draft.currentX));
      const endMonth = monthFromX(Math.max(draft.startX, draft.currentX));
      addLayer(startMonth, endMonth);
    } else {
      const monthIdx = monthFromX(draft.startX);
      addDate(monthIdx);
    }

    setDraft(null);
  };

  const onMouseUp = () => finishDraft();
  const onMouseLeave = () => {
    if (draft?.active) finishDraft();
  };

  const draftRect = draft
    ? (() => {
        const lo = Math.min(draft.startX, draft.currentX);
        const hi = Math.max(draft.startX, draft.currentX);
        const isDrag = hi - lo >= MIN_DRAG_PX;
        return {
          isDrag,
          left: isDrag
            ? Math.floor(lo / MONTH_WIDTH) * MONTH_WIDTH
            : Math.floor(draft.startX / MONTH_WIDTH) * MONTH_WIDTH,
          width: isDrag
            ? (Math.floor(hi / MONTH_WIDTH) - Math.floor(lo / MONTH_WIDTH) + 1) * MONTH_WIDTH
            : MONTH_WIDTH,
          top: HEADER_HEIGHT + ROW_PAD_TOP + draft.rowIndex * ROW_HEIGHT,
        };
      })()
    : null;

  return (
    <div className="canvas-wrapper">
      <div
        className="canvas-scroll"
        ref={scrollRef}
      >
        <div
          ref={contentRef}
          className="canvas-content"
          style={{ width: contentWidth, minHeight: HEADER_HEIGHT + rowsAreaHeight }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
        >
          <YearDividers />
          <TimelineGrid />

          <div
            className="rows-area"
            style={{ top: HEADER_HEIGHT, height: rowsAreaHeight }}
          >
            {layers.map((layer, idx) => (
              <LayerBar
                key={layer.id}
                layer={layer}
                rowIndex={idx}
                rowHeight={ROW_HEIGHT}
                rowPadTop={ROW_PAD_TOP}
                monthsTotal={monthsTotal}
              />
            ))}
          </div>

          <div className="dates-overlay" style={{ width: contentWidth }}>
            {dates.map((d) => (
              <DateMarker key={d.id} date={d} />
            ))}
          </div>

          {draftRect && draftRect.isDrag && (
            <div
              className="draft-preview is-layer"
              style={{
                left: draftRect.left,
                top: draftRect.top,
                width: draftRect.width,
                height: ROW_HEIGHT - 8,
              }}
            />
          )}
          {draftRect && !draftRect.isDrag && (
            <div
              className="draft-preview is-date"
              style={{
                left: draftRect.left + MONTH_WIDTH / 2 - 1,
                top: 0,
                width: 2,
                height: "100%",
              }}
            />
          )}
        </div>
      </div>

      <AddMenu />
    </div>
  );
}
