import { generateBirthdayOccurrences, useStore } from "../state/store";
import type { Person } from "../types";

type Props = { person: Person; yCenter?: number };

export default function BirthdayMarker({ person, yCenter }: Props) {
  const selectedId = useStore((s) => s.selectedId);
  const setSelected = useStore((s) => s.setSelected);
  const startYear = useStore((s) => s.startYear);
  const numYears = useStore((s) => s.numYears);
  const monthWidth = useStore((s) => s.monthWidth);

  const occurrences = generateBirthdayOccurrences(person, startYear, numYears, monthWidth);
  const isSelected = selectedId === person.id;

  return (
    <>
      {occurrences.map((occ, i) => (
        <div
          key={`${person.id}-${i}`}
          data-interactive
          className={`date-dot-wrap is-birthday ${isSelected ? "is-selected" : ""}`}
          style={{ left: occ.x, top: yCenter ?? "50%" }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setSelected(person.id);
          }}
          title={`${person.name} — age ${occ.age}`}
        >
          <span className="date-dot is-birthday-dot" />
          <span className="date-dot-label is-age">{occ.age}</span>
        </div>
      ))}
    </>
  );
}
