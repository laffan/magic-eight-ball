import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { DateMark, Group, Layer, Person, RepeatKind } from "../types";

export const MONTH_WIDTH = 30;
export const MONTHS_PER_YEAR = 12;
export const YEAR_WIDTH = MONTH_WIDTH * MONTHS_PER_YEAR;

export const HEADER_HEIGHT = 64;
export const LANE_DATES_STRIP_HEIGHT = 36;
export const LANE_ROW_HEIGHT = 36;
export const LANE_ROW_PAD_TOP = 12;
export const LANE_MIN_SPAN_ROWS = 1;
export const LANE_BOTTOM_PAD = 6;

type ExportedSnapshot = {
  version: number;
  startYear: number;
  numYears: number;
  layers: Layer[];
  dates: DateMark[];
  people: Person[];
  groups: Group[];
};

type Store = {
  startYear: number;
  numYears: number;
  layers: Layer[];
  dates: DateMark[];
  people: Person[];
  groups: Group[];
  selectedId: string | null;
  inspectorOpen: boolean;

  setSelected: (id: string | null) => void;
  toggleInspector: () => void;

  addLayer: (
    startMonthIdx: number,
    startDayOfMonth: number,
    endMonthIdx: number,
    endDayOfMonth: number,
    opts?: { label?: string; containerId?: string }
  ) => Layer;
  addDate: (
    monthIdx: number,
    dayOfMonth: number,
    opts?: { label?: string; containerId?: string }
  ) => DateMark;
  addPerson: (name?: string) => Person;
  addGroup: (name?: string) => Group;

  updateLayer: (id: string, patch: Partial<Layer>) => void;
  updateDate: (id: string, patch: Partial<DateMark>) => void;
  updatePerson: (id: string, patch: Partial<Person>) => void;
  updateGroup: (id: string, patch: Partial<Group>) => void;

  removeItem: (id: string) => void;

  exportSnapshot: () => ExportedSnapshot;
  importSnapshot: (data: unknown) => boolean;
};

let counter = 0;
const nextId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

const currentYear = new Date().getFullYear();

const SNAPSHOT_VERSION = 1;

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      startYear: currentYear,
      numYears: 5,
      layers: [],
      dates: [],
      people: [],
      groups: [],
      selectedId: null,
      inspectorOpen: true,

      setSelected: (id) => set({ selectedId: id }),
      toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),

      addLayer: (startMonthIdx, startDayOfMonth, endMonthIdx, endDayOfMonth, opts) => {
        // Normalize so start <= end on the timeline.
        const startKey = startMonthIdx * 100 + startDayOfMonth;
        const endKey = endMonthIdx * 100 + endDayOfMonth;
        const swap = startKey > endKey;
        const layer: Layer = {
          id: nextId("l"),
          kind: "layer",
          label: opts?.label ?? "Untitled span",
          startMonthIdx: swap ? endMonthIdx : startMonthIdx,
          startDayOfMonth: swap ? endDayOfMonth : startDayOfMonth,
          endMonthIdx: swap ? startMonthIdx : endMonthIdx,
          endDayOfMonth: swap ? startDayOfMonth : endDayOfMonth,
          containerId: opts?.containerId,
        };
        set((s) => ({ layers: [...s.layers, layer], selectedId: layer.id }));
        return layer;
      },

      addDate: (monthIdx, dayOfMonth, opts) => {
        const date: DateMark = {
          id: nextId("d"),
          kind: "date",
          label: opts?.label ?? "Untitled date",
          monthIdx,
          dayOfMonth: Math.max(1, Math.min(31, dayOfMonth)),
          important: false,
          repeat: "none",
          containerId: opts?.containerId,
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
          birthYear: today.getFullYear() - 30,
          birthMonth: today.getMonth(),
          birthDay: today.getDate(),
        };
        set((s) => ({ people: [...s.people, person], selectedId: person.id }));
        return person;
      },

      addGroup: (name) => {
        const group: Group = {
          id: nextId("g"),
          kind: "group",
          name: name ?? "Untitled group",
          visible: true,
        };
        set((s) => ({ groups: [...s.groups, group], selectedId: group.id }));
        return group;
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

      updateGroup: (id, patch) =>
        set((s) => ({
          groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),

      removeItem: (id) =>
        set((s) => {
          const isContainer =
            s.people.some((p) => p.id === id) || s.groups.some((g) => g.id === id);
          return {
            layers: s.layers
              .filter((l) => l.id !== id)
              .map((l) =>
                isContainer && l.containerId === id ? { ...l, containerId: undefined } : l
              ),
            dates: s.dates
              .filter((d) => d.id !== id)
              .map((d) =>
                isContainer && d.containerId === id ? { ...d, containerId: undefined } : d
              ),
            people: s.people.filter((p) => p.id !== id),
            groups: s.groups.filter((g) => g.id !== id),
            selectedId: s.selectedId === id ? null : s.selectedId,
          };
        }),

      exportSnapshot: () => {
        const s = get();
        return {
          version: SNAPSHOT_VERSION,
          startYear: s.startYear,
          numYears: s.numYears,
          layers: s.layers,
          dates: s.dates,
          people: s.people,
          groups: s.groups,
        };
      },

      importSnapshot: (raw: unknown) => {
        if (!raw || typeof raw !== "object") return false;
        const data = raw as Partial<ExportedSnapshot>;
        if (!Array.isArray(data.layers) || !Array.isArray(data.dates)) return false;
        const normLayers = (data.layers as Layer[]).map((l) => ({
          id: l.id,
          kind: "layer" as const,
          label: l.label,
          startMonthIdx: l.startMonthIdx,
          startDayOfMonth: l.startDayOfMonth ?? 1,
          endMonthIdx: l.endMonthIdx,
          endDayOfMonth: l.endDayOfMonth ?? 28,
          containerId: l.containerId,
        }));
        set({
          startYear: data.startYear ?? new Date().getFullYear(),
          numYears: data.numYears ?? 5,
          layers: normLayers,
          dates: data.dates,
          people: Array.isArray(data.people) ? data.people : [],
          groups: Array.isArray(data.groups) ? data.groups : [],
          selectedId: null,
        });
        return true;
      },
    }),
    {
      name: "magic-eight-ball",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        startYear: state.startYear,
        numYears: state.numYears,
        layers: state.layers,
        dates: state.dates,
        people: state.people,
        groups: state.groups,
      }),
      migrate: (persistedState: unknown, version: number) => {
        const s = (persistedState ?? {}) as Record<string, unknown>;
        if (version < 1 && Array.isArray(s.layers)) {
          s.layers = (s.layers as Array<Record<string, unknown>>).map((l) => {
            if (l.startDayOfMonth != null && l.endDayOfMonth != null) return l;
            const startYear = (s.startYear as number) ?? new Date().getFullYear();
            const endMonthIdx = l.endMonthIdx as number;
            const year = startYear + Math.floor(endMonthIdx / 12);
            const month = endMonthIdx % 12;
            const dim = new Date(year, month + 1, 0).getDate();
            return {
              ...l,
              startDayOfMonth: l.startDayOfMonth ?? 1,
              endDayOfMonth: l.endDayOfMonth ?? dim,
            };
          });
        }
        return s;
      },
    }
  )
);

export const totalMonths = (numYears: number) => numYears * MONTHS_PER_YEAR;

export const monthLabel = (idx: number) => {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[((idx % MONTHS_PER_YEAR) + MONTHS_PER_YEAR) % MONTHS_PER_YEAR];
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

// The right edge of a day cell (i.e. the start of the following day). Useful
// when computing the visual width of a span whose end day is *inclusive*.
export function dateToEndX(monthIdx: number, dayOfMonth: number, startYear: number): number {
  const year = startYear + Math.floor(monthIdx / 12);
  const month = ((monthIdx % 12) + 12) % 12;
  const dim = daysInMonth(year, month);
  const clamped = Math.max(1, Math.min(dim, dayOfMonth));
  return monthIdx * MONTH_WIDTH + (clamped / dim) * MONTH_WIDTH;
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

export type BirthdayOccurrence = Occurrence & { age: number };

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

  const cur = new Date(base);
  let safety = 10000;
  while (cur.getTime() < endMs && safety-- > 0) {
    if (cur.getTime() >= startMs) {
      pushOccurrence(out, cur, startYear, cur.getTime() === base.getTime());
    }
    if (repeat === "weekly") cur.setDate(cur.getDate() + 7);
    else if (repeat === "monthly") cur.setMonth(cur.getMonth() + 1);
    else if (repeat === "annual") cur.setFullYear(cur.getFullYear() + 1);
    else if (repeat === "custom") cur.setDate(cur.getDate() + customDays);
    else break;
  }

  if (!out.some((o) => o.isBase) && out.length > 0) {
    out[0] = { ...out[0], isBase: true };
  }
  return out;
}

export function generateBirthdayOccurrences(
  person: Person,
  startYear: number,
  numYears: number
): BirthdayOccurrence[] {
  const out: BirthdayOccurrence[] = [];
  for (let y = 0; y < numYears; y++) {
    const year = startYear + y;
    const age = year - person.birthYear;
    if (age < 0) continue;
    const dim = daysInMonth(year, person.birthMonth);
    const day = Math.max(1, Math.min(dim, person.birthDay));
    const monthIdx = y * 12 + person.birthMonth;
    out.push({
      monthIdx,
      dayOfMonth: day,
      x: dateToX(monthIdx, day, startYear),
      isBase: out.length === 0,
      age,
    });
  }
  return out;
}

// ----- Lane layout -----

export type LaneKind = "default" | "person" | "group";

export type Lane = {
  id: string | null;
  kind: LaneKind;
  label: string;
  person?: Person;
  group?: Group;
  spans: Layer[];
  dotDates: DateMark[];
  topY: number;
  height: number;
  datesTopY: number;
  datesHeight: number;
  rowsTopY: number;
  rowsHeight: number;
};

export const laneKey = (lane: Lane) => lane.id ?? "__default__";

export function computeLanes(input: {
  layers: Layer[];
  dates: DateMark[];
  people: Person[];
  groups: Group[];
}): { lanes: Lane[]; totalHeight: number } {
  const { layers, dates, people, groups } = input;
  const lanes: Lane[] = [];
  let y = HEADER_HEIGHT;

  const visibleGroups = groups.filter((g) => g.visible);

  const push = (
    id: string | null,
    kind: LaneKind,
    label: string,
    extras: Pick<Lane, "person" | "group"> = {}
  ) => {
    const idMatch = (v: string | undefined) => (v ?? null) === id;
    const spans = layers.filter((l) => idMatch(l.containerId));
    const dotDates = dates.filter((d) => idMatch(d.containerId) && !d.important);

    const datesHeight = LANE_DATES_STRIP_HEIGHT;
    const rowCount = Math.max(LANE_MIN_SPAN_ROWS, spans.length);
    const rowsHeight = rowCount * LANE_ROW_HEIGHT + LANE_ROW_PAD_TOP;
    const height = datesHeight + rowsHeight + LANE_BOTTOM_PAD;

    lanes.push({
      id,
      kind,
      label,
      ...extras,
      spans,
      dotDates,
      topY: y,
      height,
      datesTopY: y,
      datesHeight,
      rowsTopY: y + datesHeight,
      rowsHeight,
    });
    y += height;
  };

  push(null, "default", "");
  for (const p of people) push(p.id, "person", p.name, { person: p });
  for (const g of visibleGroups) push(g.id, "group", g.name, { group: g });

  return { lanes, totalHeight: y };
}
