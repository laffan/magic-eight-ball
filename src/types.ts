export type Layer = {
  id: string;
  kind: "layer";
  label: string;
  startMonthIdx: number;
  endMonthIdx: number;
};

export type RepeatKind = "none" | "weekly" | "monthly" | "annual" | "custom";

export type DateMark = {
  id: string;
  kind: "date";
  label: string;
  monthIdx: number;
  repeat?: RepeatKind;
  repeatEveryDays?: number;
};

export type Item = Layer | DateMark;
