export type Layer = {
  id: string;
  kind: "layer";
  label: string;
  startMonthIdx: number;
  endMonthIdx: number;
  personId?: string;
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
  repeatEveryDays?: number;
  personId?: string;
};

export type Person = {
  id: string;
  kind: "person";
  name: string;
  birthMonth: number; // 0..11
  birthDay: number; // 1..31
};

export type Item = Layer | DateMark | Person;
