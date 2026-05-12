import { generateBirthdayOccurrences, useStore } from "../state/store";
import type { Person } from "../types";

export default function BirthdayMarker({ person }: { person: Person }) {
  const selectedId = useStore((s) => s.selectedId);
  const setSelected = useStore((s) => s.setSelected);
  const startYear = useStore((s) => s.startYear);
  const numYears = useStore((s) => s.numYears);

  const occurrences = generateBirthdayOccurrences(person, startYear, numYears);
  const isSelected = selectedId === person.id;

  return (
    <>
      {occurrences.map((occ, i) => (
        <div
          key={`${person.id}-${i}`}
          data-interactive
          className={`date-dot-wrap is-birthday ${isSelected ? "is-selected" : ""} ${
            occ.isBase ? "is-base" : "is-repeat"
          }`}
          style={{ left: occ.x }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setSelected(person.id);
          }}
          title={`${person.name}'s birthday`}
        >
          <span className="date-dot is-birthday-dot" />
          <span className="date-dot-label">{person.name}</span>
        </div>
      ))}
    </>
  );
}
