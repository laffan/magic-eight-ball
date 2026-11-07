import ValueContributors from "./ValueContributors";
import MoneyInput from "./MoneyInput";
import { useStore } from "../state/store";
import type { Layer, DateMark, ValueLayer, RepeatKind } from "../types";
import { repeatAllowed, spanDays } from "../state/valueMath";
export function EffectFields({ item }: { item: Layer | DateMark }) {
  const values = useStore((s) => s.values),
    updateLayer = useStore((s) => s.updateLayer),
    updateDate = useStore((s) => s.updateDate),
    year = useStore((s) => s.startYear);
  const update = (
    patch: Partial<
      Pick<Layer, "repeat" | "repeatEveryDays" | "repeatUntil" | "valueEffect">
    >,
  ) =>
    item.kind === "layer"
      ? updateLayer(item.id, patch)
      : updateDate(item.id, patch);
  return (
    <>
      {item.kind === "layer" && (
        <>
          <label className="field">
            Repeating
            <select
              className="field-input"
              value={
                repeatAllowed(item, year, item.repeat ?? "none")
                  ? (item.repeat ?? "none")
                  : "none"
              }
              onChange={(e) => update({ repeat: e.target.value as RepeatKind })}
            >
              {(["none", "weekly", "monthly", "annual", "custom"] as const)
                .filter((r) => repeatAllowed(item, year, r))
                .map((r) => (
                  <option key={r} value={r}>
                    {
                      {
                        none: "Does not repeat",
                        weekly: "Weekly",
                        monthly: "Monthly",
                        annual: "Yearly",
                        custom: "Custom",
                      }[r]
                    }
                  </option>
                ))}
            </select>
          </label>
          {item.repeat === "custom" && (
            <label className="field">
              Every (days)
              <input
                className="field-input"
                type="number"
                min={spanDays(item, year)}
                value={Math.max(
                  spanDays(item, year),
                  item.repeatEveryDays ?? 14,
                )}
                onChange={(e) =>
                  update({
                    repeatEveryDays: Math.max(
                      spanDays(item, year),
                      Math.floor(Number(e.target.value)),
                    ),
                  })
                }
              />
            </label>
          )}
        </>
      )}
      {item.repeat && item.repeat !== "none" && (
        <>
          <label className="field-check">
            <input
              type="checkbox"
              checked={item.repeatUntil !== undefined}
              onChange={(e) =>
                update({
                  repeatUntil: e.target.checked
                    ? new Date().toISOString().slice(0, 10)
                    : undefined,
                })
              }
            />
            Repeat Ends
          </label>
          {item.repeatUntil !== undefined && (
            <label className="field">
              Repeat end date
              <input
                className="field-input"
                type="date"
                value={item.repeatUntil}
                onChange={(e) => {
                  if (e.target.value) update({ repeatUntil: e.target.value });
                }}
              />
            </label>
          )}
        </>
      )}
      <label className="field-check">
        <input
          type="checkbox"
          checked={!!item.valueEffect}
          onChange={(e) =>
            update({
              valueEffect: e.target.checked
                ? { valueId: values[0]?.id ?? "", amount: 0 }
                : undefined,
            })
          }
        />
        Affects Value
      </label>
      {item.valueEffect && (
        <>
          <label className="field">
            Value
            <select
              className="field-input"
              value={item.valueEffect.valueId}
              onChange={(e) =>
                update({
                  valueEffect: {
                    ...item.valueEffect!,
                    valueId: e.target.value,
                  },
                })
              }
            >
              <option value="">Select a value</option>
              {values.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Amount (USD)
            <MoneyInput
              key={item.id}
              value={item.valueEffect.amount}
              onChange={(amount) =>
                update({ valueEffect: { ...item.valueEffect!, amount } })
              }
            />
          </label>
        </>
      )}
    </>
  );
}
export default function ValueFields({ item }: { item: ValueLayer }) {
  const update = useStore((s) => s.updateValue),
    remove = useStore((s) => s.removeItem);
  return (
    <div className="inspector-fields">
      <label className="field">
        Name
        <input
          className="field-input"
          value={item.name}
          onChange={(e) => update(item.id, { name: e.target.value })}
        />
      </label>
      <label className="field">
        Start date
        <input
          className="field-input"
          type="date"
          value={item.startDate}
          onChange={(e) => {
            if (e.target.value) update(item.id, { startDate: e.target.value });
          }}
        />
      </label>
      <label className="field">
        Starting value (USD)
        <MoneyInput
          key={item.id}
          value={item.startingValue}
          onChange={(startingValue) => update(item.id, { startingValue })}
        />
      </label>
      <ValueContributors valueId={item.id} />
      <button className="danger-btn" onClick={() => remove(item.id)}>
        Delete
      </button>
    </div>
  );
}
