import { monthLabel, useStore } from "../state/store";
import type { DateMark, Group, Layer, Person } from "../types";

export default function LayerSidebar() {
  const layers = useStore((s) => s.layers);
  const dates = useStore((s) => s.dates);
  const people = useStore((s) => s.people);
  const groups = useStore((s) => s.groups);
  const selectedId = useStore((s) => s.selectedId);
  const setSelected = useStore((s) => s.setSelected);
  const updateGroup = useStore((s) => s.updateGroup);

  const empty =
    layers.length === 0 &&
    dates.length === 0 &&
    people.length === 0 &&
    groups.length === 0;

  const layersIn = (id: string) => layers.filter((l) => l.containerId === id);
  const datesIn = (id: string) => dates.filter((d) => d.containerId === id);
  const orphanLayers = layers.filter((l) => !l.containerId);
  const orphanDates = dates.filter((d) => !d.containerId);

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
                <PersonGroup
                  key={p.id}
                  person={p}
                  selectedId={selectedId}
                  layers={layersIn(p.id)}
                  dates={datesIn(p.id)}
                  onSelect={setSelected}
                />
              ))}
            </ul>
          </section>
        )}

        {groups.length > 0 && (
          <section className="sidebar-section">
            <h4 className="sidebar-section-title">Groups</h4>
            <ul className="sidebar-list">
              {groups.map((g) => (
                <GroupSection
                  key={g.id}
                  group={g}
                  selectedId={selectedId}
                  layers={layersIn(g.id)}
                  dates={datesIn(g.id)}
                  onSelect={setSelected}
                  onToggleVisible={() => updateGroup(g.id, { visible: !g.visible })}
                />
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

function PersonGroup({
  person,
  selectedId,
  layers,
  dates,
  onSelect,
}: {
  person: Person;
  selectedId: string | null;
  layers: Layer[];
  dates: DateMark[];
  onSelect: (id: string) => void;
}) {
  return (
    <li className="sidebar-group">
      <button
        className={`sidebar-item ${selectedId === person.id ? "is-selected" : ""}`}
        onClick={() => onSelect(person.id)}
      >
        <span className="sidebar-item-glyph">◉</span>
        <span className="sidebar-item-label">{person.name}</span>
      </button>
      {(layers.length > 0 || dates.length > 0) && (
        <ul className="sidebar-list sidebar-nested">
          {layers.map((l) => (
            <LayerRow
              key={l.id}
              layer={l}
              selected={selectedId === l.id}
              onSelect={() => onSelect(l.id)}
            />
          ))}
          {dates.map((d) => (
            <DateRow
              key={d.id}
              date={d}
              selected={selectedId === d.id}
              onSelect={() => onSelect(d.id)}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function GroupSection({
  group,
  selectedId,
  layers,
  dates,
  onSelect,
  onToggleVisible,
}: {
  group: Group;
  selectedId: string | null;
  layers: Layer[];
  dates: DateMark[];
  onSelect: (id: string) => void;
  onToggleVisible: () => void;
}) {
  return (
    <li className={`sidebar-group ${group.visible ? "" : "is-hidden"}`}>
      <div className={`sidebar-row ${selectedId === group.id ? "is-selected" : ""}`}>
        <button
          className="sidebar-eye"
          onClick={onToggleVisible}
          aria-label={group.visible ? "Hide group" : "Show group"}
          title={group.visible ? "Hide group" : "Show group"}
        >
          {group.visible ? "●" : "○"}
        </button>
        <button
          className="sidebar-item-main"
          onClick={() => onSelect(group.id)}
        >
          <span className="sidebar-item-label">{group.name}</span>
        </button>
      </div>
      {(layers.length > 0 || dates.length > 0) && (
        <ul className="sidebar-list sidebar-nested">
          {layers.map((l) => (
            <LayerRow
              key={l.id}
              layer={l}
              selected={selectedId === l.id}
              onSelect={() => onSelect(l.id)}
            />
          ))}
          {dates.map((d) => (
            <DateRow
              key={d.id}
              date={d}
              selected={selectedId === d.id}
              onSelect={() => onSelect(d.id)}
            />
          ))}
        </ul>
      )}
    </li>
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
