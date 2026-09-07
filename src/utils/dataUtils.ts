// ============================================================
// dataUtils.ts – Core data processing for Tech Analysis app
// ============================================================

export type SealType = 'Blue Seal' | 'Silver Seal';

export interface RawRow {
  [key: string]: string | number | boolean | null | undefined | Date;
}

export interface NormalizedRow {
  businessUnit: string;
  department: string;
  brand: string;
  season: string;
  drop: string;
  styleCode: string;
  styleName: string;
  sealer: string;
  sealType: SealType | null;
  status: string;
  statusNormalized: 'Approved' | 'Rejected' | 'Pending' | 'Cancelled' | 'Other';
  supplier: string;
  productType: string;
  sampleRound: string | number;
  date: string; // YYYY-MM-DD
  receivedAtTechDate: string; // YYYY-MM-DD
  deadlineDate: string; // YYYY-MM-DD
  onTime: boolean | null;
  comments: string;
}

export interface StyleMetrics {
  styleCode: string;
  styleName: string;
  sealType: SealType;
  occurrences: number;
  isRFT: boolean;
  statuses: string[];
  primaryStatus: string;
  department: string;
  brand: string;
  season: string;
  drop: string;
  date: string;
  supplier: string;
  comments: string;
}

export interface SealMetrics {
  totalRows: number;
  totalUniqueStyles: number;
  approved: number;
  rejected: number;
  pending: number;
  other: number;
  rftCount: number;
  notRftCount: number;
  rftPercent: number;
  styleDetails: StyleMetrics[];
}

export interface DashboardMetrics {
  blueSeal: SealMetrics;
  silverSeal: SealMetrics;
  totalRows: number;
}

export interface FilterOptions {
  departments: string[];
  brands: string[];
  seasons: string[];
  drops: string[];
  minDate?: string;
  maxDate?: string;
  hasDates: boolean;
}

export interface ActiveFilters {
  department: string;
  brand: string;
  season: string;
  drop: string;
  startDate: string;
  endDate: string;
}

// ── Column name aliases ─────────────────────────────────────
const COL_ALIASES: Record<string, string[]> = {
  businessUnit:  ['Business Unit', 'businessunit', 'bu'],
  department:    ['Department', 'Dept', 'dept'],
  brand:         ['Brand/Division', 'Brand', 'Division', 'brand_division'],
  season:        ['Generic Season', 'Season', 'generic_season'],
  drop:          ['Drop', 'Generic Drop', 'Delivery Drop', 'Collection Drop', 'Phase', 'Drop / Phase', 'Drop/Phase', 'Drop Description', 'Drop Name', 'Drop No', 'Drop Number', 'drop', 'generic_drop'],
  styleCode:     ['Style Code', 'StyleCode', 'style_code', 'Style'],
  styleName:     ['Style Name', 'StyleName', 'style_name', 'Style Description', 'Style Desc', 'Description', 'Item Name', 'Product Name', 'Style Title'],
  sealer:        ['Sealer', 'Seal Type', 'seal_type'],
  status:        ['Status', 'status'],
  supplier:      ['Vendors', 'Supplier', 'Vendor', 'Vendor Name', 'Supplier Name', 'Manufacturer'],
  productType:   ['Product Type', 'ProductType', 'product_type', 'MATKL Description 3'],
  sampleRound:   ['Sample Round', 'SampleRound', 'sample_round'],
  date:          ['Date', 'Created Date', 'Creation Date', 'Seal Date', 'Status Date', 'Approval Date', 'Date of Sealing', 'Fitting Date', 'Sample Date', 'Submission Date', 'Inspection Date', 'Modified Date', 'Updated Date', 'date', 'created_date', 'seal_date'],
  receivedAtTechDate: ['Received at Technologist', 'Received at Technologist Date', 'Date Received at Technologist', 'Technologist Received Date', 'Received at Tech', 'Received at Tech Date', 'Received by Technologist', 'Technologist Received', 'Recvd at Technologist', 'Recvd at Tech', 'Sample Received at Technologist', 'Sample Received Date', 'Received Date'],
  deadlineDate:  ['Deadline Date', 'Deadline', 'Dead Line', 'Dead line Date', 'Due Date', 'Target Date', 'Seal Deadline', 'Fitting Deadline', 'Target Date of Sealing', 'Sealing Target Date', 'Requested Date', 'Planned Date', 'Critical Path Date', 'CP Date', 'Tech Deadline', 'Target Receipt Date', 'Expected Date', 'Sample Due Date', 'deadline_date', 'due_date', 'deadline'],
  onTime:        ['On Time', 'OnTime', 'On-Time', 'Is On Time', 'On Time?', 'Ontime Status', 'On Time Status', 'On Time (Y/N)', 'On Time Delivery', 'On Time Sealing', 'OT', 'on_time', 'ontime'],
  comments:      ['Comments', 'Comment', 'Reason', 'Rejection Reason', 'Reason for Rejection', 'Remarks', 'Remark', 'Tech Comments', 'Technical Comments', 'Rejection Remarks', 'Defect Reason', 'Defect', 'Feedback', 'Notes', 'Reason Description', 'Fitting Comments', 'Sample Comments', 'comments', 'remarks', 'reason'],
};

function findColumn(row: RawRow, aliases: string[]): string {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const match = keys.find(
      k => k.trim().toLowerCase() === alias.toLowerCase()
    );
    if (match) return match;
  }
  return '';
}

let columnMap: Record<string, string> = {};

function resolveColumns(rows: RawRow[]): void {
  if (rows.length === 0) return;
  const sample = rows[0];
  columnMap = {};
  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    const found = findColumn(sample, aliases);
    if (found) columnMap[field] = found;
  }
}

function getString(row: RawRow, field: string): string {
  const col = columnMap[field];
  if (!col) return '';
  const v = row[col];
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

// ── Date parsing ────────────────────────────────────────────
export function parseDateValue(val: unknown): string {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'number') {
    // Excel date serial number (e.g. 45366)
    if (val > 25000 && val < 75000) {
      const utcDays = Math.floor(val - 25569);
      const date = new Date(utcDays * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
  }
  const str = String(val).trim();
  if (!str) return '';

  // Match YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Match DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Try Date.parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return '';
}

// ── Format date string to DD/MM/YYYY for UI display ─────────
export function formatDateDisplay(val: unknown): string {
  if (!val || val === '—') return '—';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '—';
    const d = String(val.getUTCDate()).padStart(2, '0');
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const y = val.getUTCFullYear();
    return `${d}/${m}/${y}`;
  }
  const str = String(val).trim();
  if (!str) return '—';

  // Matches YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${d}/${m}/${y}`;
  }

  // Matches DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${d}/${m}/${y}`;
  }

  // Fallback using Date parser
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const y = parsed.getFullYear();
    return `${d}/${m}/${y}`;
  }

  return str;
}

function extractFallbackDate(row: RawRow): string {
  for (const [key, val] of Object.entries(row)) {
    if (key.toLowerCase().includes('date') && val) {
      const d = parseDateValue(val);
      if (d) return d;
    }
  }
  return '';
}

function extractReceivedAtTechDate(row: RawRow): string {
  const col = columnMap['receivedAtTechDate'];
  if (col && row[col]) {
    const d = parseDateValue(row[col]);
    if (d) return d;
  }
  for (const [key, val] of Object.entries(row)) {
    const k = key.toLowerCase();
    if (k.includes('received') && (k.includes('tech') || k.includes('technologist')) && val) {
      const d = parseDateValue(val);
      if (d) return d;
    }
  }
  for (const [key, val] of Object.entries(row)) {
    const k = key.toLowerCase();
    if (k.includes('received') && val) {
      const d = parseDateValue(val);
      if (d) return d;
    }
  }
  return '';
}

function extractDeadlineDate(row: RawRow): string {
  const col = columnMap['deadlineDate'];
  if (col && row[col]) {
    const d = parseDateValue(row[col]);
    if (d) return d;
  }
  for (const [key, val] of Object.entries(row)) {
    const k = key.toLowerCase();
    if ((k.includes('deadline') || k.includes('due date') || k.includes('target date') || k.includes('planned date') || k.includes('cp date') || k.includes('critical path')) && val) {
      const d = parseDateValue(val);
      if (d) return d;
    }
  }
  return '';
}

function extractComments(row: RawRow): string {
  const col = columnMap['comments'];
  if (col && row[col] !== undefined && row[col] !== null) {
    const s = String(row[col]).trim();
    if (s) return s;
  }
  for (const [key, val] of Object.entries(row)) {
    const k = key.toLowerCase();
    if ((k.includes('comment') || k.includes('reason') || k.includes('remark') || k.includes('defect') || k.includes('note') || k.includes('feedback')) && val) {
      const s = String(val).trim();
      if (s && s !== '—' && s !== '-') return s;
    }
  }
  return '';
}

// ── Normalize status ────────────────────────────────────────
function normalizeStatus(raw: string): 'Approved' | 'Rejected' | 'Pending' | 'Cancelled' | 'Other' {
  const u = raw.toUpperCase().trim();
  if (u === 'APPROVED' || u.startsWith('APPROV')) return 'Approved';
  if (u === 'REJECTED' || u.startsWith('REJECT')) return 'Rejected';
  if (u === 'CANCELLED' || u === 'CANCELED' || u.includes('CANCEL')) return 'Cancelled';
  if (u === 'PENDING' || u.includes('PEND') || u.includes('REVIEW') || u.includes('SUBMIT') || u.includes('PROGRESS') || u.includes('WAIT') || u.includes('REC') || u === '') return 'Pending';
  return 'Pending';
}

// ── Detect seal type ────────────────────────────────────────
function detectSealType(sealer: string): SealType | null {
  const u = sealer.toUpperCase();
  if (u.includes('BLUE SEAL')) return 'Blue Seal';
  if (u.includes('SILVER SEAL')) return 'Silver Seal';
  return null;
}

function parseOnTimeValue(val: unknown): boolean | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'boolean') return val;
  const s = String(val).trim().toUpperCase();
  if (s === '') return null;
  if (s === 'TRUE' || s === 'YES' || s === 'Y' || s === '1' || s === 'ON TIME' || s === 'ON-TIME' || s === 'ONTIME') return true;
  if (s === 'FALSE' || s === 'NO' || s === 'N' || s === '0' || s === 'LATE') return false;
  return null;
}

// ── Parse and normalize all rows ───────────────────────────
export function normalizeRows(raw: RawRow[]): NormalizedRow[] {
  resolveColumns(raw);
  return raw
    .map(row => {
      const sealer = getString(row, 'sealer');
      const status = getString(row, 'status');
      const styleCode = getString(row, 'styleCode');
      const rawSupplier = getString(row, 'supplier');
      // Strip trailing codes like "(123)" or "- 456" and normalize whitespace
      const supplier = rawSupplier
        .replace(/\s*[\(\[（][^\)\]）]*[\)\]）]/g, '')  // remove (code) or [code]
        .replace(/\s*-\s*\d+$/g, '')                    // remove trailing "- 123"
        .replace(/\s+/g, ' ')
        .trim();

      const dateCol = columnMap['date'];
      const rawDate = dateCol ? row[dateCol] : undefined;
      const date = parseDateValue(rawDate) || extractFallbackDate(row);
      const receivedAtTechDate = extractReceivedAtTechDate(row);
      const deadlineDate = extractDeadlineDate(row);

      // Check explicit onTime column or compute from received & deadline dates
      const onTimeCol = columnMap['onTime'];
      let onTime: boolean | null = onTimeCol && row[onTimeCol] !== undefined ? parseOnTimeValue(row[onTimeCol]) : null;
      if (onTime === null) {
        if (receivedAtTechDate && deadlineDate) {
          onTime = receivedAtTechDate <= deadlineDate;
        } else if (date && deadlineDate && normalizeStatus(status) === 'Approved') {
          onTime = date <= deadlineDate;
        }
      }

      return {
        businessUnit:     getString(row, 'businessUnit'),
        department:       getString(row, 'department'),
        brand:            getString(row, 'brand'),
        season:           getString(row, 'season'),
        drop:             getString(row, 'drop'),
        styleCode,
        styleName:        getString(row, 'styleName'),
        sealer,
        sealType:         detectSealType(sealer),
        status,
        statusNormalized: normalizeStatus(status),
        supplier,
        productType:      getString(row, 'productType'),
        sampleRound:      getString(row, 'sampleRound'),
        date,
        receivedAtTechDate,
        deadlineDate,
        onTime,
        comments:         extractComments(row),
      } as NormalizedRow;
    })
    .filter(r => r.sealType !== null); // drop non-Blue/Silver rows early for perf
}

// ── Natural sort comparator (1, 2, 3... instead of 1, 10, 2...) ──
export function naturalSortCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

// ── Extract filter options ──────────────────────────────────
export function extractFilterOptions(rows: NormalizedRow[]): FilterOptions {
  const depts   = [...new Set(rows.map(r => r.department).filter(Boolean))].sort(naturalSortCompare);
  const brands  = [...new Set(rows.map(r => r.brand).filter(Boolean))].sort(naturalSortCompare);
  const seasons = [...new Set(rows.map(r => r.season).filter(Boolean))].sort(naturalSortCompare);
  const drops   = [...new Set(rows.map(r => r.drop).filter(Boolean))].sort(naturalSortCompare);
  const allDates = rows
    .flatMap(r => [r.date, r.receivedAtTechDate, r.deadlineDate])
    .filter(Boolean) as string[];
  const dates   = [...new Set(allDates)].sort();

  return {
    departments: depts,
    brands,
    seasons,
    drops,
    minDate: dates.length > 0 ? dates[0] : '',
    maxDate: dates.length > 0 ? dates[dates.length - 1] : '',
    hasDates: dates.length > 0,
  };
}

// ── Apply filters ───────────────────────────────────────────
export function applyFilters(
  rows: NormalizedRow[],
  filters: ActiveFilters
): NormalizedRow[] {
  return rows.filter(r => {
    if (filters.department && r.department !== filters.department) return false;
    if (filters.brand      && r.brand      !== filters.brand)      return false;
    if (filters.season     && r.season     !== filters.season)      return false;
    if (filters.drop       && r.drop       !== filters.drop)        return false;
    if (filters.startDate  && r.date && r.date < filters.startDate) return false;
    if (filters.endDate    && r.date && r.date > filters.endDate)   return false;
    return true;
  });
}

// ── Compute seal-level metrics ──────────────────────────────
function computeSealMetrics(
  rows: NormalizedRow[],
  sealType: SealType
): SealMetrics {
  const sealRows = rows.filter(r => r.sealType === sealType);

  // Group by style code (skip blank style codes)
  const styleMap = new Map<string, NormalizedRow[]>();
  for (const row of sealRows) {
    const sc = row.styleCode.trim();
    if (!sc) continue;
    if (!styleMap.has(sc)) styleMap.set(sc, []);
    styleMap.get(sc)!.push(row);
  }

  // Build style-level details
  const styleDetails: StyleMetrics[] = [];
  for (const [sc, scRows] of styleMap.entries()) {
    const occurrences = scRows.length;
    const statuses    = scRows.map(r => r.statusNormalized);
    const primaryStatus = statuses[0] ?? 'Other';
    const commentsList = scRows.map(r => r.comments).filter(Boolean);
    const uniqueComments = [...new Set(commentsList)].join(' | ');

    styleDetails.push({
      styleCode:    sc,
      styleName:    scRows[0].styleName || '',
      sealType,
      occurrences,
      isRFT:        occurrences === 1,
      statuses,
      primaryStatus,
      department:   scRows[0].department,
      brand:        scRows[0].brand,
      season:       scRows[0].season,
      drop:         scRows[0].drop || '',
      date:         scRows[0].date || '',
      supplier:     scRows[0].supplier || '',
      comments:     uniqueComments || scRows[0].comments || '',
    });
  }

  const totalUniqueStyles = styleDetails.length;
  const rftCount    = styleDetails.filter(s => s.isRFT).length;
  const notRftCount = totalUniqueStyles - rftCount;
  const rftPercent  = totalUniqueStyles > 0
    ? Math.round((rftCount / totalUniqueStyles) * 1000) / 10
    : 0;

  // Row-level status counts
  const approved  = sealRows.filter(r => r.statusNormalized === 'Approved').length;
  const rejected  = sealRows.filter(r => r.statusNormalized === 'Rejected').length;
  const pending   = sealRows.filter(r => r.statusNormalized === 'Pending').length;
  const other     = sealRows.filter(r => r.statusNormalized === 'Other' || r.statusNormalized === 'Cancelled').length;

  return {
    totalRows: sealRows.length,
    totalUniqueStyles,
    approved,
    rejected,
    pending,
    other,
    rftCount,
    notRftCount,
    rftPercent,
    styleDetails,
  };
}

// ── Main dashboard compute ──────────────────────────────────
export function computeDashboard(
  rows: NormalizedRow[],
  filters: ActiveFilters
): DashboardMetrics {
  const filtered = applyFilters(rows, filters);
  return {
    blueSeal:   computeSealMetrics(filtered, 'Blue Seal'),
    silverSeal: computeSealMetrics(filtered, 'Silver Seal'),
    totalRows:  filtered.length,
  };
}

export interface BreakdownRow {
  dimension: string;
  // Overall Combined
  overallSamples: number;
  overallUniqueStyles: number;
  overallApproved: number;
  overallRejected: number;
  overallPending: number;
  overallRFT: number;
  overallNotRFT: number;
  overallRFTPct: number;
  // Blue Seal
  blueSamples: number;
  blueTotal: number; // Unique Styles
  blueRFT: number;
  blueNotRFT: number;
  blueRFTPct: number;
  blueApproved: number;
  blueRejected: number;
  bluePending: number;
  // Silver Seal
  silverSamples: number;
  silverTotal: number; // Unique Styles
  silverRFT: number;
  silverNotRFT: number;
  silverRFTPct: number;
  silverApproved: number;
  silverRejected: number;
  silverPending: number;
}

export function computeBreakdown(
  rows: NormalizedRow[],
  dimension: 'department' | 'brand' | 'season' | 'drop',
  filters: ActiveFilters
): BreakdownRow[] {
  const filtered = applyFilters(rows, filters);
  const values   = [...new Set(filtered.map(r => r[dimension]).filter(Boolean))].sort(naturalSortCompare) as string[];

  return values.map(val => {
    const dimRows = filtered.filter(r => r[dimension] === val);
    const blue    = computeSealMetrics(dimRows, 'Blue Seal');
    const silver  = computeSealMetrics(dimRows, 'Silver Seal');

    const totalStyles = blue.totalUniqueStyles + silver.totalUniqueStyles;
    const totalRFT    = blue.rftCount + silver.rftCount;
    const overallRFTPct = totalStyles > 0 ? Math.round((totalRFT / totalStyles) * 1000) / 10 : 0;

    return {
      dimension: val,
      // Overall Combined
      overallSamples:      dimRows.length,
      overallUniqueStyles: totalStyles,
      overallApproved:     blue.approved + silver.approved,
      overallRejected:     blue.rejected + silver.rejected,
      overallPending:      blue.pending + silver.pending,
      overallRFT:          totalRFT,
      overallNotRFT:       (blue.notRftCount + silver.notRftCount),
      overallRFTPct,
      // Blue Seal
      blueSamples:   blue.totalRows,
      blueTotal:     blue.totalUniqueStyles,
      blueRFT:       blue.rftCount,
      blueNotRFT:    blue.notRftCount,
      blueRFTPct:    blue.rftPercent,
      blueApproved:  blue.approved,
      blueRejected:  blue.rejected,
      bluePending:   blue.pending,
      // Silver Seal
      silverSamples:  silver.totalRows,
      silverTotal:    silver.totalUniqueStyles,
      silverRFT:      silver.rftCount,
      silverNotRFT:   silver.notRftCount,
      silverRFTPct:   silver.rftPercent,
      silverApproved: silver.approved,
      silverRejected: silver.rejected,
      silverPending:  silver.pending,
    };
  });
}
