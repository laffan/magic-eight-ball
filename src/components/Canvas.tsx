import { useCallback, useMemo, useRef, useState } from "react";
import {
  HEADER_HEIGHT,
  LANE_ROW_HEIGHT,
  LANE_ROW_PAD_TOP,
  MONTH_WIDTH,
  computeLanes,
  totalMonths,
  useStore,
  xToDateParts,
} from "../state/store";
import type { Lane } from "../state/store";
import TimelineGrid from "./TimelineGrid";
import YearDividers from "./YearDividers";
import LayerBar from "./LayerBar";
import DateMarker from "./DateMarker";
import BirthdayMarker from "./BirthdayMarker";
import TodayMarker from "./TodayMarker";
import CursorTooltip from "./CursorTooltip";
import AddMenu from "./AddMenu";

const MIN_DRAG_PX = 5;

type Draft = {
  startX: number;
  currentX: number;
  laneId: string | null;
  rowIndex: number;
  inDatesStrip: boolean;
};

type Cursor = { x: number; y: number; clientX: number; clientY: number } | null;

export default function Canvas() {
  const numYears = useStore((s) => s.numYears);
  const startYear = useStore((s) => s.startYear);
  const layers = useStore((s) => s.layers);
  const dates = useStore((s) => s.dates);
  const people = useStore((s) => s.people);
  const groups = useStore((s) => s.groups);
  const addLayer = useStore((s) => s.addLayer);
  const addDate = useStore((s) => s.addDate);
  const updateLayer = useStore((s) => s.updateLayer);
  const updateDate = useStore((s) => s.updateDate);
  const setSelected = useStore((s) => s.setSelected);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [cursor, setCursor] = useState<Cursor>(null);
  const [hoverSpanId, setHoverSpanId] = useState<string | null>(null);
  const [dragSpanId, setDragSpanId] = useState<string | null>(null);

  const onLayerHoverChange = useCallback((id: string, hovered: boolean) => {
    if (hovered) setHoverSpanId(id);
    else setHoverSpanId((cur) => (cur === id ? null : cur));
  }, []);

  const onLayerDragChange = useCallback((id: string, isDragging: boolean) => {
    if (isDragging) setDragSpanId(id);
    else setDragSpanId((cur) => (cur === id ? null : cur));
  }, []);

  const monthsTotal = totalMonths(numYears);
  const contentWidth = monthsTotal * MONTH_WIDTH;

  const { lanes, totalHeight } = useMemo(
    () => computeLanes({ layers, dates, people, groups }),
    [layers, dates, people, groups]
  );

  const importantDates = useMemo(() => dates.filter((d) => d.important), [dates]);

  const toContentCoords = useCallback((clientX: number, clientY: number) => {
    const el = contentRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const clampX = (x: number) => Math.max(0, Math.min(contentWidth - 1, x));

  const laneAtContentY = useCallback(
    (y: number): Lane | null => {
      for (const lane of lanes) {
        if (y >= lane.topY && y < lane.topY + lane.height) return lane;
      }
      return null;
    },
    [lanes]
  );

  const containerAtClientY = useCallback(
    (clientY: number): string | undefined => {
      const el = contentRef.current;
      if (!el) return undefined;
      const rect = el.getBoundingClientRect();
      const lane = laneAtContentY(clientY - rect.top);
      return lane?.id ?? undefined;
    },
    [laneAtContentY]
  );

  const onSpanDragEnd = (layerId: string, clientY: number) => {
    const containerId = containerAtClientY(clientY);
    updateLayer(layerId, { containerId });
  };

  const onDateDragEnd = (dateId: string, clientY: number) => {
    const containerId = containerAtClientY(clientY);
    updateDate(dateId, { containerId });
  };

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-interactive]")) return;

    const { x, y } = toContentCoords(e.clientX, e.clientY);
    if (y < HEADER_HEIGHT) return;

    const lane = laneAtContentY(y);
    if (!lane) return;

    const inDatesStrip = y < lane.rowsTopY;
    const rowIndex = inDatesStrip
      ? 0
      : Math.max(
          0,
          Math.floor((y - lane.rowsTopY - LANE_ROW_PAD_TOP) / LANE_ROW_HEIGHT)
        );

    setSelected(null);
    setDraft({
      startX: clampX(x),
      currentX: clampX(x),
      laneId: lane.id,
      rowIndex,
      inDatesStrip,
    });
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { x, y } = toContentCoords(e.clientX, e.clientY);
    setCursor({ x, y, clientX: e.clientX, clientY: e.clientY });
    if (draft) setDraft({ ...draft, currentX: clampX(x) });
  };

  const onMouseLeaveContent = () => {
    setCursor(null);
    if (draft) finishDraft();
  };

  const finishDraft = () => {
    if (!draft) return;
    const distance = Math.abs(draft.currentX - draft.startX);

    if (distance >= MIN_DRAG_PX && !draft.inDatesStrip) {
      const lo = Math.min(draft.startX, draft.currentX);
      const hi = Math.max(draft.startX, draft.currentX);
      const startMonth = Math.max(0, Math.min(monthsTotal - 1, Math.floor(lo / MONTH_WIDTH)));
      const endMonth = Math.max(0, Math.min(monthsTotal - 1, Math.floor(hi / MONTH_WIDTH)));
      addLayer(startMonth, endMonth, { containerId: draft.laneId ?? undefined });
    } else {
      const parts = xToDateParts(draft.startX, startYear);
      addDate(parts.monthIdx, parts.day, { containerId: draft.laneId ?? undefined });
    }

    setDraft(null);
  };

  const onMouseUp = () => finishDraft();

  const draftLayerRect = (() => {
    if (!draft || draft.inDatesStrip) return null;
    const distance = Math.abs(draft.currentX - draft.startX);
    if (distance < MIN_DRAG_PX) return null;
    const lane = lanes.find((l) => l.id === draft.laneId);
    if (!lane) return null;
    const lo = Math.min(draft.startX, draft.currentX);
    const hi = Math.max(draft.startX, draft.currentX);
    const left = Math.floor(lo / MONTH_WIDTH) * MONTH_WIDTH;
    const width =
      (Math.floor(hi / MONTH_WIDTH) - Math.floor(lo / MONTH_WIDTH) + 1) * MONTH_WIDTH;
    const top = lane.rowsTopY + LANE_ROW_PAD_TOP + draft.rowIndex * LANE_ROW_HEIGHT + 4;
    return { left, top, width };
  })();

  const draftDateX = (() => {
    if (!draft) return null;
    const distance = Math.abs(draft.currentX - draft.startX);
    if (distance >= MIN_DRAG_PX && !draft.inDatesStrip) return null;
    return draft.startX;
  })();

  return (
    <div className="canvas-wrapper">
      <div className="canvas-scroll" ref={scrollRef}>
        <div
          ref={contentRef}
          className="canvas-content"
          style={{
            width: contentWidth,
            minHeight: `max(${totalHeight}px, 100%)`,
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeaveContent}
        >
          <YearDividers />
          <TimelineGrid />

          {lanes.map((lane) => {
            const key = lane.id ?? "_default";
            return (
              <div
                key={key}
                className={`lane lane-${lane.kind}`}
                style={{ top: lane.topY, height: lane.height }}
              >
                <div
                  className="lane-dates-strip"
                  style={{ top: 0, height: lane.datesHeight }}
                >
                  {lane.kind !== "default" && (
                    <span className="lane-label" data-interactive>
                      {lane.label || " "}
                    </span>
                  )}
                  {lane.dotDates.map((d) => (
                    <DateMarker
                      key={d.id}
                      date={d}
                      mode="dot"
                      yCenter={lane.datesHeight / 2}
                      onDragEnd={onDateDragEnd}
                    />
                  ))}
                  {lane.kind === "person" && lane.person && (
                    <BirthdayMarker
                      person={lane.person}
                      yCenter={lane.datesHeight / 2}
                    />
                  )}
                </div>
                <div
                  className="lane-rows"
                  style={{ top: lane.datesHeight, height: lane.rowsHeight }}
                >
                  {lane.spans.map((layer, idx) => (
                    <LayerBar
                      key={layer.id}
                      layer={layer}
                      rowIndex={idx}
                      rowHeight={LANE_ROW_HEIGHT}
                      rowPadTop={LANE_ROW_PAD_TOP}
                      monthsTotal={monthsTotal}
                      onDragEnd={onSpanDragEnd}
                      onHoverChange={onLayerHoverChange}
                      onDragChange={onLayerDragChange}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          <TodayMarker />

          {/* Important dates render as full-height lines on top of everything */}
          <div className="dates-lines">
            {importantDates.map((d) => (
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
                height: LANE_ROW_HEIGHT - 8,
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

      {cursor &&
        (() => {
          // Span to show in the tooltip, in priority order:
          //  1. existing span currently being dragged (move/resize)
          //  2. existing span hovered by the cursor
          //  3. the in-progress draft if the user is drawing a new span
          let span: { startMonthIdx: number; endMonthIdx: number } | null = null;
          const activeId = dragSpanId ?? hoverSpanId;
          if (activeId) {
            const l = layers.find((x) => x.id === activeId);
            if (l) span = { startMonthIdx: l.startMonthIdx, endMonthIdx: l.endMonthIdx };
          } else if (draft && !draft.inDatesStrip) {
            const distance = Math.abs(draft.currentX - draft.startX);
            if (distance >= MIN_DRAG_PX) {
              const lo = Math.min(draft.startX, draft.currentX);
              const hi = Math.max(draft.startX, draft.currentX);
              span = {
                startMonthIdx: Math.max(
                  0,
                  Math.min(monthsTotal - 1, Math.floor(lo / MONTH_WIDTH))
                ),
                endMonthIdx: Math.max(
                  0,
                  Math.min(monthsTotal - 1, Math.floor(hi / MONTH_WIDTH))
                ),
              };
            }
          }
          return (
            <CursorTooltip
              x={cursor.clientX}
              y={cursor.clientY}
              contentX={cursor.x}
              span={span}
            />
          );
        })()}

      <AddMenu />
    </div>
  );
}
