import { useState } from "react";
import { monthLabel, useStore } from "../state/store";
import type { DateMark, Group, Layer, Person } from "../types";
import InlineLabelEditor from "./InlineLabelEditor";
import { EyeHidden, EyeVisible } from "./icons/EyeIcons";

type DragItem = { kind: "layer" | "date"; id: string };

// Drop targets are identified by string keys. Container ids are used
// directly; the orphan section headers use these reserved keys.
const ORPHAN_SPANS = "__orphan_spans__";
const ORPHAN_DATES = "__orphan_dates__";

export default function LayerSidebar() {
  const layers = useStore((s) => s.layers);
  const dates = useStore((s) => s.dates);
  const people = useStore((s) => s.people);
  const groups = useStore((s) => s.groups);
  const selectedId = useStore((s) => s.selectedId);
  const setSelected = useStore((s) => s.setSelected);
  const updateLayer = useStore((s) => s.updateLayer);
  const updateDate = useStore((s) => s.updateDate);
  const updatePerson = useStore((s) => s.updatePerson);
  const updateGroup = useStore((s) => s.updateGroup);

  const [drag, setDrag] = useState<DragItem | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);

  const empty =
    layers.length === 0 &&
    dates.length === 0 &&
    people.length === 0 &&
    groups.length === 0;

  const layersIn = (id: string) => layers.filter((l) => l.containerId === id);
  const datesIn = (id: string) => dates.filter((d) => d.containerId === id);
  const orphanLayers = layers.filter((l) => !l.containerId);
  const orphanDates = dates.filter((d) => !d.containerId);

  const acceptsDrop = (target: { key: string; kind: "container" | "orphan-spans" | "orphan-dates" }) => {
    if (!drag) return false;
    if (target.kind === "container") return true;
    if (target.kind === "orphan-spans") return drag.kind === "layer";
    if (target.kind === "orphan-dates") return drag.kind === "date";
    return false;
  };

  const doDrop = (containerId: string | undefined) => {
    if (!drag) return;
    if (drag.kind === "layer") updateLayer(drag.id, { containerId });
    if (drag.kind === "date") updateDate(drag.id, { containerId });
    setDrag(null);
    setDropTargetKey(null);
  };

  const dropProps = (
    key: string,
    kind: "container" | "orphan-spans" | "orphan-dates",
    containerId: string | undefined
  ) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!acceptsDrop({ key, kind })) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDropTargetKey(key);
    },
    onDragLeave: () => {
      setDropTargetKey((cur) => (cur === key ? null : cur));
    },
    onDrop: (e: React.DragEvent) => {
      if (!acceptsDrop({ key, kind })) return;
      e.preventDefault();
      doDrop(containerId);
    },
    "data-droptarget": dropTargetKey === key ? "true" : undefined,
  });

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
                  onRename={(name) => updatePerson(p.id, { name })}
                  setDrag={setDrag}
                  drag={drag}
                  dropTargetKey={dropTargetKey}
                  dropProps={dropProps}
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
                  onRename={(name) => updateGroup(g.id, { name })}
                  onToggleVisible={() => updateGroup(g.id, { visible: !g.visible })}
                  setDrag={setDrag}
                  drag={drag}
                  dropTargetKey={dropTargetKey}
                  dropProps={dropProps}
                />
              ))}
            </ul>
          </section>
        )}

        <section className="sidebar-section">
          <h4
            className="sidebar-section-title is-drop-zone"
            {...dropProps(ORPHAN_SPANS, "orphan-spans", undefined)}
          >
            Spans
          </h4>
          <ul className="sidebar-list">
            {orphanLayers.map((l) => (
              <LayerRow
                key={l.id}
                layer={l}
                selected={selectedId === l.id}
                onSelect={() => setSelected(l.id)}
                onRename={(label) => updateLayer(l.id, { label })}
                setDrag={setDrag}
                isDragging={drag?.kind === "layer" && drag.id === l.id}
              />
            ))}
          </ul>
        </section>

        <section className="sidebar-section">
          <h4
            className="sidebar-section-title is-drop-zone"
            {...dropProps(ORPHAN_DATES, "orphan-dates", undefined)}
          >
            Dates
          </h4>
          <ul className="sidebar-list">
            {orphanDates.map((d) => (
              <DateRow
                key={d.id}
                date={d}
                selected={selectedId === d.id}
                onSelect={() => setSelected(d.id)}
                onRename={(label) => updateDate(d.id, { label })}
                setDrag={setDrag}
                isDragging={drag?.kind === "date" && drag.id === d.id}
              />
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}

// ----- Shared row types -----

type DropPropsFn = (
  key: string,
  kind: "container" | "orphan-spans" | "orphan-dates",
  containerId: string | undefined
) => Record<string, unknown>;

type SetDrag = (v: DragItem | null) => void;

// ----- Person container row -----

function PersonGroup({
  person,
  selectedId,
  layers,
  dates,
  onSelect,
  onRename,
  setDrag,
  drag,
  dropTargetKey,
  dropProps,
}: {
  person: Person;
  selectedId: string | null;
  layers: Layer[];
  dates: DateMark[];
  onSelect: (id: string) => void;
  onRename: (name: string) => void;
  setDrag: SetDrag;
  drag: DragItem | null;
  dropTargetKey: string | null;
  dropProps: DropPropsFn;
}) {
  const [editing, setEditing] = useState(false);
  const isDropTarget = dropTargetKey === person.id;

  return (
    <li className="sidebar-group" {...dropProps(person.id, "container", person.id)}>
      <button
        className={`sidebar-item ${selectedId === person.id ? "is-selected" : ""} ${
          isDropTarget ? "is-drop-target" : ""
        }`}
        onClick={() => onSelect(person.id)}
        onDoubleClick={() => setEditing(true)}
      >
        <span className="sidebar-item-glyph">◉</span>
        {editing ? (
          <InlineLabelEditor
            className="sidebar-edit-input"
            value={person.name}
            onCommit={(next) => {
              const trimmed = next.trim();
              if (trimmed) onRename(trimmed);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <span className="sidebar-item-label">{person.name}</span>
        )}
      </button>
      {(layers.length > 0 || dates.length > 0) && (
        <ul className="sidebar-list sidebar-nested">
          {layers.map((l) => (
            <LayerRow
              key={l.id}
              layer={l}
              selected={selectedId === l.id}
              onSelect={() => onSelect(l.id)}
              onRename={(label) =>
                useStore.getState().updateLayer(l.id, { label })
              }
              setDrag={setDrag}
              isDragging={drag?.kind === "layer" && drag.id === l.id}
            />
          ))}
          {dates.map((d) => (
            <DateRow
              key={d.id}
              date={d}
              selected={selectedId === d.id}
              onSelect={() => onSelect(d.id)}
              onRename={(label) => useStore.getState().updateDate(d.id, { label })}
              setDrag={setDrag}
              isDragging={drag?.kind === "date" && drag.id === d.id}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ----- Group container row -----

function GroupSection({
  group,
  selectedId,
  layers,
  dates,
  onSelect,
  onRename,
  onToggleVisible,
  setDrag,
  drag,
  dropTargetKey,
  dropProps,
}: {
  group: Group;
  selectedId: string | null;
  layers: Layer[];
  dates: DateMark[];
  onSelect: (id: string) => void;
  onRename: (name: string) => void;
  onToggleVisible: () => void;
  setDrag: SetDrag;
  drag: DragItem | null;
  dropTargetKey: string | null;
  dropProps: DropPropsFn;
}) {
  const [editing, setEditing] = useState(false);
  const isDropTarget = dropTargetKey === group.id;

  return (
    <li
      className={`sidebar-group ${group.visible ? "" : "is-hidden"}`}
      {...dropProps(group.id, "container", group.id)}
    >
      <div
        className={`sidebar-row ${selectedId === group.id ? "is-selected" : ""} ${
          isDropTarget ? "is-drop-target" : ""
        }`}
      >
        <button
          className="sidebar-eye"
          onClick={onToggleVisible}
          aria-label={group.visible ? "Hide group" : "Show group"}
          title={group.visible ? "Hide group" : "Show group"}
        >
          {group.visible ? <EyeVisible /> : <EyeHidden />}
        </button>
        <button
          className="sidebar-item-main"
          onClick={() => onSelect(group.id)}
          onDoubleClick={() => setEditing(true)}
        >
          {editing ? (
            <InlineLabelEditor
              className="sidebar-edit-input"
              value={group.name}
              onCommit={(next) => {
                const trimmed = next.trim();
                if (trimmed) onRename(trimmed);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <span className="sidebar-item-label">{group.name}</span>
          )}
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
              onRename={(label) =>
                useStore.getState().updateLayer(l.id, { label })
              }
              setDrag={setDrag}
              isDragging={drag?.kind === "layer" && drag.id === l.id}
            />
          ))}
          {dates.map((d) => (
            <DateRow
              key={d.id}
              date={d}
              selected={selectedId === d.id}
              onSelect={() => onSelect(d.id)}
              onRename={(label) => useStore.getState().updateDate(d.id, { label })}
              setDrag={setDrag}
              isDragging={drag?.kind === "date" && drag.id === d.id}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ----- Layer (span) row -----

function LayerRow({
  layer,
  selected,
  onSelect,
  onRename,
  setDrag,
  isDragging,
}: {
  layer: Layer;
  selected: boolean;
  onSelect: () => void;
  onRename: (label: string) => void;
  setDrag: SetDrag;
  isDragging: boolean;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <li>
      <button
        draggable={!editing}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", `layer:${layer.id}`);
          setDrag({ kind: "layer", id: layer.id });
        }}
        onDragEnd={() => setDrag(null)}
        className={`sidebar-item ${selected ? "is-selected" : ""} ${
          isDragging ? "is-dragging-source" : ""
        }`}
        onClick={onSelect}
        onDoubleClick={() => setEditing(true)}
      >
        <span className="sidebar-item-glyph">▭</span>
        {editing ? (
          <InlineLabelEditor
            className="sidebar-edit-input"
            value={layer.label}
            onCommit={(next) => {
              const trimmed = next.trim();
              if (trimmed) onRename(trimmed);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <span className="sidebar-item-label">{layer.label}</span>
        )}
      </button>
    </li>
  );
}

// ----- Date row -----

function DateRow({
  date,
  selected,
  onSelect,
  onRename,
  setDrag,
  isDragging,
}: {
  date: DateMark;
  selected: boolean;
  onSelect: () => void;
  onRename: (label: string) => void;
  setDrag: SetDrag;
  isDragging: boolean;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <li>
      <button
        draggable={!editing}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", `date:${date.id}`);
          setDrag({ kind: "date", id: date.id });
        }}
        onDragEnd={() => setDrag(null)}
        className={`sidebar-item ${selected ? "is-selected" : ""} ${
          isDragging ? "is-dragging-source" : ""
        }`}
        onClick={onSelect}
        onDoubleClick={() => setEditing(true)}
        title={`${monthLabel(date.monthIdx % 12)} ${date.dayOfMonth}`}
      >
        <span className="sidebar-item-glyph">{date.important ? "│" : "•"}</span>
        {editing ? (
          <InlineLabelEditor
            className="sidebar-edit-input"
            value={date.label}
            onCommit={(next) => {
              const trimmed = next.trim();
              if (trimmed) onRename(trimmed);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <span className="sidebar-item-label">{date.label}</span>
        )}
      </button>
    </li>
  );
}
