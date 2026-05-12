import { create } from "zustand";
import type { DateMark, Item, Layer } from "../types";

export const MONTH_WIDTH = 30;
export const MONTHS_PER_YEAR = 12;
export const YEAR_WIDTH = MONTH_WIDTH * MONTHS_PER_YEAR;

type Store = {
  startYear: number;
  numYears: number;
  layers: Layer[];
  dates: DateMark[];
  selectedId: string | null;
  inspectorOpen: boolean;

  setSelected: (id: string | null) => void;
  toggleInspector: () => void;

  addLayer: (startMonthIdx: number, endMonthIdx: number, label?: string) => Layer;
  addDate: (monthIdx: number, label?: string) => DateMark;

  updateLayer: (id: string, patch: Partial<Layer>) => void;
  updateDate: (id: string, patch: Partial<DateMark>) => void;

  removeItem: (id: string) => void;

  getItem: (id: string | null) => Item | null;
};

let counter = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

const currentYear = new Date().getFullYear();

export const useStore = create<Store>((set, get) => ({
  startYear: currentYear,
  numYears: 5,
  layers: [],
  dates: [],
  selectedId: null,
  inspectorOpen: true,

  setSelected: (id) => set({ selectedId: id }),
  toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),

  addLayer: (startMonthIdx, endMonthIdx, label) => {
    const lo = Math.min(startMonthIdx, endMonthIdx);
    const hi = Math.max(startMonthIdx, endMonthIdx);
    const layer: Layer = {
      id: nextId("l"),
      kind: "layer",
      label: label ?? "Untitled layer",
      startMonthIdx: lo,
      endMonthIdx: hi,
    };
    set((s) => ({ layers: [...s.layers, layer], selectedId: layer.id }));
    return layer;
  },

  addDate: (monthIdx, label) => {
    const date: DateMark = {
      id: nextId("d"),
      kind: "date",
      label: label ?? "Untitled date",
      monthIdx,
    };
    set((s) => ({ dates: [...s.dates, date], selectedId: date.id }));
    return date;
  },

  updateLayer: (id, patch) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    })),

  updateDate: (id, patch) =>
    set((s) => ({
      dates: s.dates.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    })),

  removeItem: (id) =>
    set((s) => ({
      layers: s.layers.filter((l) => l.id !== id),
      dates: s.dates.filter((d) => d.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  getItem: (id) => {
    if (!id) return null;
    const s = get();
    return s.layers.find((l) => l.id === id) ?? s.dates.find((d) => d.id === id) ?? null;
  },
}));

export const totalMonths = (numYears: number) => numYears * MONTHS_PER_YEAR;

export const monthLabel = (idx: number) => {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[idx % MONTHS_PER_YEAR];
};
