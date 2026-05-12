import { useCallback, useRef, useState } from "react";
import { MONTH_WIDTH, totalMonths, useStore, xToDateParts } from "../state/store";
import TimelineGrid from "./TimelineGrid";
import YearDividers from "./YearDividers";
import LayerBar from "./LayerBar";
import DateMarker from "./DateMarker";
import BirthdayMarker from "./BirthdayMarker";
import TodayMarker from "./TodayMarker";
import CursorTooltip from "./CursorTooltip";
import AddMenu from "./AddMenu";

const HEADER_HEIGHT = 64;
export const DATES_STRIP_HEIGHT = 36;
const ROW_HEIGHT = 36;
const ROW_PAD_TOP = 12;
const MIN_DRAG_PX = 5;

type Draft = {
  active: boolean;
  startX: number;
  currentX: number;
  rowIndex: number;
  allowLayer: boolean;
};

type Cursor = { x: number; y: number; clientX: number; clientY: number } | null;

export default function Canvas() {
  const numYears = useStore((s) => s.numYears);
  const layers = useStore((s) => s.layers);
  const dates = useStore((s) => s.dates);
  const people = useStore((s) => s.people);
  const startYear = useStore((s) => s.startYear);
  const addLayer = useStore((s) => s.addLayer);
  const addDate = useStore((s) => s.addDate);
  const setSelected = useStore((s) => s.setSelected);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [cursor, setCursor] = useState<Cursor>(null);

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

  const clampX = (x: number) => Math.max(0, Math.min(contentWidth - 1, x));

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-interactive]")) return;

    const { x, y } = toContentCoords(e.clientX, e.clientY);
    if (y < HEADER_HEIGHT) return;

    const rowsAreaStart = HEADER_HEIGHT + DATES_STRIP_HEIGHT;
    const inDatesStrip = y < rowsAreaStart;
    const rowIndex = Math.max(
      0,
      Math.floor((y - rowsAreaStart - ROW_PAD_TOP) / ROW_HEIGHT)
    );

    setSelected(null);
    setDraft({
      active: true,
      startX: clampX(x),
      currentX: clampX(x),
      rowIndex,
      allowLayer: !inDatesStrip,
    });
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { x, y } = toContentCoords(e.clientX, e.clientY);
    setCursor({ x, y, clientX: e.clientX, clientY: e.clientY });
    if (draft?.active) {
      setDraft({ ...draft, currentX: clampX(x) });
    }
  };

  const onMouseLeaveContent = () => {
    setCursor(null);
    if (draft?.active) finishDraft();
  };

  const finishDraft = () => {
    if (!draft) return;
    const distance = Math.abs(draft.currentX - draft.startX);

    if (distance >= MIN_DRAG_PX && draft.allowLayer) {
      const lo = Math.min(draft.startX, draft.currentX);
      const hi = Math.max(draft.startX, draft.currentX);
      const startMonth = Math.max(0, Math.min(monthsTotal - 1, Math.floor(lo / MONTH_WIDTH)));
      const endMonth = Math.max(0, Math.min(monthsTotal - 1, Math.floor(hi / MONTH_WIDTH)));
      addLayer(startMonth, endMonth);
    } else {
      const parts = xToDateParts(draft.startX, startYear);
      addDate(parts.monthIdx, parts.day);
    }

    setDraft(null);
  };

  const onMouseUp = () => finishDraft();

  const draftLayerRect = (() => {
    if (!draft) return null;
    const distance = Math.abs(draft.currentX - draft.startX);
    if (distance < MIN_DRAG_PX || !draft.allowLayer) return null;
    const lo = Math.min(draft.startX, draft.currentX);
    const hi = Math.max(draft.startX, draft.currentX);
    const left = Math.floor(lo / MONTH_WIDTH) * MONTH_WIDTH;
    const width = (Math.floor(hi / MONTH_WIDTH) - Math.floor(lo / MONTH_WIDTH) + 1) * MONTH_WIDTH;
    const top =
      HEADER_HEIGHT + DATES_STRIP_HEIGHT + ROW_PAD_TOP + draft.rowIndex * ROW_HEIGHT + 4;
    return { left, top, width };
  })();

  const draftDateX = (() => {
    if (!draft) return null;
    const distance = Math.abs(draft.currentX - draft.startX);
    if (distance >= MIN_DRAG_PX && draft.allowLayer) return null;
    return draft.startX;
  })();

  return (
    <div className="canvas-wrapper">
      <div className="canvas-scroll" ref={scrollRef}>
        <div
          ref={contentRef}
          className="canvas-content"
          style={{ width: contentWidth }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeaveContent}
        >
          <YearDividers />
          <TimelineGrid />

          {/* Dates strip — labeled dots float here under the header. */}
          <div className="dates-strip" style={{ height: DATES_STRIP_HEIGHT }}>
            {dates
              .filter((d) => !d.important)
              .map((d) => (
                <DateMarker key={d.id} date={d} mode="dot" />
              ))}
            {people.map((p) => (
              <BirthdayMarker key={p.id} person={p} />
            ))}
          </div>

          <div className="rows-area" style={{ height: rowsAreaHeight }}>
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

          <TodayMarker />

          {/* Full-height lines for important dates, layered over everything. */}
          <div className="dates-lines">
            {dates
              .filter((d) => d.important)
              .map((d) => (
                <DateMarker key={d.id} date={d} mode="line" />
              ))}
          </div>

          {draftLayerRect && (
            <div
              className="draft-preview is-layer"
              style={{
                left: draftLayerRect.left,
                top: draftLayerRect.top,
                width: draftLayerRect.width,
                height: ROW_HEIGHT - 8,
              }}
            />
          )}
          {draftDateX !== null && (
            <div
              className="draft-preview is-date"
              style={{ left: draftDateX - 1, top: 0, width: 2, height: "100%" }}
            />
          )}
        </div>
      </div>

      {cursor && !draft && (
        <CursorTooltip
          x={cursor.clientX}
          y={cursor.clientY}
          contentX={cursor.x}
        />
      )}

      <AddMenu />
    </div>
  );
}
