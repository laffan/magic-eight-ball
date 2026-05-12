export type Layer = {
  id: string;
  kind: "layer";
  label: string;
  startMonthIdx: number;
  endMonthIdx: number;
};

export type DateMark = {
  id: string;
  kind: "date";
  label: string;
  monthIdx: number;
};

export type Item = Layer | DateMark;
