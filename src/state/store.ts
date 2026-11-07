import { occurrences, dayParts, dayNumber } from "./valueMath";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { DateMark, Group, Layer, Person, ValueLayer } from "../types";

export const MONTH_WIDTH_DEFAULT = 30;
export const MONTHS_PER_YEAR = 12;

export const HEADER_HEIGHT = 64;
export const LANE_DATES_MIN_HEIGHT = 36;
export const LANE_ROW_HEIGHT = 36;
export const LANE_ROW_PAD_TOP = 12;
export const LANE_MIN_SPAN_ROWS = 1;
export const LANE_BOTTOM_PAD = 6;

// Stacked-dot constants (used when dates need to stack vertically to avoid overlap).
export const STACK_ROW_HEIGHT = 24;
export const STACK_PAD_TOP = 6;
export const STACK_PAD_BOTTOM = 6;
// Approximate width reserved per labeled dot when deciding overlap. Conservative — works
// for short labels and shifts long ones down without measuring DOM.
export const LABEL_RESERVATION = 80;

export const ZOOM_STOPS = [36, 12, 6, 3, 1] as const;
export type MonthsVisible = (typeof ZOOM_STOPS)[number];

type ExportedSnapshot = {
  version: number;
  startYear: number;
  numYears: number;
  layers: Layer[];
  dates: DateMark[];
  people: Person[];
  groups: Group[];
  values: ValueLayer[];
};

type Store = {
  startYear: number;
  numYears: number;
  layers: Layer[];
  dates: DateMark[];
  people: Person[];
  groups: Group[];
  values: ValueLayer[];
  selectedId: string | null;
  inspectorOpen: boolean;

  monthsVisible: MonthsVisible;
  monthWidth: number; // px per month, recomputed from viewport when monthsVisible changes

  // A scroll-into-view request. The nonce changes every time so the canvas
  // re-runs the scroll even when the same id is targeted twice in a row.
  scrollToTarget: { id: string; nonce: number } | null;

  setSelected: (id: string | null) => void;
  toggleInspector: () => void;
  setMonthsVisible: (n: MonthsVisible) => void;
  setMonthWidth: (w: number) => void;
  setNumYears: (n: number) => void;
  requestScrollTo: (id: string) => void;

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
  addValue: () => void;
  updateValue: (id: string, patch: Partial<ValueLayer>) => void;
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

const SNAPSHOT_VERSION = 3;

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      startYear: currentYear,
      numYears: 5,
      layers: [],
      dates: [],
      people: [],
      groups: [],
      values: [],
      selectedId: null,
      inspectorOpen: true,

      monthsVisible: 36,
      monthWidth: MONTH_WIDTH_DEFAULT,
      scrollToTarget: null,

      setSelected: (id) => set({ selectedId: id }),
      toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),
      setMonthsVisible: (n) => set({ monthsVisible: n }),
      setMonthWidth: (w) => set({ monthWidth: Math.max(8, w) }),
      setNumYears: (n) => set({ numYears: Math.max(1, Math.floor(n)) }),
      requestScrollTo: (id) =>
        set((s) => ({
          scrollToTarget: { id, nonce: (s.scrollToTarget?.nonce ?? 0) + 1 },
        })),

      addLayer: (startMonthIdx, startDayOfMonth, endMonthIdx, endDayOfMonth, opts) => {
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

      addValue: () => {
        const now = new Date();
        const value: ValueLayer = { id: nextId("v"), kind: "value", name: "Untitled value", startDate: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`, startingValue: 0 };
        set(s => ({ values: [...s.values, value], selectedId: value.id }));
      },
      updateValue: (id, patch) => set(s => ({ values: s.values.map(v => v.id === id ? {...v, ...patch} : v) })),
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
            layers: s.layers.map(l => l.valueEffect?.valueId === id ? {...l, valueEffect: undefined} : l)
              .filter((l) => l.id !== id)
              .map((l) =>
                isContainer && l.containerId === id ? { ...l, containerId: undefined } : l
              ),
            dates: s.dates.map(d => d.valueEffect?.valueId === id ? {...d, valueEffect: undefined} : d)
              .filter((d) => d.id !== id)
              .map((d) =>
                isContainer && d.containerId === id ? { ...d, containerId: undefined } : d
              ),
            values: s.values.filter(v => v.id !== id),
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
          values: s.values,
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
          repeat: l.repeat, repeatEveryDays: l.repeatEveryDays, repeatUntil: l.repeatUntil, valueEffect: l.valueEffect,
        }));
        set({
          startYear: data.startYear ?? new Date().getFullYear(),
          numYears: data.numYears ?? 5,
          layers: normLayers,
          dates: data.dates,
          people: Array.isArray(data.people) ? data.people : [],
          groups: Array.isArray(data.groups) ? data.groups : [],
          values: Array.isArray(data.values) ? data.values : [],
          selectedId: null,
        });
        return true;
      },
    }),
    {
      name: "magic-eight-ball",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        startYear: state.startYear,
        numYears: state.numYears,
        layers: state.layers,
        dates: state.dates,
        people: state.people,
        groups: state.groups,
        values: state.values,
        monthsVisible: state.monthsVisible,
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
        if (version < 2) s.values = [];
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

export function dateToX(monthIdx: number, dayOfMonth: number, startYear: number, monthWidth: number): number {
  const year = startYear + Math.floor(monthIdx / 12);
  const month = ((monthIdx % 12) + 12) % 12;
  const dim = daysInMonth(year, month);
  const clamped = Math.max(1, Math.min(dim, dayOfMonth));
  return monthIdx * monthWidth + ((clamped - 1) / dim) * monthWidth;
}

export function dateToEndX(monthIdx: number, dayOfMonth: number, startYear: number, monthWidth: number): number {
  const year = startYear + Math.floor(monthIdx / 12);
  const month = ((monthIdx % 12) + 12) % 12;
  const dim = daysInMonth(year, month);
  const clamped = Math.max(1, Math.min(dim, dayOfMonth));
  return monthIdx * monthWidth + (clamped / dim) * monthWidth;
}

export function xToDateParts(x: number, startYear: number, monthWidth: number): {
  year: number;
  month: number;
  day: number;
  monthIdx: number;
} {
  const monthsTotalGuess = Math.max(0, x) / monthWidth;
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

export function generateDateOccurrences(date: DateMark, startYear: number, numYears: number, monthWidth: number): Occurrence[] {
  const base = dayNumber(startYear, date.monthIdx, date.dayOfMonth);
  return occurrences(date.monthIdx,date.dayOfMonth,date.repeat,date.repeatEveryDays,startYear,numYears,date.repeatUntil)
    .filter(day => day >= dayNumber(startYear,0,1))
    .map(day => {
      const parts = dayParts(day,startYear);
      return {monthIdx:parts.month,dayOfMonth:parts.day,x:dateToX(parts.month,parts.day,startYear,monthWidth),isBase:day===base};
    });
}

export function generateBirthdayOccurrences(
  person: Person,
  startYear: number,
  numYears: number,
  monthWidth: number
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
      x: dateToX(monthIdx, day, startYear, monthWidth),
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
  // Vertical stacking levels for each dot in the dates strip (entity id → level).
  // The birthday entity is keyed as `birthday-${personId}`.
  stackLevels: Map<string, number>;
};

export const laneKey = (lane: Lane) => lane.id ?? "__default__";

export const birthdayKey = (personId: string) => `birthday-${personId}`;

export function laneYCenter(_lane: Lane, level: number): number {
  return STACK_PAD_TOP + (level + 0.5) * STACK_ROW_HEIGHT;
}

export function computeLanes(input: {
  layers: Layer[];
  dates: DateMark[];
  people: Person[];
  groups: Group[];
  startYear: number;
  numYears: number;
  monthWidth: number;
}): { lanes: Lane[]; totalHeight: number } {
  const { layers, dates, people, groups, startYear, numYears, monthWidth } = input;
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

    // Gather entity anchor x positions for stacking. A repeating date (or a
    // person's annual birthday) gets its own exclusive row so all of its
    // occurrences live on one shared y position.
    type Anchor = { id: string; x: number; exclusive: boolean };
    const anchors: Anchor[] = [];
    for (const d of dotDates) {
      const repeats = d.repeat && d.repeat !== "none";
      anchors.push({
        id: d.id,
        x: dateToX(d.monthIdx, d.dayOfMonth, startYear, monthWidth),
        exclusive: !!repeats,
      });
    }
    if (kind === "person" && extras.person) {
      const firstBirthday = generateBirthdayOccurrences(
        extras.person,
        startYear,
        numYears,
        monthWidth
      )[0];
      if (firstBirthday) {
        anchors.push({
          id: birthdayKey(extras.person.id),
          x: firstBirthday.x,
          exclusive: true,
        });
      }
    }

    const stackLevels = new Map<string, number>();
    const levelRight: number[] = [];

    // Exclusive entities each get their own brand-new level (occupied the
    // whole timeline width so nothing else can fall into the same row).
    const exclusives = anchors.filter((a) => a.exclusive).sort((a, b) => a.x - b.x);
    for (const a of exclusives) {
      const level = levelRight.length;
      levelRight.push(Number.POSITIVE_INFINITY);
      stackLevels.set(a.id, level);
    }

    // Shared entities use the standard greedy stacker, skipping over any
    // exclusive rows because their right-edge is Infinity.
    const shared = anchors.filter((a) => !a.exclusive).sort((a, b) => a.x - b.x);
    for (const a of shared) {
      let level = 0;
      while (level < levelRight.length && levelRight[level] > a.x) level++;
      if (level >= levelRight.length) levelRight.push(0);
      levelRight[level] = a.x + LABEL_RESERVATION;
      stackLevels.set(a.id, level);
    }

    const maxLevel = anchors.length
      ? Math.max(...anchors.map((a) => stackLevels.get(a.id) ?? 0))
      : 0;
    const stackedHeight = STACK_PAD_TOP + (maxLevel + 1) * STACK_ROW_HEIGHT + STACK_PAD_BOTTOM;
    const datesHeight = Math.max(LANE_DATES_MIN_HEIGHT, stackedHeight);

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
      stackLevels,
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
