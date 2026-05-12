import { MONTHS_PER_YEAR, monthLabel, useStore } from "../state/store";
import type { Item, RepeatKind } from "../types";

const REPEAT_OPTIONS: { value: RepeatKind; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
  { value: "custom", label: "Custom" },
];

export default function Inspector() {
  const open = useStore((s) => s.inspectorOpen);
  const toggle = useStore((s) => s.toggleInspector);
  const startYear = useStore((s) => s.startYear);

  // Subscribe to layers/dates so the inspector re-renders when the selected
  // item's fields change (otherwise controlled inputs appear "stuck").
  const item = useStore<Item | null>((s) => {
    if (!s.selectedId) return null;
    return (
      s.layers.find((l) => l.id === s.selectedId) ??
      s.dates.find((d) => d.id === s.selectedId) ??
      null
    );
  });

  const updateLayer = useStore((s) => s.updateLayer);
  const updateDate = useStore((s) => s.updateDate);
  const removeItem = useStore((s) => s.removeItem);

  const formatMonth = (idx: number) => {
    const year = startYear + Math.floor(idx / MONTHS_PER_YEAR);
    return `${monthLabel(idx)} ${year}`;
  };

  return (
    <aside className={`inspector ${open ? "is-open" : "is-closed"}`}>
      <button
        className="inspector-toggle"
        onClick={toggle}
        aria-label={open ? "Hide inspector" : "Show inspector"}
        title={open ? "Hide inspector" : "Show inspector"}
      >
        <span className="inspector-toggle-chevron">{open ? "›" : "‹"}</span>
      </button>

      <div className="inspector-panel">
        <header className="inspector-header">
          <span>Inspector</span>
        </header>

        <div className="inspector-body">
          {!item && <p className="inspector-empty">Nothing selected.</p>}

          {item?.kind === "layer" && (
            <div className="inspector-fields">
              <label className="field">
                <span className="field-label">Label</span>
                <input
                  className="field-input"
                  value={item.label}
                  onChange={(e) => updateLayer(item.id, { label: e.target.value })}
                />
              </label>
              <div className="field-row">
                <div className="field">
                  <span className="field-label">Start</span>
                  <div className="field-value">{formatMonth(item.startMonthIdx)}</div>
                </div>
                <div className="field">
                  <span className="field-label">End</span>
                  <div className="field-value">{formatMonth(item.endMonthIdx)}</div>
                </div>
              </div>
              <button className="danger-btn" onClick={() => removeItem(item.id)}>
                Delete
              </button>
            </div>
          )}

          {item?.kind === "date" && (
            <div className="inspector-fields">
              <label className="field">
                <span className="field-label">Label</span>
                <input
                  className="field-input"
                  value={item.label}
                  onChange={(e) => updateDate(item.id, { label: e.target.value })}
                />
              </label>
              <div className="field">
                <span className="field-label">Date</span>
                <div className="field-value">{formatMonth(item.monthIdx)}</div>
              </div>

              <label className="field">
                <span className="field-label">Repeating</span>
                <select
                  className="field-input"
                  value={item.repeat ?? "none"}
                  onChange={(e) =>
                    updateDate(item.id, { repeat: e.target.value as RepeatKind })
                  }
                >
                  {REPEAT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              {item.repeat === "custom" && (
                <label className="field">
                  <span className="field-label">Every (days)</span>
                  <input
                    className="field-input"
                    type="number"
                    min={1}
                    value={item.repeatEveryDays ?? 14}
                    onChange={(e) =>
                      updateDate(item.id, {
                        repeatEveryDays: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                  />
                </label>
              )}

              <button className="danger-btn" onClick={() => removeItem(item.id)}>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
