import ValueGraphs from "./ValueGraphs";
import RepeatSpans from "./RepeatSpans";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HEADER_HEIGHT,
  LANE_ROW_HEIGHT,
  LANE_ROW_PAD_TOP,
  birthdayKey,
  computeLanes,
  dateToEndX,
  dateToX,
  generateBirthdayOccurrences,
  laneKey,
  laneYCenter,
  totalMonths,
  useStore,
  xToDateParts,
} from "../state/store";
import type { Lane } from "../state/store";
import TimelineGrid from "./TimelineGrid";
import YearDividers from "./YearDividers";
import LayerBar from "./LayerBar";
import type { LayerDragMode } from "./LayerBar";
import DateMarker from "./DateMarker";
import BirthdayMarker from "./BirthdayMarker";
import TodayMarker from "./TodayMarker";
import CursorTooltip from "./CursorTooltip";
import AddMenu from "./AddMenu";
import ZoomSlider from "./ZoomSlider";

const MIN_DRAG_PX = 5;

type Draft = {
  startX: number;
  currentX: number;
  laneId: string | null;
  rowIndex: number;
  inDatesStrip: boolean;
};

type Cursor = { x: number; y: number; clientX: number; clientY: number } | null;

type SpanDrag = { id: string; mode: LayerDragMode };

export default function Canvas() {
  const values = useStore(s => s.values);
  const numYears = useStore((s) => s.numYears);
  const startYear = useStore((s) => s.startYear);
  const layers = useStore((s) => s.layers);
  const dates = useStore((s) => s.dates);
  const people = useStore((s) => s.people);
  const groups = useStore((s) => s.groups);
  const monthWidth = useStore((s) => s.monthWidth);
  const monthsVisible = useStore((s) => s.monthsVisible);
  const setMonthWidth = useStore((s) => s.setMonthWidth);
  const addLayer = useStore((s) => s.addLayer);
  const addDate = useStore((s) => s.addDate);
  const updateLayer = useStore((s) => s.updateLayer);
  const updateDate = useStore((s) => s.updateDate);
  const setSelected = useStore((s) => s.setSelected);
  const scrollToTarget = useStore((s) => s.scrollToTarget);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [cursor, setCursor] = useState<Cursor>(null);
  const [hoverSpanId, setHoverSpanId] = useState<string | null>(null);
  const [spanDrag, setSpanDrag] = useState<SpanDrag | null>(null);
  const [dragDateId, setDragDateId] = useState<string | null>(null);
  const [dropLaneKey, setDropLaneKey] = useState<string | null>(null);

  // Keep monthWidth in step with the visible scroll viewport. The slider
  // chooses how many months fit; this effect rescales monthWidth accordingly
  // whenever the viewport resizes or the zoom changes.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const recompute = () => {
      const w = el.clientWidth;
      if (w > 0) setMonthWidth(w / monthsVisible);
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [monthsVisible, setMonthWidth]);

  const onLayerHoverChange = useCallback((id: string, hovered: boolean) => {
    if (hovered) setHoverSpanId(id);
    else setHoverSpanId((cur) => (cur === id ? null : cur));
  }, []);

  const onLayerDragChange = useCallback(
    (id: string, mode: LayerDragMode | null) => {
      if (mode) setSpanDrag({ id, mode });
      else setSpanDrag((cur) => (cur?.id === id ? null : cur));
    },
    []
  );

  const onDateDragChange = useCallback((id: string, isDragging: boolean) => {
    if (isDragging) setDragDateId(id);
    else setDragDateId((cur) => (cur === id ? null : cur));
  }, []);

  const monthsTotal = totalMonths(numYears);
  const contentWidth = monthsTotal * monthWidth;

  const { lanes, totalHeight } = useMemo(
    () =>
      computeLanes({
        layers,
        dates,
        people,
        groups,
        startYear,
        numYears,
        monthWidth,
      }),
    [layers, dates, people, groups, startYear, numYears, monthWidth]
  );

  const importantDates = useMemo(() => dates.filter((d) => d.important), [dates]);

  // Scroll the canvas to bring a requested item into view (horizontally
  // centered, vertically into view if its lane is off-screen).
  useEffect(() => {
    if (!scrollToTarget) return;
    const el = scrollRef.current;
    if (!el) return;

    const id = scrollToTarget.id;
    let targetX: number | null = null;
    let targetY: number | null = null;

    const valueIndex = values.findIndex(v => v.id === id);
    if (valueIndex >= 0) {
      targetY = totalHeight + valueIndex * 110 + 55;
      const date = new Date(values[valueIndex].startDate + "T00:00:00Z");
      targetX = dateToX((date.getUTCFullYear()-startYear)*12+date.getUTCMonth(),date.getUTCDate(),startYear,monthWidth);
    }
    const layer = layers.find((l) => l.id === id);
    if (layer) {
      const sx = dateToX(layer.startMonthIdx, layer.startDayOfMonth, startYear, monthWidth);
      const ex = dateToEndX(layer.endMonthIdx, layer.endDayOfMonth, startYear, monthWidth);
      targetX = (sx + ex) / 2;
    }
    if (targetX === null) {
      const date = dates.find((d) => d.id === id);
      if (date) targetX = dateToX(date.monthIdx, date.dayOfMonth, startYear, monthWidth);
    }
    if (targetX === null) {
      const person = people.find((p) => p.id === id);
      if (person) {
        const occs = generateBirthdayOccurrences(person, startYear, numYears, monthWidth);
        if (occs.length) targetX = occs[0].x;
      }
    }
    if (targetX === null) {
      const group = groups.find((g) => g.id === id);
      if (group) {
        const firstLayer = layers.find((l) => l.containerId === group.id);
        if (firstLayer) {
          targetX = dateToX(
            firstLayer.startMonthIdx,
            firstLayer.startDayOfMonth,
            startYear,
            monthWidth
          );
        } else {
          const firstDate = dates.find((d) => d.containerId === group.id);
          if (firstDate)
            targetX = dateToX(firstDate.monthIdx, firstDate.dayOfMonth, startYear, monthWidth);
        }
      }
    }

    // Find which lane (vertically) contains the item.
    for (const lane of lanes) {
      const isOwnLane = lane.id === id;
      const ownsSpan = lane.spans.some((l) => l.id === id);
      const ownsDot = lane.dotDates.some((d) => d.id === id);
      const ownsImportant = (() => {
        const d = dates.find((x) => x.id === id);
        return d?.important && (d.containerId ?? null) === lane.id;
      })();
      if (isOwnLane || ownsSpan || ownsDot || ownsImportant) {
        targetY = lane.topY + lane.height / 2;
        break;
      }
    }

    if (targetX === null && targetY === null) return;

    const left =
      targetX !== null
        ? Math.max(0, targetX - el.clientWidth / 2)
        : el.scrollLeft;
    const top =
      targetY !== null
        ? Math.max(0, targetY - el.clientHeight / 2)
        : el.scrollTop;

    el.scrollTo({ left, top, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToTarget]);

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

  // Lane highlight + cursor follow during any item drag.
  useEffect(() => {
    if (!spanDrag && !dragDateId) {
      setDropLaneKey(null);
      return;
    }
    const onMove = (e: MouseEvent) => {
      const el = contentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setCursor({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        clientX: e.clientX,
        clientY: e.clientY,
      });
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!inside) {
        setDropLaneKey(null);
        return;
      }
      const lane = laneAtContentY(e.clientY - rect.top);
      setDropLaneKey(lane ? laneKey(lane) : null);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [spanDrag, dragDateId, laneAtContentY]);

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

    e.preventDefault();

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
    if (!spanDrag && !dragDateId) setCursor(null);
    if (draft) finishDraft();
  };

  const finishDraft = () => {
    if (!draft) return;
    const distance = Math.abs(draft.currentX - draft.startX);

    if (distance >= MIN_DRAG_PX && !draft.inDatesStrip) {
      const lo = Math.min(draft.startX, draft.currentX);
      const hi = Math.max(draft.startX, draft.currentX);
      const startParts = xToDateParts(lo, startYear, monthWidth);
      const endParts = xToDateParts(Math.max(0, hi - 0.5), startYear, monthWidth);
      addLayer(
        startParts.monthIdx,
        startParts.day,
        endParts.monthIdx,
        endParts.day,
        { containerId: draft.laneId ?? undefined }
      );
    } else {
      const parts = xToDateParts(draft.startX, startYear, monthWidth);
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
    const top = lane.rowsTopY + LANE_ROW_PAD_TOP + draft.rowIndex * LANE_ROW_HEIGHT + 4;
    return { left: lo, top, width: Math.max(2, hi - lo) };
  })();

  const draftDateX = (() => {
    if (!draft) return null;
    const distance = Math.abs(draft.currentX - draft.startX);
    if (distance >= MIN_DRAG_PX && !draft.inDatesStrip) return null;
    return draft.startX;
  })();

  // Tooltip content
  let tooltipSpan: { startMonthIdx: number; endMonthIdx: number } | null = null;
  let tooltipFocus: { monthIdx: number; day: number } | null = null;

  if (spanDrag) {
    const l = layers.find((x) => x.id === spanDrag.id);
    if (l) {
      if (spanDrag.mode === "resize-left") {
        tooltipFocus = { monthIdx: l.startMonthIdx, day: l.startDayOfMonth };
      } else if (spanDrag.mode === "resize-right") {
        tooltipFocus = { monthIdx: l.endMonthIdx, day: l.endDayOfMonth };
      } else {
        tooltipSpan = { startMonthIdx: l.startMonthIdx, endMonthIdx: l.endMonthIdx };
      }
    }
  } else if (hoverSpanId) {
    const l = layers.find((x) => x.id === hoverSpanId);
    if (l) tooltipSpan = { startMonthIdx: l.startMonthIdx, endMonthIdx: l.endMonthIdx };
  } else if (draft && !draft.inDatesStrip) {
    const distance = Math.abs(draft.currentX - draft.startX);
    if (distance >= MIN_DRAG_PX) {
      const lo = Math.min(draft.startX, draft.currentX);
      const hi = Math.max(draft.startX, draft.currentX);
      tooltipSpan = {
        startMonthIdx: Math.max(0, Math.min(monthsTotal - 1, Math.floor(lo / monthWidth))),
        endMonthIdx: Math.max(0, Math.min(monthsTotal - 1, Math.floor(hi / monthWidth))),
      };
    }
  }

  // Drag ghost: floating label following the cursor while a span or date is dragged.
  let ghostLabel: string | null = null;
  let ghostGlyph = "•";
  if (spanDrag) {
    const l = layers.find((x) => x.id === spanDrag.id);
    if (l) {
      ghostLabel = l.label;
      ghostGlyph = "▭";
    }
  } else if (dragDateId) {
    const d = dates.find((x) => x.id === dragDateId);
    if (d) {
      ghostLabel = d.label;
      ghostGlyph = d.important ? "│" : "•";
    }
  }

  return (
    <div className="canvas-wrapper">
      <div className="canvas-scroll" ref={scrollRef}>
        <div
          ref={contentRef}
          className="canvas-content"
          style={{
            width: contentWidth,
            minHeight: `max(${totalHeight + values.length * 110}px, 100%)`,
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeaveContent}
        >
          <YearDividers />
          <TimelineGrid />

          {lanes.map((lane) => {
            const key = laneKey(lane);
            const isDrop = dropLaneKey === key;
            return (
              <div
                key={key}
                className={`lane lane-${lane.kind} ${isDrop ? "is-drop-target" : ""}`}
                style={{ top: lane.topY, height: lane.height }}
              >
                <div
                  className="lane-dates-strip"
                  style={{ top: 0, height: lane.datesHeight }}
                >
                  {lane.kind !== "default" && (
                    <span className="lane-label" data-interactive>
                      {lane.label || " "}
                    </span>
                  )}
                  {lane.dotDates.map((d) => {
                    const level = lane.stackLevels.get(d.id) ?? 0;
                    return (
                      <DateMarker
                        key={d.id}
                        date={d}
                        mode="dot"
                        yCenter={laneYCenter(lane, level)}
                        onDragEnd={onDateDragEnd}
                        onDragChange={onDateDragChange}
                      />
                    );
                  })}
                  {lane.kind === "person" && lane.person && (
                    <BirthdayMarker
                      person={lane.person}
                      yCenter={laneYCenter(
                        lane,
                        lane.stackLevels.get(birthdayKey(lane.person.id)) ?? 0
                      )}
                    />
                  )}
                </div>
                <div
                  className="lane-rows"
                  style={{ top: lane.datesHeight, height: lane.rowsHeight }}
                >
                  {lane.spans.map((layer, idx) => <RepeatSpans key={layer.id} layer={layer} rowIndex={idx} />)}
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

          <ValueGraphs top={totalHeight} />
          <TodayMarker />

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

      {cursor && (
        <CursorTooltip
          x={cursor.clientX}
          y={cursor.clientY}
          contentX={cursor.x}
          span={tooltipSpan}
          focusDate={tooltipFocus}
        />
      )}

      {ghostLabel && cursor && (
        <div
          className="canvas-drag-ghost"
          style={{ left: cursor.clientX + 14, top: cursor.clientY - 22 }}
        >
          <span className="canvas-drag-ghost-glyph">{ghostGlyph}</span>
          <span className="canvas-drag-ghost-label">{ghostLabel}</span>
        </div>
      )}

      <div className="canvas-toolbar">
        <AddMenu />
        <ZoomSlider />
      </div>
    </div>
  );
}
