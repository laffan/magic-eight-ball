import type { Layer, DateMark, ValueLayer, RepeatKind } from "../types";
const DAY = 86400000;
export const dayNumber = (year: number, month: number, day: number) =>
  Date.UTC(year, month, day) / DAY;
export function spanDays(l: Layer, year: number) {
  return (
    dayNumber(year, l.endMonthIdx, l.endDayOfMonth) -
    dayNumber(year, l.startMonthIdx, l.startDayOfMonth) +
    1
  );
}
export function repeatAllowed(l: Layer, year: number, repeat: RepeatKind) {
  const days = spanDays(l, year);
  return (
    repeat === "none" ||
    repeat === "custom" ||
    days <= (repeat === "weekly" ? 7 : repeat === "monthly" ? 28 : 365)
  );
}
export function occurrences(
  month: number,
  day: number,
  repeat: RepeatKind = "none",
  every = 14,
  year: number,
  years: number,
  repeatUntil?: string,
) {
  const base = dayNumber(year, month, day),
    end = dayNumber(year + years, 0, 1);
  const out: number[] = [];
  for (let n = 0, current = base; current < end && n < 10000; n++) {
    if (
      n > 0 &&
      repeatUntil &&
      current > Date.parse(repeatUntil + "T00:00:00Z") / DAY
    )
      break;
    out.push(current);
    if (repeat === "none") break;
    if (repeat === "weekly" || repeat === "custom")
      current =
        base +
        (n + 1) * (repeat === "weekly" ? 7 : Math.max(1, Math.floor(every)));
    else {
      const targetMonth = month + (n + 1) * (repeat === "monthly" ? 1 : 12);
      const last = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate();
      current = dayNumber(year, targetMonth, Math.min(day, last));
    }
  }
  return out;
}
export function spanOccurrences(l: Layer, year: number, years: number) {
  const repeat = repeatAllowed(l, year, l.repeat ?? "none") ? l.repeat : "none";
  return occurrences(
    l.startMonthIdx,
    l.startDayOfMonth,
    repeat,
    Math.max(spanDays(l, year), l.repeatEveryDays ?? 14),
    year,
    years,
    l.repeatUntil,
  );
}
export function valueSeries(
  value: ValueLayer,
  layers: Layer[],
  dates: DateMark[],
  year: number,
  years: number,
) {
  const start = Date.parse(value.startDate + "T00:00:00Z") / DAY;
  const end = dayNumber(year + years, 0, 1);
  if (!Number.isFinite(start)) return [];
  const changes = new Map<number, number>();
  const add = (day: number, amount: number) => {
    if (day >= start && day < end)
      changes.set(day, (changes.get(day) ?? 0) + amount);
  };
  for (const d of dates)
    if (d.valueEffect?.valueId === value.id)
      for (const day of occurrences(
        d.monthIdx,
        d.dayOfMonth,
        d.repeat,
        d.repeatEveryDays,
        year,
        years,
        d.repeatUntil,
      ))
        add(day, d.valueEffect.amount);
  for (const l of layers)
    if (l.valueEffect?.valueId === value.id) {
      const duration = spanDays(l, year);
      for (const day of spanOccurrences(l, year, years))
        for (let i = 0; i < duration; i++)
          add(day + i, l.valueEffect.amount / duration);
    }
  let amount = value.startingValue;
  const points = [{ day: start, amount }];
  for (let day = start; day < end; day++) {
    amount += changes.get(day) ?? 0;
    points.push({ day: day + 1, amount });
  }
  return points;
}
export function dayParts(day: number, year: number) {
  const d = new Date(day * DAY);
  return {
    month: (d.getUTCFullYear() - year) * 12 + d.getUTCMonth(),
    day: d.getUTCDate(),
  };
}
