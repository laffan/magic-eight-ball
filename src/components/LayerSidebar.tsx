import { useStore } from "../state/store";

export default function LayerSidebar() {
  const layers = useStore((s) => s.layers);
  const dates = useStore((s) => s.dates);
  const selectedId = useStore((s) => s.selectedId);
  const setSelected = useStore((s) => s.setSelected);

  const empty = layers.length === 0 && dates.length === 0;

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

        {layers.length > 0 && (
          <section className="sidebar-section">
            <h4 className="sidebar-section-title">Spans</h4>
            <ul className="sidebar-list">
              {layers.map((l) => (
                <li
                  key={l.id}
                  className={`sidebar-item ${selectedId === l.id ? "is-selected" : ""}`}
                  onClick={() => setSelected(l.id)}
                >
                  <span className="sidebar-item-glyph">▭</span>
                  <span className="sidebar-item-label">{l.label}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {dates.length > 0 && (
          <section className="sidebar-section">
            <h4 className="sidebar-section-title">Dates</h4>
            <ul className="sidebar-list">
              {dates.map((d) => (
                <li
                  key={d.id}
                  className={`sidebar-item ${selectedId === d.id ? "is-selected" : ""}`}
                  onClick={() => setSelected(d.id)}
                >
                  <span className="sidebar-item-glyph">│</span>
                  <span className="sidebar-item-label">{d.label}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}
