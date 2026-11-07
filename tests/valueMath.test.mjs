import { test } from "node:test";
import assert from "node:assert/strict";
import {
  valueSeries,
  repeatAllowed,
  occurrences,
  dayParts,
} from "../src/state/valueMath.ts";
const value = {
  id: "v",
  kind: "value",
  name: "Savings",
  startDate: "2026-01-01",
  startingValue: 100,
};
const layer = {
  id: "l",
  kind: "layer",
  label: "Income",
  startMonthIdx: 0,
  startDayOfMonth: 1,
  endMonthIdx: 0,
  endDayOfMonth: 7,
  valueEffect: { valueId: "v", amount: 7 },
};
test("inclusive daily accrual, negative adjustments and repeated contributions", () => {
  const date = {
    id: "d",
    kind: "date",
    label: "Expense",
    monthIdx: 0,
    dayOfMonth: 3,
    important: false,
    valueEffect: { valueId: "v", amount: -2 },
  };
  const points = valueSeries(
    value,
    [{ ...layer, repeat: "weekly" }],
    [date],
    2026,
    1,
  );
  assert.equal(points[1].amount, 101);
  assert.equal(points[7].amount, 105);
  assert.equal(points[14].amount, 112);
});
test("repeat options exclude overlapping intervals", () => {
  assert.equal(
    repeatAllowed({ ...layer, endDayOfMonth: 14 }, 2026, "weekly"),
    false,
  );
  assert.equal(
    repeatAllowed({ ...layer, endDayOfMonth: 14 }, 2026, "monthly"),
    true,
  );
});
test("monthly repeats clamp without losing their anchor", () => {
  const days = occurrences(0, 31, "monthly", 14, 2026, 1).map((d) =>
    dayParts(d, 2026),
  );
  assert.deepEqual(days.slice(0, 3), [
    { month: 0, day: 31 },
    { month: 1, day: 28 },
    { month: 2, day: 31 },
  ]);
});
test("effects before the value starts are excluded", () => {
  const points = valueSeries(
    { ...value, startDate: "2026-01-05" },
    [layer],
    [],
    2026,
    1,
  );
  assert.equal(points[0].amount, 100);
  assert.equal(points[3].amount, 103);
});

test("repeat end dates include the final start and exclude later occurrences", () => {
  const starts = occurrences(0, 1, "weekly", 7, 2026, 1, "2026-01-08");
  assert.equal(starts.length, 2);
  const points = valueSeries(
    value,
    [{ ...layer, repeat: "weekly", repeatUntil: "2026-01-08" }],
    [],
    2026,
    1,
  );
  assert.equal(points[14].amount, 114);
  assert.equal(points[21].amount, 114);
});
test("date effects stop after the inclusive repeat end", () => {
  const date = {
    id: "d",
    kind: "date",
    label: "Deposit",
    monthIdx: 0,
    dayOfMonth: 1,
    important: false,
    repeat: "weekly",
    repeatUntil: "2026-01-08",
    valueEffect: { valueId: "v", amount: 10 },
  };
  const points = valueSeries(value, [], [date], 2026, 1);
  assert.equal(points[8].amount, 120);
  assert.equal(points[15].amount, 120);
});
