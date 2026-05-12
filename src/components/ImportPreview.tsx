import { useEffect, useMemo, useState } from "react";
import { useStore } from "../state/store";
import type { IcsEvent } from "../state/icsImport";
import { eventToImportable } from "../state/icsImport";

type Props = {
  events: IcsEvent[];
  onClose: () => void;
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function ImportPreview({ events, onClose }: Props) {
  const startYear = useStore((s) => s.startYear);
  const numYears = useStore((s) => s.numYears);
  const setNumYears = useStore((s) => s.setNumYears);
  const addLayer = useStore((s) => s.addLayer);
  const addDate = useStore((s) => s.addDate);

  const items = useMemo(
    () =>
      events.map((event, i) => ({
        key: `${i}-${event.uid || event.summary}`,
        event,
        conversion: eventToImportable(event, startYear),
      })),
    [events, startYear]
  );

  const [checked, setChecked] = useState<Set<string>>(() => new Set(items.map((it) => it.key)));

  useEffect(() => {
    setChecked(new Set(items.map((it) => it.key)));
  }, [items]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleAll = () => {
    setChecked((prev) =>
      prev.size === items.length ? new Set() : new Set(items.map((it) => it.key))
    );
  };

  const toggleOne = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const onImport = () => {
    let maxMonthIdx = -1;
    for (const it of items) {
      if (!checked.has(it.key)) continue;
      const c = it.conversion;
      if (c.kind === "date") {
        addDate(c.monthIdx, c.dayOfMonth, { label: c.label });
        if (c.monthIdx > maxMonthIdx) maxMonthIdx = c.monthIdx;
      } else {
        addLayer(c.startMonthIdx, c.startDayOfMonth, c.endMonthIdx, c.endDayOfMonth, {
          label: c.label,
        });
        if (c.endMonthIdx > maxMonthIdx) maxMonthIdx = c.endMonthIdx;
      }
    }
    if (maxMonthIdx >= 0) {
      const needed = Math.floor(maxMonthIdx / 12) + 1;
      if (needed > numYears) setNumYears(needed);
    }
    onClose();
  };

  const formatRange = (it: (typeof items)[number]) => {
    const { event, conversion } = it;
    const startStr = `${MONTH_NAMES[event.start.month]} ${event.start.day}, ${event.start.year}`;
    if (conversion.kind === "date") return startStr;
    const inclusive =
      event.allDay && event.end
        ? new Date(Date.UTC(event.end.year, event.end.month, event.end.day - 1))
        : event.end
          ? new Date(Date.UTC(event.end.year, event.end.month, event.end.day))
          : null;
    if (!inclusive) return startStr;
    const endStr = `${MONTH_NAMES[inclusive.getUTCMonth()]} ${inclusive.getUTCDate()}, ${inclusive.getUTCFullYear()}`;
    return `${startStr} – ${endStr}`;
  };

  return (
    <div className="import-preview-backdrop" onMouseDown={onClose}>
      <div
        className="import-preview"
        role="dialog"
        aria-label="Import calendar events"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="import-preview-header">
          <h3>Import calendar events</h3>
          <span className="import-preview-count">
            {checked.size} of {items.length} selected
          </span>
        </header>
        <div className="import-preview-toolbar">
          <button
            className="import-preview-toolbar-btn"
            onClick={toggleAll}
            disabled={items.length === 0}
          >
            {checked.size === items.length && items.length > 0 ? "Deselect all" : "Select all"}
          </button>
        </div>
        <ul className="import-preview-list">
          {items.length === 0 && (
            <li className="import-preview-empty">No events found in this file.</li>
          )}
          {items.map((it) => {
            const isOn = checked.has(it.key);
            const isSpan = it.conversion.kind === "layer";
            return (
              <li key={it.key} className="import-preview-row">
                <label>
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => toggleOne(it.key)}
                  />
                  <span className="import-preview-glyph">{isSpan ? "▭" : "•"}</span>
                  <span className="import-preview-summary">
                    {it.event.summary || "(untitled)"}
                  </span>
                  <span className="import-preview-date">{formatRange(it)}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <footer className="import-preview-footer">
          <button className="import-preview-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="import-preview-confirm"
            onClick={onImport}
            disabled={checked.size === 0}
          >
            Import {checked.size > 0 ? checked.size : ""}
          </button>
        </footer>
      </div>
    </div>
  );
}
