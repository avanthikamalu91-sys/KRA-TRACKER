// src/utils/excelExport.ts – Styled Excel workbook exporter matching Pivot Table matrix format
import * as XLSX from 'xlsx-js-style';
import type { BreakdownRow, NormalizedRow, ActiveFilters } from './dataUtils';
import { applyFilters, naturalSortCompare } from './dataUtils';

interface ExportBreakdownOptions {
  rows: BreakdownRow[];
  dimension: 'department' | 'brand' | 'season' | 'drop';
  allRows?: NormalizedRow[];
  filters?: ActiveFilters;
  fileName?: string;
}

// ── Color & Style Tokens for Excel ──────────────────────────────
const PALETTE = {
  headerBg: 'BAE6FD',      // Soft light sky blue (like screenshot)
  headerText: '0F172A',    // Dark slate
  grandTotalBg: 'D9E1F2',  // Ice blue for summary
  deptSepLine: '38BDF8',   // Blue divider line
  gridBorder: 'CBD5E1',    // Light gray grid
  approvedGreen: '15803D', // Forest green text
  rejectedRed: 'B91C1C',   // Deep red text
  navyHeader: '0F4C81',    // Brand navy for summary table
  white: 'FFFFFF',
};

const FONT_FAMILY = 'Calibri';

/**
 * Builds a Styled Pivot Table Worksheet matching the user's Excel screenshot:
 * Header: Light blue background with bold labels
 * Row hierarchy:
 *   Department (Bold, blue top border, bold counts)
 *     Blue Seal / Silver Seal (Bold, indented)
 *       Approved (Regular, indented)
 *       Rejected (Regular, indented)
 *   Grand Total (Bottom ice blue fill, bold, double bottom border)
 */
function buildStyledPivotMatrixSheet(
  rows: NormalizedRow[],
  dimension: 'department' | 'brand' | 'season' = 'department'
): XLSX.WorkSheet {
  // 1. Get unique drops in natural sorted order
  const drops = [...new Set(rows.map(r => r.drop?.trim()).filter(Boolean))].sort(naturalSortCompare) as string[];

  // 2. Get unique dimension categories (e.g. Departments)
  const dimValues = [...new Set(rows.map(r => r[dimension]?.trim()).filter(Boolean))].sort(naturalSortCompare) as string[];

  const aoa: (string | number | null)[][] = [];
  const rowTypes: (
    | 'empty'
    | 'top_label'
    | 'header'
    | 'department'
    | 'sub_metric'
    | 'sealer'
    | 'status_approved'
    | 'status_ontime'
    | 'status_rejected'
    | 'status_other'
    | 'grand_total'
    | 'grand_sub'
  )[] = [];

  // Row 0 & 1: Empty padding rows
  aoa.push([]);
  rowTypes.push('empty');
  aoa.push([]);
  rowTypes.push('empty');

  // Row 2: "Count of Status" | "Column Labels"
  const topLabelRow: (string | number | null)[] = ['Count of Status', 'Column Labels'];
  aoa.push(topLabelRow);
  rowTypes.push('top_label');

  // Row 3: "Row Labels" | Drop 1 | Drop 2 | ... | Grand Total
  const headerRow: (string | number | null)[] = ['Row Labels', ...drops, 'Grand Total'];
  aoa.push(headerRow);
  rowTypes.push('header');

  const getUniqueStyles = (items: NormalizedRow[]) => {
    return new Set(items.map(r => r.styleCode?.trim() || r.styleName?.trim() || '').filter(Boolean)).size;
  };

  // Build hierarchical data rows nested completely under each Department / Dimension
  for (const dimVal of dimValues) {
    const dimRows = rows.filter(r => r[dimension]?.trim() === dimVal);
    if (dimRows.length === 0) continue;

    // Dimension totals across drops
    const dimDropCounts: Record<string, number> = {};
    for (const d of drops) {
      dimDropCounts[d] = dimRows.filter(r => r.drop?.trim() === d).length;
    }
    const dimGrandTotal = dimRows.length;

    // ── 1. Department / Category Header Row (Bold) ──
    aoa.push([
      dimVal,
      ...drops.map(d => (dimDropCounts[d] > 0 ? dimDropCounts[d] : null)),
      dimGrandTotal,
    ]);
    rowTypes.push('department');

    // ── 2. Department Unique Styles ──
    const dimDropUniqueStyles: Record<string, number> = {};
    for (const d of drops) {
      const dropItems = dimRows.filter(r => r.drop?.trim() === d);
      dimDropUniqueStyles[d] = getUniqueStyles(dropItems);
    }
    const dimTotalUniqueStyles = getUniqueStyles(dimRows);
    aoa.push([
      `  Unique Styles`,
      ...drops.map(d => (dimDropUniqueStyles[d] > 0 ? dimDropUniqueStyles[d] : null)),
      dimTotalUniqueStyles,
    ]);
    rowTypes.push('sub_metric');

    // ── 3. Sealer / Seal Type Hierarchy ──
    const allSealers = [...new Set(dimRows.map(r => r.sealer?.trim() || (r.sealType || 'Unspecified')))].sort(naturalSortCompare) as string[];
    const preferredOrder = ['Blue Seal', 'Silver Seal'];
    const orderedSealers = [
      ...preferredOrder.filter(s => allSealers.includes(s)),
      ...allSealers.filter(s => !preferredOrder.includes(s)),
    ];

    for (const sealer of orderedSealers) {
      const sealerRows = dimRows.filter(r => (r.sealer?.trim() || (r.sealType || 'Unspecified')) === sealer);
      if (sealerRows.length === 0) continue;

      const sealerDropCounts: Record<string, number> = {};
      for (const d of drops) {
        sealerDropCounts[d] = sealerRows.filter(r => r.drop?.trim() === d).length;
      }
      const sealerGrandTotal = sealerRows.length;

      // Sealer Row (Bold, indented with 2 spaces)
      aoa.push([
        `  ${sealer}`,
        ...drops.map(d => (sealerDropCounts[d] > 0 ? sealerDropCounts[d] : null)),
        sealerGrandTotal,
      ]);
      rowTypes.push('sealer');

      // Sealer Unique Styles
      const sealerDropUniqueStyles: Record<string, number> = {};
      for (const d of drops) {
        const dropItems = sealerRows.filter(r => r.drop?.trim() === d);
        sealerDropUniqueStyles[d] = getUniqueStyles(dropItems);
      }
      const sealerTotalUniqueStyles = getUniqueStyles(sealerRows);
      aoa.push([
        `    Unique Styles`,
        ...drops.map(d => (sealerDropUniqueStyles[d] > 0 ? sealerDropUniqueStyles[d] : null)),
        sealerTotalUniqueStyles,
      ]);
      rowTypes.push('sub_metric');

      // ── Approved ──
      const approvedRows = sealerRows.filter(r => r.statusNormalized === 'Approved');
      if (approvedRows.length > 0) {
        const approvedDropCounts: Record<string, number> = {};
        for (const d of drops) {
          approvedDropCounts[d] = approvedRows.filter(r => r.drop?.trim() === d).length;
        }
        aoa.push([
          `    Approved`,
          ...drops.map(d => (approvedDropCounts[d] > 0 ? approvedDropCounts[d] : null)),
          approvedRows.length,
        ]);
        rowTypes.push('status_approved');

        // Approved On Time
        const approvedOnTimeRows = approvedRows.filter(r => r.onTime === true);
        if (approvedOnTimeRows.length > 0) {
          const onTimeDropCounts: Record<string, number> = {};
          for (const d of drops) {
            onTimeDropCounts[d] = approvedOnTimeRows.filter(r => r.drop?.trim() === d).length;
          }
          aoa.push([
            `      Approved On Time`,
            ...drops.map(d => (onTimeDropCounts[d] > 0 ? onTimeDropCounts[d] : null)),
            approvedOnTimeRows.length,
          ]);
          rowTypes.push('status_ontime');
        }
      }

      // ── Rejected ──
      const rejectedRows = sealerRows.filter(r => r.statusNormalized === 'Rejected');
      if (rejectedRows.length > 0) {
        const rejectedDropCounts: Record<string, number> = {};
        for (const d of drops) {
          rejectedDropCounts[d] = rejectedRows.filter(r => r.drop?.trim() === d).length;
        }
        aoa.push([
          `    Rejected`,
          ...drops.map(d => (rejectedDropCounts[d] > 0 ? rejectedDropCounts[d] : null)),
          rejectedRows.length,
        ]);
        rowTypes.push('status_rejected');
      }

      // ── Other / Pending statuses ──
      const otherStatuses = [...new Set(sealerRows.map(r => r.statusNormalized))].filter(s => s !== 'Approved' && s !== 'Rejected');
      for (const status of otherStatuses) {
        const otherRows = sealerRows.filter(r => r.statusNormalized === status);
        if (otherRows.length === 0) continue;

        const statusDropCounts: Record<string, number> = {};
        for (const d of drops) {
          statusDropCounts[d] = otherRows.filter(r => r.drop?.trim() === d).length;
        }
        aoa.push([
          `    ${status}`,
          ...drops.map(d => (statusDropCounts[d] > 0 ? statusDropCounts[d] : null)),
          otherRows.length,
        ]);
        rowTypes.push('status_other');
      }
    }
  }

  // ── 4. Grand Total Row ──
  const dropGrandTotals: Record<string, number> = {};
  for (const d of drops) {
    dropGrandTotals[d] = rows.filter(r => r.drop?.trim() === d).length;
  }
  const totalOverallGrandTotal = rows.length;

  aoa.push([
    'Grand Total (Samples)',
    ...drops.map(d => (dropGrandTotals[d] > 0 ? dropGrandTotals[d] : null)),
    totalOverallGrandTotal,
  ]);
  rowTypes.push('grand_total');

  // Grand Total Unique Styles
  const dropGrandUniqueStyles: Record<string, number> = {};
  for (const d of drops) {
    dropGrandUniqueStyles[d] = getUniqueStyles(rows.filter(r => r.drop?.trim() === d));
  }
  const totalOverallUniqueStyles = getUniqueStyles(rows);
  aoa.push([
    '  Grand Total Unique Styles',
    ...drops.map(d => (dropGrandUniqueStyles[d] > 0 ? dropGrandUniqueStyles[d] : null)),
    totalOverallUniqueStyles,
  ]);
  rowTypes.push('grand_sub');

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const totalCols = drops.length + 2; // Col 0 is Row Labels, last Col is Grand Total

  // ── Apply Styles to each Cell in the Matrix ──
  for (let r = 0; r < aoa.length; r++) {
    const type = rowTypes[r];
    if (type === 'empty') continue;

    for (let c = 0; c < totalCols; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) {
        ws[cellRef] = { t: 's', v: '' };
      }
      const cell = ws[cellRef];

      if (type === 'top_label') {
        cell.s = {
          font: { name: FONT_FAMILY, sz: 10, bold: true, color: { rgb: PALETTE.headerText } },
          fill: { fgColor: { rgb: PALETTE.headerBg } },
          alignment: { vertical: 'center', horizontal: c === 0 ? 'left' : 'center' },
          border: {
            top: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
            bottom: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
            left: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
            right: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
          },
        };
      } else if (type === 'header') {
        cell.s = {
          font: { name: FONT_FAMILY, sz: 10.5, bold: true, color: { rgb: PALETTE.headerText } },
          fill: { fgColor: { rgb: PALETTE.headerBg } },
          alignment: { vertical: 'center', horizontal: c === 0 ? 'left' : 'center', wrapText: false },
          border: {
            top: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
            bottom: { style: 'medium', color: { rgb: '64748B' } },
            left: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
            right: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
          },
        };
      } else if (type === 'department') {
        cell.s = {
          font: { name: FONT_FAMILY, sz: 11, bold: true, color: { rgb: '000000' } },
          fill: { fgColor: { rgb: 'F8FAFC' } },
          alignment: { vertical: 'center', horizontal: c === 0 ? 'left' : 'right' },
          border: {
            top: { style: 'medium', color: { rgb: PALETTE.deptSepLine } },
            bottom: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
            left: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
            right: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
          },
        };
      } else if (type === 'sub_metric') {
        cell.s = {
          font: { name: FONT_FAMILY, sz: 9.5, italic: true, bold: false, color: { rgb: '475569' } },
          fill: { fgColor: { rgb: PALETTE.white } },
          alignment: { vertical: 'center', horizontal: c === 0 ? 'left' : 'right' },
          border: {
            top: { style: 'thin', color: { rgb: 'F1F5F9' } },
            bottom: { style: 'thin', color: { rgb: 'F1F5F9' } },
            left: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
            right: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
          },
        };
      } else if (type === 'sealer') {
        cell.s = {
          font: { name: FONT_FAMILY, sz: 10, bold: true, color: { rgb: '0F172A' } },
          fill: { fgColor: { rgb: PALETTE.white } },
          alignment: { vertical: 'center', horizontal: c === 0 ? 'left' : 'right' },
          border: {
            top: { style: 'thin', color: { rgb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
            left: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
            right: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
          },
        };
      } else if (type === 'status_approved') {
        cell.s = {
          font: { name: FONT_FAMILY, sz: 9.5, bold: false, color: { rgb: '1E293B' } },
          fill: { fgColor: { rgb: PALETTE.white } },
          alignment: { vertical: 'center', horizontal: c === 0 ? 'left' : 'right' },
          border: {
            top: { style: 'thin', color: { rgb: 'F1F5F9' } },
            bottom: { style: 'thin', color: { rgb: 'F1F5F9' } },
            left: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
            right: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
          },
        };
      } else if (type === 'status_ontime') {
        cell.s = {
          font: { name: FONT_FAMILY, sz: 9, bold: false, color: { rgb: PALETTE.approvedGreen } },
          fill: { fgColor: { rgb: 'F0FDF4' } },
          alignment: { vertical: 'center', horizontal: c === 0 ? 'left' : 'right' },
          border: {
            top: { style: 'thin', color: { rgb: 'F1F5F9' } },
            bottom: { style: 'thin', color: { rgb: 'F1F5F9' } },
            left: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
            right: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
          },
        };
      } else if (type === 'status_rejected') {
        cell.s = {
          font: { name: FONT_FAMILY, sz: 9.5, bold: false, color: { rgb: '1E293B' } },
          fill: { fgColor: { rgb: PALETTE.white } },
          alignment: { vertical: 'center', horizontal: c === 0 ? 'left' : 'right' },
          border: {
            top: { style: 'thin', color: { rgb: 'F1F5F9' } },
            bottom: { style: 'thin', color: { rgb: 'F1F5F9' } },
            left: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
            right: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
          },
        };
      } else if (type === 'status_other') {
        cell.s = {
          font: { name: FONT_FAMILY, sz: 9.5, bold: false, color: { rgb: '334155' } },
          fill: { fgColor: { rgb: PALETTE.white } },
          alignment: { vertical: 'center', horizontal: c === 0 ? 'left' : 'right' },
          border: {
            top: { style: 'thin', color: { rgb: 'F1F5F9' } },
            bottom: { style: 'thin', color: { rgb: 'F1F5F9' } },
            left: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
            right: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
          },
        };
      } else if (type === 'grand_total') {
        cell.s = {
          font: { name: FONT_FAMILY, sz: 11, bold: true, color: { rgb: '000000' } },
          fill: { fgColor: { rgb: PALETTE.grandTotalBg } },
          alignment: { vertical: 'center', horizontal: c === 0 ? 'left' : 'right' },
          border: {
            top: { style: 'thin', color: { rgb: '64748B' } },
            bottom: { style: 'thin', color: { rgb: '64748B' } },
            left: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
            right: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
          },
        };
      } else if (type === 'grand_sub') {
        cell.s = {
          font: { name: FONT_FAMILY, sz: 10, bold: true, color: { rgb: '0F4C81' } },
          fill: { fgColor: { rgb: PALETTE.grandTotalBg } },
          alignment: { vertical: 'center', horizontal: c === 0 ? 'left' : 'right' },
          border: {
            top: { style: 'thin', color: { rgb: 'CBD5E1' } },
            bottom: { style: 'double', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
            right: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
          },
        };
      }
    }
  }

  // Set optimal column widths
  const maxDimLen = Math.max(...dimValues.map(v => v.length), 20);
  ws['!cols'] = [
    { wch: Math.max(maxDimLen + 10, 28) },
    ...drops.map(d => ({ wch: Math.max(d.length + 3, 11) })),
    { wch: 14 },
  ];

  return ws;
}

/**
 * Builds a Styled Tabular Breakdown Worksheet (Unique styles & RFT% metrics)
 */
function buildStyledTabularSheet(rows: BreakdownRow[], dimHeader: string): XLSX.WorkSheet {
  const headers = [
    dimHeader,
    'Total Samples',
    'Unique Styles',
    'Overall On-Time (Count)',
    'Overall On-Time (%)',
    'Total Approved',
    'Total Rejected',
    'Total Pending',
    'Overall RFT (Count)',
    'Overall Not RFT',
    'Overall RFT (%)',
    'Blue Total Samples',
    'Blue Unique Styles',
    'Blue On-Time (Count)',
    'Blue On-Time (%)',
    'Blue Approved',
    'Blue Rejected',
    'Blue Pending',
    'Blue RFT (%)',
    'Silver Total Samples',
    'Silver Unique Styles',
    'Silver On-Time (Count)',
    'Silver On-Time (%)',
    'Silver Approved',
    'Silver Rejected',
    'Silver Pending',
    'Silver RFT (%)',
  ];

  const aoa: (string | number | null)[][] = [headers];

  for (const r of rows) {
    aoa.push([
      r.dimension,
      r.overallSamples,
      r.overallUniqueStyles,
      r.overallOnTimeCount,
      Number(r.overallOnTimePct.toFixed(1)),
      r.overallApproved,
      r.overallRejected,
      r.overallPending,
      r.overallRFT,
      r.overallNotRFT,
      Number(r.overallRFTPct.toFixed(1)),
      r.blueSamples,
      r.blueTotal,
      r.blueOnTimeCount,
      Number(r.blueOnTimePct.toFixed(1)),
      r.blueApproved,
      r.blueRejected,
      r.bluePending,
      Number(r.blueRFTPct.toFixed(1)),
      r.silverSamples,
      r.silverTotal,
      r.silverOnTimeCount,
      Number(r.silverOnTimePct.toFixed(1)),
      r.silverApproved,
      r.silverRejected,
      r.silverPending,
      Number(r.silverRFTPct.toFixed(1)),
    ]);
  }

  // Add Summary Total Row
  if (rows.length > 0) {
    const totalSamples = rows.reduce((acc, r) => acc + r.overallSamples, 0);
    const totalStyles = rows.reduce((acc, r) => acc + r.overallUniqueStyles, 0);
    const totalOnTime = rows.reduce((acc, r) => acc + r.overallOnTimeCount, 0);
    const totalOnTimeEval = rows.reduce((acc, r) => acc + r.overallOnTimeTotal, 0);
    const overallOnTimePct = totalOnTimeEval > 0 ? Number(((totalOnTime / totalOnTimeEval) * 100).toFixed(1)) : 0;

    const totalApproved = rows.reduce((acc, r) => acc + r.overallApproved, 0);
    const totalRejected = rows.reduce((acc, r) => acc + r.overallRejected, 0);
    const totalPending = rows.reduce((acc, r) => acc + r.overallPending, 0);
    const totalRFT = rows.reduce((acc, r) => acc + r.overallRFT, 0);
    const totalNotRFT = rows.reduce((acc, r) => acc + r.overallNotRFT, 0);
    const overallRFTPct = totalStyles > 0 ? Number(((totalRFT / totalStyles) * 100).toFixed(1)) : 0;

    const blueSamples = rows.reduce((acc, r) => acc + r.blueSamples, 0);
    const blueTotal = rows.reduce((acc, r) => acc + r.blueTotal, 0);
    const blueOnTime = rows.reduce((acc, r) => acc + r.blueOnTimeCount, 0);
    const blueOnTimeEval = rows.reduce((acc, r) => acc + r.blueOnTimeTotal, 0);
    const blueOnTimePct = blueOnTimeEval > 0 ? Number(((blueOnTime / blueOnTimeEval) * 100).toFixed(1)) : 0;
    const blueApproved = rows.reduce((acc, r) => acc + r.blueApproved, 0);
    const blueRejected = rows.reduce((acc, r) => acc + r.blueRejected, 0);
    const bluePending = rows.reduce((acc, r) => acc + r.bluePending, 0);
    const blueRFT = rows.reduce((acc, r) => acc + r.blueRFT, 0);
    const blueRFTPct = blueTotal > 0 ? Number(((blueRFT / blueTotal) * 100).toFixed(1)) : 0;

    const silverSamples = rows.reduce((acc, r) => acc + r.silverSamples, 0);
    const silverTotal = rows.reduce((acc, r) => acc + r.silverTotal, 0);
    const silverOnTime = rows.reduce((acc, r) => acc + r.silverOnTimeCount, 0);
    const silverOnTimeEval = rows.reduce((acc, r) => acc + r.silverOnTimeTotal, 0);
    const silverOnTimePct = silverOnTimeEval > 0 ? Number(((silverOnTime / silverOnTimeEval) * 100).toFixed(1)) : 0;
    const silverApproved = rows.reduce((acc, r) => acc + r.silverApproved, 0);
    const silverRejected = rows.reduce((acc, r) => acc + r.silverRejected, 0);
    const silverPending = rows.reduce((acc, r) => acc + r.silverPending, 0);
    const silverRFT = rows.reduce((acc, r) => acc + r.silverRFT, 0);
    const silverRFTPct = silverTotal > 0 ? Number(((silverRFT / silverTotal) * 100).toFixed(1)) : 0;

    aoa.push([
      'TOTAL / SUMMARY',
      totalSamples,
      totalStyles,
      totalOnTime,
      overallOnTimePct,
      totalApproved,
      totalRejected,
      totalPending,
      totalRFT,
      totalNotRFT,
      overallRFTPct,
      blueSamples,
      blueTotal,
      blueOnTime,
      blueOnTimePct,
      blueApproved,
      blueRejected,
      bluePending,
      blueRFTPct,
      silverSamples,
      silverTotal,
      silverOnTime,
      silverOnTimePct,
      silverApproved,
      silverRejected,
      silverPending,
      silverRFTPct,
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Apply Styling to Tabular Sheet
  for (let r = 0; r < aoa.length; r++) {
    const isHeader = r === 0;
    const isTotal = r === aoa.length - 1;
    const isEven = r % 2 === 0;

    for (let c = 0; c < headers.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) continue;
      const cell = ws[cellRef];

      if (isHeader) {
        cell.s = {
          font: { name: FONT_FAMILY, sz: 10.5, bold: true, color: { rgb: PALETTE.white } },
          fill: { fgColor: { rgb: PALETTE.navyHeader } },
          alignment: { vertical: 'center', horizontal: c === 0 ? 'left' : 'center', wrapText: true },
          border: {
            top: { style: 'thin', color: { rgb: PALETTE.navyHeader } },
            bottom: { style: 'medium', color: { rgb: '0369A1' } },
            left: { style: 'thin', color: { rgb: '1E3A8A' } },
            right: { style: 'thin', color: { rgb: '1E3A8A' } },
          },
        };
      } else if (isTotal) {
        cell.s = {
          font: { name: FONT_FAMILY, sz: 11, bold: true, color: { rgb: '000000' } },
          fill: { fgColor: { rgb: PALETTE.grandTotalBg } },
          alignment: { vertical: 'center', horizontal: c === 0 ? 'left' : 'right' },
          border: {
            top: { style: 'thin', color: { rgb: '64748B' } },
            bottom: { style: 'double', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
            right: { style: 'thin', color: { rgb: PALETTE.gridBorder } },
          },
        };
      } else {
        cell.s = {
          font: { name: FONT_FAMILY, sz: 10, bold: c === 0, color: { rgb: '1E293B' } },
          fill: { fgColor: { rgb: isEven ? 'F8FAFC' : PALETTE.white } },
          alignment: { vertical: 'center', horizontal: c === 0 ? 'left' : 'right' },
          border: {
            top: { style: 'thin', color: { rgb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
            left: { style: 'thin', color: { rgb: 'E2E8F0' } },
            right: { style: 'thin', color: { rgb: 'E2E8F0' } },
          },
        };
      }
    }
  }

  // Column widths
  ws['!cols'] = headers.map((h, i) => ({ wch: i === 0 ? 26 : Math.max(h.length + 2, 13) }));

  return ws;
}

/**
 * Main Export Function: Exports beautifully styled Excel workbook matching the exact screenshot layout
 */
export function exportBreakdownToExcel({
  rows,
  dimension,
  allRows,
  filters,
  fileName,
}: ExportBreakdownOptions) {
  const wb = XLSX.utils.book_new();

  const activeFilteredRows = allRows && filters ? applyFilters(allRows, filters) : [];
  const datasetToUse = activeFilteredRows.length > 0 ? activeFilteredRows : (allRows || []);

  // ── Sheet 1: Master Pivot Matrix (Department x Drop Breakdown as in Screenshot) ──
  if (datasetToUse.length > 0) {
    const wsDeptMatrix = buildStyledPivotMatrixSheet(datasetToUse, 'department');
    XLSX.utils.book_append_sheet(wb, wsDeptMatrix, 'Department Drop Matrix');

    // ── Sheet 2: Brand / Division Drop Matrix ──
    const wsBrandMatrix = buildStyledPivotMatrixSheet(datasetToUse, 'brand');
    XLSX.utils.book_append_sheet(wb, wsBrandMatrix, 'Brand Drop Matrix');
  }

  // ── Sheet 3: Full RFT Performance Summary ──
  const dimNames: Record<string, string> = {
    department: 'Department',
    brand: 'Brand & Division',
    season: 'Season',
    drop: 'Drop & Phase',
  };
  const activeDimTitle = dimNames[dimension] || dimension;
  const wsTabular = buildStyledTabularSheet(rows, activeDimTitle);
  XLSX.utils.book_append_sheet(wb, wsTabular, `${activeDimTitle.slice(0, 18)} RFT Summary`);

  // ── Sheet 4: Executive KPI Overview ──
  const totalSamples = rows.reduce((acc, r) => acc + r.overallSamples, 0);
  const totalStyles = rows.reduce((acc, r) => acc + r.overallUniqueStyles, 0);
  const totalApproved = rows.reduce((acc, r) => acc + r.overallApproved, 0);
  const totalRejected = rows.reduce((acc, r) => acc + r.overallRejected, 0);
  const totalRFT = rows.reduce((acc, r) => acc + r.overallRFT, 0);
  const overallRFTPct = totalStyles > 0 ? Number(((totalRFT / totalStyles) * 100).toFixed(1)) : 0;

  const totalOnTime = rows.reduce((acc, r) => acc + r.overallOnTimeCount, 0);
  const totalOnTimeEval = rows.reduce((acc, r) => acc + r.overallOnTimeTotal, 0);
  const overallOnTimePct = totalOnTimeEval > 0 ? Number(((totalOnTime / totalOnTimeEval) * 100).toFixed(1)) : 0;

  const sortedByRFT = [...rows].filter(r => r.overallUniqueStyles > 0).sort((a, b) => b.overallRFTPct - a.overallRFTPct);
  const topGroup = sortedByRFT[0];
  const lowestGroup = sortedByRFT[sortedByRFT.length - 1];

  const summarySheetData = [
    ['Metric', 'Value'],
    ['Report Title', 'Z - TRACK - Performance & Drop Breakdown'],
    ['Export Date & Time', new Date().toLocaleString()],
    ['Active Dimension', activeDimTitle],
    ['Total Groups in Dimension', rows.length],
    ['Total Sample Submissions', totalSamples],
    ['Total Unique Styles', totalStyles],
    ['Total Reviewed On-Time', `${totalOnTime} (${overallOnTimePct.toFixed(1)}%)`],
    ['Total Approved Styles', totalApproved],
    ['Total Rejected Styles', totalRejected],
    ['Overall RFT (%)', `${overallRFTPct}%`],
    ['Top Performing Category', topGroup ? `${topGroup.dimension} (${topGroup.overallRFTPct.toFixed(1)}% RFT)` : 'N/A'],
    ['Lowest Performing Category', lowestGroup ? `${lowestGroup.dimension} (${lowestGroup.overallRFTPct.toFixed(1)}% RFT)` : 'N/A'],
  ];

  if (filters) {
    if (filters.department) summarySheetData.push(['Applied Filter - Department', filters.department]);
    if (filters.brand) summarySheetData.push(['Applied Filter - Brand', filters.brand]);
    if (filters.season) summarySheetData.push(['Applied Filter - Season', filters.season]);
    if (filters.drop) summarySheetData.push(['Applied Filter - Drop', filters.drop]);
    if (filters.startDate) summarySheetData.push(['Applied Filter - From Date', filters.startDate]);
    if (filters.endDate) summarySheetData.push(['Applied Filter - To Date', filters.endDate]);
  }

  const wsExec = XLSX.utils.aoa_to_sheet(summarySheetData);
  for (let r = 0; r < summarySheetData.length; r++) {
    for (let c = 0; c < 2; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!wsExec[cellRef]) continue;
      const cell = wsExec[cellRef];
      if (r === 0) {
        cell.s = {
          font: { name: FONT_FAMILY, sz: 10.5, bold: true, color: { rgb: PALETTE.white } },
          fill: { fgColor: { rgb: PALETTE.navyHeader } },
          alignment: { vertical: 'center', horizontal: 'left' },
          border: {
            top: { style: 'thin', color: { rgb: PALETTE.navyHeader } },
            bottom: { style: 'medium', color: { rgb: '0369A1' } },
            left: { style: 'thin', color: { rgb: '1E3A8A' } },
            right: { style: 'thin', color: { rgb: '1E3A8A' } },
          },
        };
      } else {
        cell.s = {
          font: { name: FONT_FAMILY, sz: 10, bold: c === 0, color: { rgb: '1E293B' } },
          fill: { fgColor: { rgb: r % 2 === 0 ? 'F8FAFC' : PALETTE.white } },
          alignment: { vertical: 'center', horizontal: 'left' },
          border: {
            top: { style: 'thin', color: { rgb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
            left: { style: 'thin', color: { rgb: 'E2E8F0' } },
            right: { style: 'thin', color: { rgb: 'E2E8F0' } },
          },
        };
      }
    }
  }
  wsExec['!cols'] = [{ wch: 32 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsExec, 'Executive Summary');

  // Trigger Excel file download in browser
  const dateStr = new Date().toISOString().slice(0, 10);
  const finalFileName = fileName || `Z_TRACK_Breakdown_Matrix_${dimension}_${dateStr}.xlsx`;
  XLSX.writeFile(wb, finalFileName);
}
