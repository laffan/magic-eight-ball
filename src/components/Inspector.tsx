import { MONTHS_PER_YEAR, monthLabel, useStore } from "../state/store";

export default function Inspector() {
  const open = useStore((s) => s.inspectorOpen);
  const toggle = useStore((s) => s.toggleInspector);
  const selectedId = useStore((s) => s.selectedId);
  const getItem = useStore((s) => s.getItem);
  const updateLayer = useStore((s) => s.updateLayer);
  const updateDate = useStore((s) => s.updateDate);
  const removeItem = useStore((s) => s.removeItem);
  const startYear = useStore((s) => s.startYear);

  const item = getItem(selectedId);

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
