import { useEffect, useRef, useState } from "react";
import { monthLabel, useStore } from "../state/store";
import type { DateMark, Group, Layer, Person } from "../types";
import InlineLabelEditor from "./InlineLabelEditor";
import { EyeHidden, EyeVisible } from "./icons/EyeIcons";

const DRAG_THRESHOLD = 5;

// The "Spans" and "Dates" section headers represent the orphan drop targets.
const ORPHAN_SPANS = "__orphan_spans__";
const ORPHAN_DATES = "__orphan_dates__";

type DragKind = "layer" | "date";
type DragState = {
  kind: DragKind;
  id: string;
  label: string;
  glyph: string;
  startX: number;
  startY: number;
  clientX: number;
  clientY: number;
  isDragging: boolean;
};

type DropKind = "container" | "orphan-spans" | "orphan-dates";

function acceptsDrop(dragKind: DragKind, dropKind: DropKind): boolean {
  if (dropKind === "container") return true;
  if (dropKind === "orphan-spans") return dragKind === "layer";
  if (dropKind === "orphan-dates") return dragKind === "date";
  return false;
}

export default function LayerSidebar() {
  const layers = useStore((s) => s.layers);
  const dates = useStore((s) => s.dates);
  const people = useStore((s) => s.people);
  const groups = useStore((s) => s.groups);
  const selectedId = useStore((s) => s.selectedId);
  const setSelected = useStore((s) => s.setSelected);
  const requestScrollTo = useStore((s) => s.requestScrollTo);
  const selectAndScroll = (id: string) => {
    setSelected(id);
    requestScrollTo(id);
  };
  const updateLayer = useStore((s) => s.updateLayer);
  const updateDate = useStore((s) => s.updateDate);
  const updatePerson = useStore((s) => s.updatePerson);
  const updateGroup = useStore((s) => s.updateGroup);
  const exportSnapshot = useStore((s) => s.exportSnapshot);
  const importSnapshot = useStore((s) => s.importSnapshot);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // Global mousemove/mouseup driving the custom DnD. We use this rather than
  // HTML5 drag-and-drop because HTML5 DnD is unreliable inside Tauri webviews.
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const isDragging =
        drag.isDragging ||
        Math.abs(dx) >= DRAG_THRESHOLD ||
        Math.abs(dy) >= DRAG_THRESHOLD;

      setDrag({ ...drag, clientX: e.clientX, clientY: e.clientY, isDragging });

      if (isDragging) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const target = el?.closest("[data-drop-target-id]") as HTMLElement | null;
        if (target) {
          const kind = target.getAttribute("data-drop-target-kind") as DropKind | null;
          if (kind && acceptsDrop(drag.kind, kind)) {
            setDropTargetKey(target.getAttribute("data-drop-target-id"));
            return;
          }
        }
        setDropTargetKey(null);
      }
    };

    const onUp = (e: MouseEvent) => {
      if (drag.isDragging) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const target = el?.closest("[data-drop-target-id]") as HTMLElement | null;
        if (target) {
          const kind = target.getAttribute("data-drop-target-kind") as DropKind | null;
          const id = target.getAttribute("data-drop-target-id");
          if (kind && id && acceptsDrop(drag.kind, kind)) {
            let containerId: string | undefined;
            if (kind === "container") containerId = id;
            else containerId = undefined; // orphan
            if (drag.kind === "layer") updateLayer(drag.id, { containerId });
            else updateDate(drag.id, { containerId });
          }
        }
      }
      setDrag(null);
      setDropTargetKey(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, updateDate, updateLayer]);

  const startDrag = (
    e: React.MouseEvent,
    kind: DragKind,
    id: string,
    label: string,
    glyph: string
  ) => {
    if (e.button !== 0) return;
    setDrag({
      kind,
      id,
      label,
      glyph,
      startX: e.clientX,
      startY: e.clientY,
      clientX: e.clientX,
      clientY: e.clientY,
      isDragging: false,
    });
  };

  const empty =
    layers.length === 0 &&
    dates.length === 0 &&
    people.length === 0 &&
    groups.length === 0;

  const layersIn = (id: string) => layers.filter((l) => l.containerId === id);
  const datesIn = (id: string) => dates.filter((d) => d.containerId === id);
  const orphanLayers = layers.filter((l) => !l.containerId);
  const orphanDates = dates.filter((d) => !d.containerId);

  const handleExport = () => {
    const snapshot = exportSnapshot();
    const json = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `magic-eight-ball-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result ?? ""));
        const ok = importSnapshot(data);
        if (!ok) alert("Could not import: file shape didn't look right.");
      } catch {
        alert("Could not import: invalid JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

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

        <section className="sidebar-section">
          <h4
            className={`sidebar-section-title is-drop-zone ${
              dropTargetKey === ORPHAN_SPANS ? "is-drop-target" : ""
            }`}
            data-drop-target-id={ORPHAN_SPANS}
            data-drop-target-kind="orphan-spans"
          >
            Spans
          </h4>
          <ul className="sidebar-list">
            {orphanLayers.map((l) => (
              <LayerRow
                key={l.id}
                layer={l}
                selected={selectedId === l.id}
                onSelect={() => selectAndScroll(l.id)}
                onRename={(label) => updateLayer(l.id, { label })}
                startDrag={startDrag}
                isDragging={drag?.kind === "layer" && drag.id === l.id && drag.isDragging}
              />
            ))}
          </ul>
        </section>

        <section className="sidebar-section">
          <h4
            className={`sidebar-section-title is-drop-zone ${
              dropTargetKey === ORPHAN_DATES ? "is-drop-target" : ""
            }`}
            data-drop-target-id={ORPHAN_DATES}
            data-drop-target-kind="orphan-dates"
          >
            Dates
          </h4>
          <ul className="sidebar-list">
            {orphanDates.map((d) => (
              <DateRow
                key={d.id}
                date={d}
                selected={selectedId === d.id}
                onSelect={() => selectAndScroll(d.id)}
                onRename={(label) => updateDate(d.id, { label })}
                startDrag={startDrag}
                isDragging={drag?.kind === "date" && drag.id === d.id && drag.isDragging}
              />
            ))}
          </ul>
        </section>

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
                  onSelect={selectAndScroll}
                  onRename={(name) => updatePerson(p.id, { name })}
                  onRenameLayer={(id, label) => updateLayer(id, { label })}
                  onRenameDate={(id, label) => updateDate(id, { label })}
                  startDrag={startDrag}
                  drag={drag}
                  dropTargetKey={dropTargetKey}
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
                  onSelect={selectAndScroll}
                  onRename={(name) => updateGroup(g.id, { name })}
                  onRenameLayer={(id, label) => updateLayer(id, { label })}
                  onRenameDate={(id, label) => updateDate(id, { label })}
                  onToggleVisible={() => updateGroup(g.id, { visible: !g.visible })}
                  startDrag={startDrag}
                  drag={drag}
                  dropTargetKey={dropTargetKey}
                />
              ))}
            </ul>
          </section>
        )}
      </div>

      <footer className="sidebar-footer">
        <button className="sidebar-footer-btn" onClick={handleExport}>
          Export JSON
        </button>
        <button
          className="sidebar-footer-btn"
          onClick={() => importInputRef.current?.click()}
        >
          Import JSON
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={handleImportFile}
        />
      </footer>

      {drag?.isDragging && (
        <div
          className="sidebar-drag-ghost"
          style={{ left: drag.clientX + 12, top: drag.clientY + 8 }}
        >
          <span className="sidebar-item-glyph">{drag.glyph}</span>
          <span className="sidebar-item-label">{drag.label}</span>
        </div>
      )}
    </aside>
  );
}

// ----- Shared row types -----

type StartDrag = (
  e: React.MouseEvent,
  kind: DragKind,
  id: string,
  label: string,
  glyph: string
) => void;

// ----- Person container row -----

function PersonGroup({
  person,
  selectedId,
  layers,
  dates,
  onSelect,
  onRename,
  onRenameLayer,
  onRenameDate,
  startDrag,
  drag,
  dropTargetKey,
}: {
  person: Person;
  selectedId: string | null;
  layers: Layer[];
  dates: DateMark[];
  onSelect: (id: string) => void;
  onRename: (name: string) => void;
  onRenameLayer: (id: string, label: string) => void;
  onRenameDate: (id: string, label: string) => void;
  startDrag: StartDrag;
  drag: DragState | null;
  dropTargetKey: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const isDropTarget = dropTargetKey === person.id;

  return (
    <li
      className="sidebar-group"
      data-drop-target-id={person.id}
      data-drop-target-kind="container"
    >
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
              onRename={(label) => onRenameLayer(l.id, label)}
              startDrag={startDrag}
              isDragging={drag?.kind === "layer" && drag.id === l.id && drag.isDragging}
            />
          ))}
          {dates.map((d) => (
            <DateRow
              key={d.id}
              date={d}
              selected={selectedId === d.id}
              onSelect={() => onSelect(d.id)}
              onRename={(label) => onRenameDate(d.id, label)}
              startDrag={startDrag}
              isDragging={drag?.kind === "date" && drag.id === d.id && drag.isDragging}
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
  onRenameLayer,
  onRenameDate,
  onToggleVisible,
  startDrag,
  drag,
  dropTargetKey,
}: {
  group: Group;
  selectedId: string | null;
  layers: Layer[];
  dates: DateMark[];
  onSelect: (id: string) => void;
  onRename: (name: string) => void;
  onRenameLayer: (id: string, label: string) => void;
  onRenameDate: (id: string, label: string) => void;
  onToggleVisible: () => void;
  startDrag: StartDrag;
  drag: DragState | null;
  dropTargetKey: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const isDropTarget = dropTargetKey === group.id;

  return (
    <li
      className={`sidebar-group ${group.visible ? "" : "is-hidden"}`}
      data-drop-target-id={group.id}
      data-drop-target-kind="container"
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
              onRename={(label) => onRenameLayer(l.id, label)}
              startDrag={startDrag}
              isDragging={drag?.kind === "layer" && drag.id === l.id && drag.isDragging}
            />
          ))}
          {dates.map((d) => (
            <DateRow
              key={d.id}
              date={d}
              selected={selectedId === d.id}
              onSelect={() => onSelect(d.id)}
              onRename={(label) => onRenameDate(d.id, label)}
              startDrag={startDrag}
              isDragging={drag?.kind === "date" && drag.id === d.id && drag.isDragging}
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
  startDrag,
  isDragging,
}: {
  layer: Layer;
  selected: boolean;
  onSelect: () => void;
  onRename: (label: string) => void;
  startDrag: StartDrag;
  isDragging: boolean;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <li>
      <button
        className={`sidebar-item ${selected ? "is-selected" : ""} ${
          isDragging ? "is-dragging-source" : ""
        }`}
        onMouseDown={(e) => {
          if (editing) return;
          startDrag(e, "layer", layer.id, layer.label, "▭");
        }}
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
  startDrag,
  isDragging,
}: {
  date: DateMark;
  selected: boolean;
  onSelect: () => void;
  onRename: (label: string) => void;
  startDrag: StartDrag;
  isDragging: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const glyph = date.important ? "│" : "•";
  return (
    <li>
      <button
        className={`sidebar-item ${selected ? "is-selected" : ""} ${
          isDragging ? "is-dragging-source" : ""
        }`}
        onMouseDown={(e) => {
          if (editing) return;
          startDrag(e, "date", date.id, date.label, glyph);
        }}
        onClick={onSelect}
        onDoubleClick={() => setEditing(true)}
        title={`${monthLabel(date.monthIdx % 12)} ${date.dayOfMonth}`}
      >
        <span className="sidebar-item-glyph">{glyph}</span>
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
