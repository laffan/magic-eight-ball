export type Layer = {
  id: string;
  kind: "layer";
  repeat?: RepeatKind;
  repeatUntil?: string;
  repeatEveryDays?: number;
  label: string;
  startMonthIdx: number;
  startDayOfMonth: number;
  endMonthIdx: number;
  endDayOfMonth: number;
  valueEffect?: { valueId: string; amount: number };
  containerId?: string;
};

export type RepeatKind = "none" | "weekly" | "monthly" | "annual" | "custom";

export type DateMark = {
  id: string;
  kind: "date";
  label: string;
  monthIdx: number;
  dayOfMonth: number;
  important: boolean;
  repeat?: RepeatKind;
  repeatUntil?: string;
  repeatEveryDays?: number;
  valueEffect?: { valueId: string; amount: number };
  containerId?: string;
  color?: string;
};

export type Person = {
  id: string;
  kind: "person";
  name: string;
  birthYear: number;
  birthMonth: number; // 0..11
  birthDay: number; // 1..31
};

export type Group = {
  id: string;
  kind: "group";
  name: string;
  visible: boolean;
};

export type Container = Person | Group;
export type Item = Layer | DateMark | Person | Group | ValueLayer;

export type ValueLayer = { id: string; kind: "value"; name: string; startDate: string; startingValue: number };
