import { useEffect, useRef, useState } from "react";

type Props = {
  onImportCalendar: () => void;
  onImportJson: () => void;
  onExportJson: () => void;
};

export default function MenuBar({ onImportCalendar, onImportJson, onExportJson }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div className="menubar">
      <div className="menubar-menu" ref={rootRef}>
        <button
          className={`menubar-button ${open ? "is-open" : ""}`}
          onClick={() => setOpen((v) => !v)}
        >
          File
        </button>
        {open && (
          <div className="menubar-flyout" role="menu">
            <button className="menubar-item" onClick={choose(onImportCalendar)}>
              Import Calendar…
            </button>
            <div className="menubar-divider" />
            <button className="menubar-item" onClick={choose(onImportJson)}>
              Import JSON…
            </button>
            <button className="menubar-item" onClick={choose(onExportJson)}>
              Export JSON
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
