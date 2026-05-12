// .ics (iCalendar / RFC 5545) reader.
//
// Intentionally minimal: we only extract VEVENTs and their SUMMARY, DTSTART and
// DTEND. Recurrence rules, time zones, attendees, alarms etc. are ignored — the
// user is expected to set repetition on the resulting items in the inspector.

export type IcsDate = {
  year: number;
  month: number; // 0..11
  day: number;
};

export type IcsEvent = {
  uid: string;
  summary: string;
  start: IcsDate;
  end?: IcsDate;
  allDay: boolean;
};

// Per RFC 5545, lines may be folded — a leading space or tab on the next line
// indicates a continuation of the previous logical line.
function unfoldLines(text: string): string[] {
  const raw = text.split(/\r?\n/);
  const out: string[] = [];
  for (const line of raw) {
    if (out.length > 0 && (line.startsWith(" ") || line.startsWith("\t"))) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function parseDate(value: string): (IcsDate & { allDay: boolean }) | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2})Z?)?$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (!Number.isFinite(year) || month < 0 || month > 11 || day < 1 || day > 31) {
    return null;
  }
  return { year, month, day, allDay: !m[4] };
}

function unescape(s: string): string {
  return s
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

export function parseIcs(text: string): IcsEvent[] {
  const lines = unfoldLines(text);
  const events: IcsEvent[] = [];

  type Draft = {
    uid?: string;
    summary?: string;
    start?: IcsDate;
    end?: IcsDate;
    allDay?: boolean;
  };
  let cur: Draft | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur && cur.summary && cur.start) {
        events.push({
          uid: cur.uid ?? "",
          summary: cur.summary,
          start: cur.start,
          end: cur.end,
          allDay: cur.allDay ?? false,
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;

    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const keyAndParams = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const key = keyAndParams.split(";")[0];

    if (key === "UID") {
      cur.uid = value;
    } else if (key === "SUMMARY") {
      cur.summary = unescape(value);
    } else if (key === "DTSTART") {
      const d = parseDate(value);
      if (d) {
        cur.start = { year: d.year, month: d.month, day: d.day };
        cur.allDay = d.allDay;
      }
    } else if (key === "DTEND") {
      const d = parseDate(value);
      if (d) cur.end = { year: d.year, month: d.month, day: d.day };
    }
  }

  return events;
}

export type ImportableItem =
  | {
      kind: "date";
      monthIdx: number;
      dayOfMonth: number;
      label: string;
    }
  | {
      kind: "layer";
      startMonthIdx: number;
      startDayOfMonth: number;
      endMonthIdx: number;
      endDayOfMonth: number;
      label: string;
    };

function daysBetween(a: IcsDate, b: IcsDate): number {
  const da = Date.UTC(a.year, a.month, a.day);
  const db = Date.UTC(b.year, b.month, b.day);
  return Math.round((db - da) / 86_400_000);
}

// All-day events use an exclusive DTEND, so the inclusive last day is one day
// earlier. Wrap the math through Date so month/year rollovers are handled.
function previousDay(d: IcsDate): IcsDate {
  const t = new Date(Date.UTC(d.year, d.month, d.day - 1));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth(), day: t.getUTCDate() };
}

export function eventToImportable(event: IcsEvent, startYear: number): ImportableItem {
  const startMonthIdx = (event.start.year - startYear) * 12 + event.start.month;
  const label = event.summary.trim() || "Untitled";

  const end = event.end;
  if (!end) {
    return { kind: "date", monthIdx: startMonthIdx, dayOfMonth: event.start.day, label };
  }

  const diff = daysBetween(event.start, end);
  const singleDay = event.allDay ? diff <= 1 : diff <= 0;
  if (singleDay) {
    return { kind: "date", monthIdx: startMonthIdx, dayOfMonth: event.start.day, label };
  }

  const inclusive = event.allDay ? previousDay(end) : end;
  const endMonthIdx = (inclusive.year - startYear) * 12 + inclusive.month;
  return {
    kind: "layer",
    startMonthIdx,
    startDayOfMonth: event.start.day,
    endMonthIdx,
    endDayOfMonth: inclusive.day,
    label,
  };
}
