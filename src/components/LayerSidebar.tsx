import { monthLabel, useStore } from "../state/store";
import type { DateMark, Layer } from "../types";

export default function LayerSidebar() {
  const layers = useStore((s) => s.layers);
  const dates = useStore((s) => s.dates);
  const people = useStore((s) => s.people);
  const selectedId = useStore((s) => s.selectedId);
  const setSelected = useStore((s) => s.setSelected);

  const empty =
    layers.length === 0 && dates.length === 0 && people.length === 0;

  const layersByPerson = (id: string) => layers.filter((l) => l.personId === id);
  const datesByPerson = (id: string) => dates.filter((d) => d.personId === id);
  const orphanLayers = layers.filter((l) => !l.personId);
  const orphanDates = dates.filter((d) => !d.personId);

  return (
    <aside className="layer-sidebar">
      <header className="sidebar-header">
        <span>Layers</span>
      </header>
      <div className="sidebar-body">
        {empty && (
          <p className="sidebar-empty">
            No layers yet. Use the + button or click &amp; drag on the canvas to add one.
          </p>
        )}

        {people.length > 0 && (
          <section className="sidebar-section">
            <h4 className="sidebar-section-title">People</h4>
            <ul className="sidebar-list">
              {people.map((p) => (
                <li key={p.id} className="sidebar-group">
                  <button
                    className={`sidebar-item ${selectedId === p.id ? "is-selected" : ""}`}
                    onClick={() => setSelected(p.id)}
                  >
                    <span className="sidebar-item-glyph">◉</span>
                    <span className="sidebar-item-label">{p.name}</span>
                  </button>
                  {(layersByPerson(p.id).length > 0 ||
                    datesByPerson(p.id).length > 0) && (
                    <ul className="sidebar-list sidebar-nested">
                      {layersByPerson(p.id).map((l) => (
                        <LayerRow
                          key={l.id}
                          layer={l}
                          selected={selectedId === l.id}
                          onSelect={() => setSelected(l.id)}
                        />
                      ))}
                      {datesByPerson(p.id).map((d) => (
                        <DateRow
                          key={d.id}
                          date={d}
                          selected={selectedId === d.id}
                          onSelect={() => setSelected(d.id)}
                        />
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {orphanLayers.length > 0 && (
          <section className="sidebar-section">
            <h4 className="sidebar-section-title">Spans</h4>
            <ul className="sidebar-list">
              {orphanLayers.map((l) => (
                <LayerRow
                  key={l.id}
                  layer={l}
                  selected={selectedId === l.id}
                  onSelect={() => setSelected(l.id)}
                />
              ))}
            </ul>
          </section>
        )}

        {orphanDates.length > 0 && (
          <section className="sidebar-section">
            <h4 className="sidebar-section-title">Dates</h4>
            <ul className="sidebar-list">
              {orphanDates.map((d) => (
                <DateRow
                  key={d.id}
                  date={d}
                  selected={selectedId === d.id}
                  onSelect={() => setSelected(d.id)}
                />
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}

function LayerRow({
  layer,
  selected,
  onSelect,
}: {
  layer: Layer;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        className={`sidebar-item ${selected ? "is-selected" : ""}`}
        onClick={onSelect}
      >
        <span className="sidebar-item-glyph">▭</span>
        <span className="sidebar-item-label">{layer.label}</span>
      </button>
    </li>
  );
}

function DateRow({
  date,
  selected,
  onSelect,
}: {
  date: DateMark;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        className={`sidebar-item ${selected ? "is-selected" : ""}`}
        onClick={onSelect}
        title={`${monthLabel(date.monthIdx % 12)} ${date.dayOfMonth}`}
      >
        <span className="sidebar-item-glyph">{date.important ? "│" : "•"}</span>
        <span className="sidebar-item-label">{date.label}</span>
      </button>
    </li>
  );
}
