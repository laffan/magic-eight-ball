import { useEffect, useRef, useState } from "react";
import { useStore } from "./state/store";
import LayerSidebar from "./components/LayerSidebar";
import Canvas from "./components/Canvas";
import Inspector from "./components/Inspector";
import MenuBar from "./components/MenuBar";
import ImportPreview from "./components/ImportPreview";
import { parseIcs } from "./state/icsImport";
import type { IcsEvent } from "./state/icsImport";

export default function App() {
  const inspectorOpen = useStore((s) => s.inspectorOpen);
  const setSelected = useStore((s) => s.setSelected);
  const exportSnapshot = useStore((s) => s.exportSnapshot);
  const importSnapshot = useStore((s) => s.importSnapshot);

  const [icsEvents, setIcsEvents] = useState<IcsEvent[] | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const icsInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSelected]);

  const onExportJson = () => {
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

  const onImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const onImportIcsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const events = parseIcs(text);
      setIcsEvents(events);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className={`app ${inspectorOpen ? "inspector-open" : "inspector-closed"}`}>
      <MenuBar
        onImportCalendar={() => icsInputRef.current?.click()}
        onImportJson={() => jsonInputRef.current?.click()}
        onExportJson={onExportJson}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: "none" }}
        onChange={onImportJsonFile}
      />
      <input
        ref={icsInputRef}
        type="file"
        accept=".ics,text/calendar"
        style={{ display: "none" }}
        onChange={onImportIcsFile}
      />
      <LayerSidebar />
      <Canvas />
      <Inspector />
      {icsEvents && (
        <ImportPreview events={icsEvents} onClose={() => setIcsEvents(null)} />
      )}
    </div>
  );
}
