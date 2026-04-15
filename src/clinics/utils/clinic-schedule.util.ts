import { DayOfWeek } from '../../clinic/working-hours/entities/working-hour.entity';

export type ClinicScheduleSlot = {
  time: string;
  available: boolean;
};

export type ClinicScheduleRow = {
  amount: string | null;
  day: string;
  slots: ClinicScheduleSlot[];
};

const DAY_INDEX: Record<DayOfWeek, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Parse "HH:MM:SS" or "HH:MM" to minutes from midnight */
function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}

/**
 * Format DB time to 12-hour range label, e.g. "6:00 pm - 10:00 pm"
 */
/** Format "HH:mm" or "HH:mm:ss" clock as "6:00 pm" */
export function formatSingleTime12h(hms: string): string {
  const parts = hms.split(':');
  const h0 = Number(parts[0]);
  const m0 = Number(parts[1] ?? 0);
  if (!Number.isFinite(h0)) return hms;
  const total = h0 * 60 + (Number.isFinite(m0) ? m0 : 0);
  let h = Math.floor(total / 60);
  const m = total % 60;
  const period = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  const mm = m === 0 ? '00' : String(m).padStart(2, '0');
  return `${h}:${mm} ${period}`;
}

export function formatTimeRange12h(start: string, end: string): string {
  const fmt = (t: string): string => {
    const total = timeToMinutes(t);
    let h = Math.floor(total / 60);
    const m = total % 60;
    const period = h >= 12 ? 'pm' : 'am';
    h = h % 12;
    if (h === 0) h = 12;
    const mm = m === 0 ? '' : `:${String(m).padStart(2, '0')}`;
    return `${h}${mm === '' ? ':00' : mm} ${period}`;
  };
  return `${fmt(start)} - ${fmt(end)}`;
}

function segmentToDayLabel(startIdx: number, endIdx: number): string {
  const a = DAY_SHORT[startIdx];
  if (startIdx === endIdx) return a;
  return `${a} - ${DAY_SHORT[endIdx]}`;
}

function compressDayIndices(indices: number[]): string[] {
  const sorted = [...new Set(indices)].sort((a, b) => a - b);
  if (sorted.length === 0) return [];

  const labels: string[] = [];
  let segStart = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    labels.push(segmentToDayLabel(segStart, prev));
    segStart = cur;
    prev = cur;
  }
  labels.push(segmentToDayLabel(segStart, prev));
  return labels;
}

type WhInput = { day: DayOfWeek; start_time: string; end_time: string };

/**
 * Builds UI schedule rows from clinic branch working hours (deduped, grouped by time range and day bands).
 */
export function buildClinicScheduleRows(
  workingHours: WhInput[],
  amount: string | null,
): ClinicScheduleRow[] {
  const unique = new Map<string, WhInput>();
  for (const wh of workingHours) {
    const key = `${wh.day}|${wh.start_time}|${wh.end_time}`;
    if (!unique.has(key)) unique.set(key, wh);
  }

  const byTimeKey = new Map<string, Set<number>>();
  for (const wh of unique.values()) {
    const tk = `${wh.start_time}|${wh.end_time}`;
    if (!byTimeKey.has(tk)) byTimeKey.set(tk, new Set());
    byTimeKey.get(tk)!.add(DAY_INDEX[wh.day]);
  }

  const rows: ClinicScheduleRow[] = [];
  for (const [tk, daySet] of byTimeKey) {
    const [start_time, end_time] = tk.split('|');
    const dayLabels = compressDayIndices([...daySet]);
    for (const day of dayLabels) {
      rows.push({
        amount,
        day,
        slots: [
          {
            time: formatTimeRange12h(start_time, end_time),
            available: true,
          },
        ],
      });
    }
  }

  rows.sort((a, b) => {
    const ai = DAY_SHORT.indexOf(a.day.split(' - ')[0] as string);
    const bi = DAY_SHORT.indexOf(b.day.split(' - ')[0] as string);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return rows;
}
