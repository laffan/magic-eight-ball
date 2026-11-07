import { monthLabel, useStore } from "../state/store";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", signDisplay: "always",
});

export default function ValueContributors({ valueId }: { valueId: string }) {
  const layers = useStore(s => s.layers);
  const dates = useStore(s => s.dates);
  const startYear = useStore(s => s.startYear);
  const select = useStore(s => s.setSelected);
  const scrollTo = useStore(s => s.requestScrollTo);
  const contributors = [...layers, ...dates]
    .filter(item => item.valueEffect?.valueId === valueId)
    .sort((a, b) => {
      const aMonth = a.kind === "date" ? a.monthIdx : a.startMonthIdx;
      const bMonth = b.kind === "date" ? b.monthIdx : b.startMonthIdx;
      const aDay = a.kind === "date" ? a.dayOfMonth : a.startDayOfMonth;
      const bDay = b.kind === "date" ? b.dayOfMonth : b.startDayOfMonth;
      return aMonth - bMonth || aDay - bDay || a.label.localeCompare(b.label);
    });
  const formatDate = (month: number, day: number) =>
    `${monthLabel(month)} ${day}, ${startYear + Math.floor(month / 12)}`;
  return <section className="value-contributors" aria-label="Affected by">
    <h3 className="field-label">Affected by</h3>
    {contributors.length === 0 ? <p>No dates or spans affect this value yet.</p> :
      <ul>{contributors.map(item => <li key={item.id}>
        <button type="button" className="value-contributor-link" onClick={() => {
          select(item.id);
          scrollTo(item.id);
        }}>
          {item.label || (item.kind === "date" ? "Untitled date" : "Untitled span")}
        </button>
        <span className="value-contributor-detail">
          {item.kind === "date" ? `Date · ${formatDate(item.monthIdx,item.dayOfMonth)}` :
            `Span · ${formatDate(item.startMonthIdx,item.startDayOfMonth)} – ${formatDate(item.endMonthIdx,item.endDayOfMonth)}`}
          {` · ${usd.format(item.valueEffect?.amount ?? 0)}`}
          {item.repeat && item.repeat !== "none" ? " · Repeating" : ""}
        </span>
      </li>)}</ul>}
  </section>;
}
