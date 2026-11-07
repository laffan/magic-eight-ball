import { valueColor } from "./valueColor";
import { useEffect, useState } from "react";

export default function MoneyInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText((current) =>
      Number(current) === value && current.trim() !== ""
        ? current
        : String(value),
    );
  }, [value]);
  return (
    <input
      className="field-input"
      style={{color: valueColor(value)}}
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        if (!/^-?\d*(\.\d*)?$/.test(next)) return;
        setText(next);
        if (next.trim() && Number.isFinite(Number(next)))
          onChange(Number(next));
      }}
      onBlur={() => setText(String(value))}
    />
  );
}
