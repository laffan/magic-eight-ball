import { create } from "zustand";
import type { DateMark, Layer, Person, RepeatKind } from "../types";

export const MONTH_WIDTH = 30;
export const MONTHS_PER_YEAR = 12;
export const YEAR_WIDTH = MONTH_WIDTH * MONTHS_PER_YEAR;

type Store = {
  startYear: number;
  numYears: number;
  layers: Layer[];
  dates: DateMark[];
  people: Person[];
  selectedId: string | null;
  inspectorOpen: boolean;

  setSelected: (id: string | null) => void;
  toggleInspector: () => void;

  addLayer: (startMonthIdx: number, endMonthIdx: number, label?: string) => Layer;
  addDate: (monthIdx: number, dayOfMonth: number, label?: string) => DateMark;
  addPerson: (name?: string) => Person;

  updateLayer: (id: string, patch: Partial<Layer>) => void;
  updateDate: (id: string, patch: Partial<DateMark>) => void;
  updatePerson: (id: string, patch: Partial<Person>) => void;

  removeItem: (id: string) => void;
};

let counter = 0;
const nextId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

const currentYear = new Date().getFullYear();

export const useStore = create<Store>((set) => ({
  startYear: currentYear,
  numYears: 5,
  layers: [],
  dates: [],
  people: [],
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
      label: label ?? "Untitled span",
      startMonthIdx: lo,
      endMonthIdx: hi,
    };
    set((s) => ({ layers: [...s.layers, layer], selectedId: layer.id }));
    return layer;
  },

  addDate: (monthIdx, dayOfMonth, label) => {
    const date: DateMark = {
      id: nextId("d"),
      kind: "date",
      label: label ?? "Untitled date",
      monthIdx,
      dayOfMonth: Math.max(1, Math.min(31, dayOfMonth)),
      important: false,
      repeat: "none",
    };
    set((s) => ({ dates: [...s.dates, date], selectedId: date.id }));
    return date;
  },

  addPerson: (name) => {
    const today = new Date();
    const person: Person = {
      id: nextId("p"),
      kind: "person",
      name: name ?? "Untitled person",
      birthMonth: today.getMonth(),
      birthDay: today.getDate(),
    };
    set((s) => ({ people: [...s.people, person], selectedId: person.id }));
    return person;
  },

  updateLayer: (id, patch) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    })),

  updateDate: (id, patch) =>
    set((s) => ({
      dates: s.dates.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    })),

  updatePerson: (id, patch) =>
    set((s) => ({
      people: s.people.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),

  removeItem: (id) =>
    set((s) => {
      const isPerson = s.people.some((p) => p.id === id);
      return {
        layers: s.layers
          .filter((l) => l.id !== id)
          .map((l) => (isPerson && l.personId === id ? { ...l, personId: undefined } : l)),
        dates: s.dates
          .filter((d) => d.id !== id)
          .map((d) => (isPerson && d.personId === id ? { ...d, personId: undefined } : d)),
        people: s.people.filter((p) => p.id !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
      };
    }),
}));

export const totalMonths = (numYears: number) => numYears * MONTHS_PER_YEAR;

export const monthLabel = (idx: number) => {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[idx % MONTHS_PER_YEAR];
};

export const monthLabelLong = (m: number) => {
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return names[m];
};

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function dateToX(monthIdx: number, dayOfMonth: number, startYear: number): number {
  const year = startYear + Math.floor(monthIdx / 12);
  const month = ((monthIdx % 12) + 12) % 12;
  const dim = daysInMonth(year, month);
  const clamped = Math.max(1, Math.min(dim, dayOfMonth));
  return monthIdx * MONTH_WIDTH + ((clamped - 1) / dim) * MONTH_WIDTH;
}

export function xToDateParts(x: number, startYear: number): {
  year: number;
  month: number;
  day: number;
  monthIdx: number;
} {
  const monthsTotalGuess = Math.max(0, x) / MONTH_WIDTH;
  const monthIdx = Math.max(0, Math.floor(monthsTotalGuess));
  const year = startYear + Math.floor(monthIdx / 12);
  const month = ((monthIdx % 12) + 12) % 12;
  const dim = daysInMonth(year, month);
  const fraction = Math.max(0, Math.min(0.9999, monthsTotalGuess - monthIdx));
  const day = Math.max(1, Math.min(dim, Math.floor(fraction * dim) + 1));
  return { year, month, day, monthIdx };
}

export type Occurrence = {
  monthIdx: number;
  dayOfMonth: number;
  x: number;
  isBase: boolean;
};

function pushOccurrence(out: Occurrence[], d: Date, startYear: number, isBase: boolean): void {
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  const monthIdx = (year - startYear) * 12 + month;
  out.push({ monthIdx, dayOfMonth: day, x: dateToX(monthIdx, day, startYear), isBase });
}

export function generateDateOccurrences(
  date: DateMark,
  startYear: number,
  numYears: number
): Occurrence[] {
  const out: Occurrence[] = [];
  const baseYear = startYear + Math.floor(date.monthIdx / 12);
  const baseMonth = ((date.monthIdx % 12) + 12) % 12;
  const base = new Date(baseYear, baseMonth, date.dayOfMonth);

  const endMs = new Date(startYear + numYears, 0, 1).getTime();
  const startMs = new Date(startYear, 0, 1).getTime();

  const repeat: RepeatKind = date.repeat ?? "none";
  const customDays = Math.max(1, date.repeatEveryDays ?? 14);

  if (repeat === "none") {
    if (base.getTime() >= startMs && base.getTime() < endMs) {
      pushOccurrence(out, base, startYear, true);
    }
    return out;
  }

  // Forward from base, stopping when we leave the range.
  const cur = new Date(base);
  let first = true;
  let safety = 10000;
  while (cur.getTime() < endMs && safety-- > 0) {
    if (cur.getTime() >= startMs) {
      pushOccurrence(out, cur, startYear, first && cur.getTime() === base.getTime());
    }
    first = false;
    if (repeat === "weekly") cur.setDate(cur.getDate() + 7);
    else if (repeat === "monthly") cur.setMonth(cur.getMonth() + 1);
    else if (repeat === "annual") cur.setFullYear(cur.getFullYear() + 1);
    else if (repeat === "custom") cur.setDate(cur.getDate() + customDays);
    else break;
  }

  // Ensure the base appears exactly once in the result (it is the
  // selectable representative). If the base is outside the timeline range,
  // pick the first in-range occurrence as the representative.
  if (!out.some((o) => o.isBase) && out.length > 0) {
    out[0] = { ...out[0], isBase: true };
  }
  return out;
}

export function generateBirthdayOccurrences(
  person: Person,
  startYear: number,
  numYears: number
): Occurrence[] {
  const out: Occurrence[] = [];
  for (let y = 0; y < numYears; y++) {
    const year = startYear + y;
    const dim = daysInMonth(year, person.birthMonth);
    const day = Math.max(1, Math.min(dim, person.birthDay));
    const monthIdx = y * 12 + person.birthMonth;
    out.push({
      monthIdx,
      dayOfMonth: day,
      x: dateToX(monthIdx, day, startYear),
      isBase: y === 0,
    });
  }
  return out;
}
