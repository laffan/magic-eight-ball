import { useEffect } from "react";
import { useStore } from "./state/store";
import LayerSidebar from "./components/LayerSidebar";
import Canvas from "./components/Canvas";
import Inspector from "./components/Inspector";

export default function App() {
  const inspectorOpen = useStore((s) => s.inspectorOpen);
  const setSelected = useStore((s) => s.setSelected);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSelected]);

  return (
    <div className={`app ${inspectorOpen ? "inspector-open" : "inspector-closed"}`}>
      <LayerSidebar />
      <Canvas />
      <Inspector />
    </div>
  );
}
