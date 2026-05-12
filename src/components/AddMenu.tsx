import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";

export default function AddMenu() {
  const [open, setOpen] = useState(false);
  const addLayer = useStore((s) => s.addLayer);
  const addDate = useStore((s) => s.addDate);
  const addPerson = useStore((s) => s.addPerson);
  const startYear = useStore((s) => s.startYear);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const today = new Date();
  const nowMonthIdx = Math.max(
    0,
    (today.getFullYear() - startYear) * 12 + today.getMonth()
  );

  return (
    <div className="add-menu" ref={rootRef}>
      {open && (
        <div className="add-menu-flyout" role="menu">
          <button
            className="add-menu-item"
            onClick={() => {
              addLayer(nowMonthIdx, nowMonthIdx + 5);
              setOpen(false);
            }}
          >
            New span
          </button>
          <button
            className="add-menu-item"
            onClick={() => {
              addDate(nowMonthIdx, today.getDate());
              setOpen(false);
            }}
          >
            New date
          </button>
          <button
            className="add-menu-item"
            onClick={() => {
              addPerson();
              setOpen(false);
            }}
          >
            New person
          </button>
          <div className="add-menu-hint">
            Tip: click &amp; drag on the canvas to draw a span, or click for a date.
          </div>
        </div>
      )}
      <button
        className={`add-button ${open ? "is-open" : ""}`}
        aria-label="Add"
        title="Add"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="add-button-plus">+</span>
      </button>
    </div>
  );
}
