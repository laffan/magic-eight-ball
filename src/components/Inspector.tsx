import { MONTHS_PER_YEAR, monthLabel, monthLabelLong, useStore, daysInMonth } from "../state/store";
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
  const people = useStore((s) => s.people);

  const item = useStore<Item | null>((s) => {
    if (!s.selectedId) return null;
    return (
      s.layers.find((l) => l.id === s.selectedId) ??
      s.dates.find((d) => d.id === s.selectedId) ??
      s.people.find((p) => p.id === s.selectedId) ??
      null
    );
  });

  const updateLayer = useStore((s) => s.updateLayer);
  const updateDate = useStore((s) => s.updateDate);
  const updatePerson = useStore((s) => s.updatePerson);
  const removeItem = useStore((s) => s.removeItem);

  const formatMonth = (idx: number) => {
    const year = startYear + Math.floor(idx / MONTHS_PER_YEAR);
    return `${monthLabel(idx)} ${year}`;
  };

  const personOptions = (
    <>
      <option value="">— None —</option>
      {people.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </>
  );

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

              {people.length > 0 && (
                <label className="field">
                  <span className="field-label">Belongs to</span>
                  <select
                    className="field-input"
                    value={item.personId ?? ""}
                    onChange={(e) =>
                      updateLayer(item.id, { personId: e.target.value || undefined })
                    }
                  >
                    {personOptions}
                  </select>
                </label>
              )}

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
                <div className="field-value">
                  {monthLabel(item.monthIdx % MONTHS_PER_YEAR)} {item.dayOfMonth},{" "}
                  {startYear + Math.floor(item.monthIdx / MONTHS_PER_YEAR)}
                </div>
              </div>

              <label className="field-check">
                <input
                  type="checkbox"
                  checked={item.important}
                  onChange={(e) => updateDate(item.id, { important: e.target.checked })}
                />
                <span>Important date</span>
              </label>

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

              {people.length > 0 && (
                <label className="field">
                  <span className="field-label">Belongs to</span>
                  <select
                    className="field-input"
                    value={item.personId ?? ""}
                    onChange={(e) =>
                      updateDate(item.id, { personId: e.target.value || undefined })
                    }
                  >
                    {personOptions}
                  </select>
                </label>
              )}

              <button className="danger-btn" onClick={() => removeItem(item.id)}>
                Delete
              </button>
            </div>
          )}

          {item?.kind === "person" && (
            <div className="inspector-fields">
              <label className="field">
                <span className="field-label">Name</span>
                <input
                  className="field-input"
                  value={item.name}
                  onChange={(e) => updatePerson(item.id, { name: e.target.value })}
                />
              </label>

              <div className="field-row">
                <label className="field">
                  <span className="field-label">Birth month</span>
                  <select
                    className="field-input"
                    value={item.birthMonth}
                    onChange={(e) =>
                      updatePerson(item.id, { birthMonth: Number(e.target.value) })
                    }
                  >
                    {Array.from({ length: 12 }, (_, m) => (
                      <option key={m} value={m}>
                        {monthLabelLong(m)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Birth day</span>
                  <input
                    className="field-input"
                    type="number"
                    min={1}
                    max={daysInMonth(2000, item.birthMonth)}
                    value={item.birthDay}
                    onChange={(e) =>
                      updatePerson(item.id, {
                        birthDay: Math.max(1, Math.min(31, Number(e.target.value) || 1)),
                      })
                    }
                  />
                </label>
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
