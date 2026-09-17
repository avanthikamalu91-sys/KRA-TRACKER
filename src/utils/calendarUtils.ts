// src/utils/calendarUtils.ts – Parsing and applying Delivery / CP Calendar deadlines
import * as XLSX from 'xlsx';
import { parseDateValue, type RawRow, type NormalizedRow, dropSortCompare, naturalSortCompare } from './dataUtils';

export interface CalendarEntry {
  id: string;
  drop: string;
  season?: string;
  brand?: string;
  department?: string;
  styleCode?: string;
  blueSealDeadline: string; // From 'Blue Seal 2 Vendor Submission'
  exFactoryDate: string;    // From 'Ex Fact 1 Date' / 'Ex Factory Date'
  silverSealDeadline: string; // exFactoryDate minus 33 days
  raw?: RawRow;
}

/**
 * Subtracts N days from a YYYY-MM-DD date string
 */
export function subtractDays(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);

  const date = new Date(y, m, d);
  if (isNaN(date.getTime())) return '';

  date.setDate(date.getDate() - days);

  const outY = date.getFullYear();
  const outM = String(date.getMonth() + 1).padStart(2, '0');
  const outD = String(date.getDate()).padStart(2, '0');
  return `${outY}-${outM}-${outD}`;
}

/**
 * Normalizes drop strings for reliable matching:
 * - 'D01' -> 'Drop 1'
 * - 'Drop 01' -> 'Drop 1'
 * - 'drop 2' -> 'Drop 2'
 * - 'Carry Over' -> 'Carry Over'
 */
export function normalizeDropKey(val: string): string {
  if (!val) return '';
  const s = val.trim();
  const m = s.match(/^(?:drop|d)\s*0*(\d+)/i);
  if (m) {
    return `Drop ${parseInt(m[1], 10)}`;
  }
  if (/^(?:carry\s*over|carryover|co\b)/i.test(s)) {
    const cNum = (s.match(/\d+/) || [])[0];
    return cNum ? `Carry Over ${parseInt(cNum, 10)}` : 'Carry Over';
  }
  return s;
}

/**
 * Parses raw ArrayBuffer / File of Delivery / CP Calendar with automatic header row detection.
 */
export async function parseCalendarFile(file: File): Promise<CalendarEntry[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
    dense: true,
  });

  if (!workbook.SheetNames.length) return [];
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true }) as unknown[][];

  return parseCalendarAoa(aoa);
}

/**
 * Parses array-of-arrays representation of the calendar
 */
export function parseCalendarAoa(aoa: unknown[][]): CalendarEntry[] {
  if (!aoa || aoa.length === 0) return [];

  // Find header row (search first 15 rows for columns containing 'drop', 'blue', 'ex-fact', etc.)
  let headerRowIdx = 0;
  for (let r = 0; r < Math.min(aoa.length, 15); r++) {
    const row = aoa[r];
    if (!Array.isArray(row)) continue;
    const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ');
    if (
      rowStr.includes('drop') &&
      (rowStr.includes('blue') || rowStr.includes('bs2') || rowStr.includes('ex-fact') || rowStr.includes('ex fact') || rowStr.includes('submission') || rowStr.includes('vendor'))
    ) {
      headerRowIdx = r;
      break;
    }
  }

  const headerRow = (aoa[headerRowIdx] || []) as unknown[];
  const headers = headerRow.map(c => String(c || '').trim());

  const dropColIdx = headers.findIndex(h => {
    const l = h.toLowerCase();
    return l === 'drop' || l === 'generic drop' || l === 'delivery drop' || l.startsWith('drop');
  });

  const bs2ColIdx = headers.findIndex(h => {
    const l = h.toLowerCase();
    return (
      (l.includes('blue') || l.includes('bs2') || l.includes('bs 2')) &&
      (l.includes('vendor') || l.includes('submission') || l.includes('target') || l.includes('deadline') || l.includes('due') || l.includes('review'))
    );
  });

  const exFactColIdx = headers.findIndex(h => {
    const l = h.toLowerCase();
    return l.includes('ex-fact 1') || l.includes('ex fact 1') || l.includes('ex factory 1') || l.includes('ex-factory 1') || l.includes('ex-fact') || l.includes('ex fact') || l.includes('ex factory') || l.includes('ex-factory') || l.includes('handover');
  });

  const seasonColIdx = headers.findIndex(h => h.toLowerCase().includes('season'));
  const brandColIdx = headers.findIndex(h => h.toLowerCase().includes('brand') || h.toLowerCase().includes('division'));
  const deptColIdx = headers.findIndex(h => h.toLowerCase().includes('dept') || h.toLowerCase().includes('department'));
  const styleColIdx = headers.findIndex(h => h.toLowerCase().includes('style code') || h.toLowerCase() === 'style');

  const entries: CalendarEntry[] = [];

  for (let r = headerRowIdx + 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!Array.isArray(row) || !row.length) continue;

    const rawDrop = dropColIdx >= 0 && row[dropColIdx] !== undefined ? String(row[dropColIdx] || '').trim() : '';
    if (!rawDrop) continue;

    const rawBS2 = bs2ColIdx >= 0 ? row[bs2ColIdx] : undefined;
    const rawExFact = exFactColIdx >= 0 ? row[exFactColIdx] : undefined;

    const blueSealDeadline = parseDateValue(rawBS2);
    const exFactoryDate = parseDateValue(rawExFact);
    const silverSealDeadline = exFactoryDate ? subtractDays(exFactoryDate, 33) : '';

    const season = seasonColIdx >= 0 && row[seasonColIdx] !== undefined ? String(row[seasonColIdx]).trim() : '';
    const brand = brandColIdx >= 0 && row[brandColIdx] !== undefined ? String(row[brandColIdx]).trim() : '';
    const department = deptColIdx >= 0 && row[deptColIdx] !== undefined ? String(row[deptColIdx]).trim() : '';
    const styleCode = styleColIdx >= 0 && row[styleColIdx] !== undefined ? String(row[styleColIdx]).trim() : '';

    entries.push({
      id: `cal-${r}-${rawDrop}`,
      drop: rawDrop,
      season,
      brand,
      department,
      styleCode,
      blueSealDeadline,
      exFactoryDate,
      silverSealDeadline,
    });
  }

  return entries;
}

/**
 * Parses raw JSON objects if already in object format
 */
export function parseCalendarRows(rawRows: RawRow[]): CalendarEntry[] {
  if (!rawRows || rawRows.length === 0) return [];
  // Convert object list to array of arrays to run through header detector
  const keys = Object.keys(rawRows[0]);
  const aoa: unknown[][] = [keys];
  for (const r of rawRows) {
    aoa.push(keys.map(k => r[k]));
  }
  return parseCalendarAoa(aoa);
}

/**
 * Finds the best matching calendar entry for a sample data row.
 * Hierarchy:
 * 1. Exact Match: (Drop + Season + Brand + StyleCode)
 * 2. Exact Match: (Drop + Season + Brand)
 * 3. Exact Match: (Drop + Season)
 * 4. Exact Match: (Drop)
 * 5. Normalized Drop match (e.g. 'Drop 1' == 'D01' == 'Drop 01')
 */
export function findCalendarMatch(
  row: NormalizedRow,
  calendar: CalendarEntry[]
): CalendarEntry | null {
  if (!calendar.length) return null;

  const rowDrop = (row.drop || '').trim();
  const rowNormDrop = normalizeDropKey(rowDrop);
  const rowSeason = (row.season || '').trim().toLowerCase();
  const rowBrand = (row.brand || '').trim().toLowerCase();
  const rowStyle = (row.styleCode || '').trim().toLowerCase();

  // Match with style if style exists in calendar
  if (rowStyle) {
    const styleMatch = calendar.find(c =>
      c.styleCode && c.styleCode.trim().toLowerCase() === rowStyle &&
      (c.blueSealDeadline || c.silverSealDeadline)
    );
    if (styleMatch) return styleMatch;
  }

  // Exact drop + season + brand match
  if (rowDrop && rowSeason && rowBrand) {
    const fullMatch = calendar.find(c =>
      c.drop.trim().toLowerCase() === rowDrop.toLowerCase() &&
      c.season && c.season.trim().toLowerCase() === rowSeason &&
      c.brand && c.brand.trim().toLowerCase() === rowBrand &&
      (c.blueSealDeadline || c.silverSealDeadline)
    );
    if (fullMatch) return fullMatch;
  }

  // Exact drop + season match
  if (rowDrop && rowSeason) {
    const seasonMatch = calendar.find(c =>
      c.drop.trim().toLowerCase() === rowDrop.toLowerCase() &&
      c.season && c.season.trim().toLowerCase() === rowSeason &&
      (c.blueSealDeadline || c.silverSealDeadline)
    );
    if (seasonMatch) return seasonMatch;
  }

  // Exact drop match
  if (rowDrop) {
    const dropMatch = calendar.find(c =>
      c.drop.trim().toLowerCase() === rowDrop.toLowerCase() &&
      (c.blueSealDeadline || c.silverSealDeadline)
    );
    if (dropMatch) return dropMatch;
  }

  // Normalized drop match (e.g. 'Drop 1' matches 'D01', 'Drop 01', 'd1')
  if (rowNormDrop) {
    const normMatch = calendar.find(c =>
      normalizeDropKey(c.drop).toLowerCase() === rowNormDrop.toLowerCase() &&
      (c.blueSealDeadline || c.silverSealDeadline)
    );
    if (normMatch) return normMatch;
  }

  return null;
}

/**
 * Applies calendar deadlines to normalized sample rows and recalculates On-Time compliance.
 */
export function applyCalendarToRows(
  rows: NormalizedRow[],
  calendar: CalendarEntry[]
): NormalizedRow[] {
  if (!calendar || calendar.length === 0) return rows;

  return rows.map(r => {
    const match = findCalendarMatch(r, calendar);
    if (!match) return r;

    let calDeadline = '';
    if (r.sealType === 'Blue Seal') {
      calDeadline = match.blueSealDeadline;
    } else if (r.sealType === 'Silver Seal') {
      calDeadline = match.silverSealDeadline;
    }

    const effectiveDeadline = calDeadline || r.deadlineDate;

    // Recalculate onTime based on effective deadline
    let receivedOnTime = r.receivedOnTime;
    let reviewedOnTime = r.reviewedOnTime;
    const isReviewed = r.statusNormalized === 'Approved' || r.statusNormalized === 'Rejected';

    if (effectiveDeadline) {
      if (isReviewed && r.date) {
        reviewedOnTime = r.date <= effectiveDeadline;
      }
      if (r.receivedAtTechDate) {
        receivedOnTime = r.receivedAtTechDate <= effectiveDeadline;
      }
      if (reviewedOnTime === true) {
        receivedOnTime = true;
      }
    }

    let onTime: boolean | null = reviewedOnTime !== null ? reviewedOnTime : receivedOnTime;

    return {
      ...r,
      deadlineDate: effectiveDeadline,
      exFactoryDate: match.exFactoryDate,
      calendarMatched: Boolean(calDeadline),
      receivedOnTime: receivedOnTime ?? null,
      reviewedOnTime: reviewedOnTime ?? null,
      onTime,
    };
  });
}
