// src/components/TechnologistPerformance.tsx
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx-js-style';
import type { NormalizedRow, ActiveFilters } from '../utils/dataUtils';
import { formatDateDisplay } from '../utils/dataUtils';
import { computeTechnologistMetrics, type TechnologistMetric } from '../utils/technologistUtils';

const PAGE_SIZE = 20;

type SortKey = keyof Pick<
  TechnologistMetric,
  | 'name'
  | 'totalSamples'
  | 'uniqueStyles'
  | 'approved'
  | 'rejected'
  | 'pending'
  | 'approvalRate'
  | 'rejectionRate'
  | 'rftPercent'
  | 'onTimePercent'
>;
type SortDir = 'asc' | 'desc';

function RateBadge({ value, type = 'approval' }: { value: number; type?: 'approval' | 'rft' | 'ontime' }) {
  let bg = '#fee2e2';
  let color = '#b91c1c';

  if (value >= 85) {
    bg = '#dcfce7';
    color = '#15803d';
  } else if (value >= 70) {
    bg = '#fef9c3';
    color = '#a16207';
  } else if (value >= 50) {
    bg = '#ffedd5';
    color = '#c2410c';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: bg,
        color,
        borderRadius: 'var(--radius-pill)',
        padding: '3px 10px',
        fontWeight: 800,
        fontSize: '0.78rem',
        letterSpacing: '0.02em',
      }}
    >
      {value.toFixed(1)}%
    </span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span style={{ opacity: 0.25, fontSize: '0.7rem', marginLeft: 4 }}>↕</span>;
  return (
    <span style={{ fontSize: '0.8rem', color: 'var(--brand-600)', marginLeft: 4, fontWeight: 900 }}>
      {dir === 'desc' ? '↓' : '↑'}
    </span>
  );
}

// ── Auto-calculate fitting column widths ───────────────────────
function calculateAutoFitCols(aoa: (string | number | null | undefined)[][]): { wch: number }[] {
  if (!aoa.length) return [];
  const colCount = Math.max(...aoa.map(row => row.length));
  const colWidths: { wch: number }[] = [];

  for (let c = 0; c < colCount; c++) {
    let maxLen = 8;
    for (let r = 0; r < aoa.length; r++) {
      const cellVal = aoa[r]?.[c];
      if (cellVal !== null && cellVal !== undefined) {
        const str = String(cellVal).trim();
        if (str.length > maxLen) {
          maxLen = str.length;
        }
      }
    }
    // Add comfortable padding of 4 characters, cap at 50 to avoid runaway columns
    colWidths.push({ wch: Math.min(50, Math.max(10, maxLen + 4)) });
  }

  return colWidths;
}

export default function TechnologistPerformance({
  rows,
  filters,
}: {
  rows: NormalizedRow[];
  filters: ActiveFilters;
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('totalSamples');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [selectedPerson, setSelectedPerson] = useState<TechnologistMetric | null>(null);

  const metrics = useMemo(() => computeTechnologistMetrics(rows, filters), [rows, filters]);

  // Overall KPI Summary
  const summary = useMemo(() => {
    const totalTechs = metrics.length;
    const totalSamples = metrics.reduce((acc, m) => acc + m.totalSamples, 0);
    const totalApproved = metrics.reduce((acc, m) => acc + m.approved, 0);
    const totalRejected = metrics.reduce((acc, m) => acc + m.rejected, 0);
    const totalPending = metrics.reduce((acc, m) => acc + m.pending, 0);
    const totalRFT = metrics.reduce((acc, m) => acc + m.rftCount, 0);
    const totalUnique = metrics.reduce((acc, m) => acc + m.uniqueStyles, 0);
    const totalOnTime = metrics.reduce((acc, m) => acc + m.onTimeCount, 0);
    const totalOnTimeEval = metrics.reduce((acc, m) => acc + m.onTimeTotal, 0);

    const overallApprovalRate = totalSamples > 0 ? (totalApproved / totalSamples) * 100 : 0;
    const overallRFT = totalUnique > 0 ? (totalRFT / totalUnique) * 100 : 0;
    const overallOnTime = totalOnTimeEval > 0 ? (totalOnTime / totalOnTimeEval) * 100 : 0;

    const topPerformer = [...metrics].sort((a, b) => b.approved - a.approved)[0];

    return {
      totalTechs,
      totalSamples,
      totalApproved,
      totalRejected,
      totalPending,
      overallApprovalRate,
      overallRFT,
      overallOnTime,
      topPerformer,
    };
  }, [metrics]);

  const filtered = useMemo(() => {
    if (!search.trim()) return metrics;
    const q = search.toLowerCase();
    return metrics.filter(
      m =>
        m.name.toLowerCase().includes(q) ||
        m.departments.some(d => d.toLowerCase().includes(q)) ||
        m.brands.some(b => b.toLowerCase().includes(q))
    );
  }, [metrics, search]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string') {
        return sortDir === 'asc'
          ? (av as string).localeCompare(bv as string)
          : (bv as string).localeCompare(av as string);
      }
      return sortDir === 'asc'
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: '12px 14px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    userSelect: 'none',
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: sortKey === key ? 'var(--brand-600)' : 'var(--text-muted)',
    borderBottom: sortKey === key ? '2px solid var(--brand-600)' : '1px solid var(--border)',
    background: sortKey === key ? 'rgba(15,76,129,0.06)' : 'var(--bg-card2)',
    transition: 'all 0.15s',
  });

  // ── Export Styled Excel (.xlsx) ──────────────────────────────
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // ── Common Styling Tokens ──
    const FONT_NAME = 'Calibri';
    const gridBorder = {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } },
    };

    const headerStyle = {
      fill: { fgColor: { rgb: '0F4C81' } },
      font: { name: FONT_NAME, sz: 10.5, bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
      border: gridBorder,
    };

    const leftDataStyle = (isEven: boolean) => ({
      fill: { fgColor: { rgb: isEven ? 'FFFFFF' : 'F8FAFC' } },
      font: { name: FONT_NAME, sz: 10, color: { rgb: '0F172A' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: gridBorder,
    });

    const centerDataStyle = (isEven: boolean, bold = false) => ({
      fill: { fgColor: { rgb: isEven ? 'FFFFFF' : 'F8FAFC' } },
      font: { name: FONT_NAME, sz: 10, bold, color: { rgb: '0F172A' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: gridBorder,
    });

    const approvedStyle = (isEven: boolean) => ({
      fill: { fgColor: { rgb: isEven ? 'F0FDF4' : 'DCFCE7' } },
      font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: '15803D' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: gridBorder,
    });

    const rejectedStyle = (isEven: boolean) => ({
      fill: { fgColor: { rgb: isEven ? 'FEF2F2' : 'FEE2E2' } },
      font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: 'B91C1C' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: gridBorder,
    });

    const totalRowStyle = (align: 'left' | 'center' = 'center') => ({
      fill: { fgColor: { rgb: 'D9E1F2' } },
      font: { name: FONT_NAME, sz: 10.5, bold: true, color: { rgb: '0F172A' } },
      alignment: { horizontal: align, vertical: 'center' },
      border: {
        top: { style: 'medium', color: { rgb: '0F4C81' } },
        bottom: { style: 'double', color: { rgb: '0F4C81' } },
        left: { style: 'thin', color: { rgb: 'CBD5E1' } },
        right: { style: 'thin', color: { rgb: 'CBD5E1' } },
      },
    });

    // ── Sheet 1: Individual Performance Summary ──
    const summaryHeaders = [
      '#',
      'Person / Employee Name',
      'Total Status Updates',
      'Unique Styles',
      'Approved',
      'Approval %',
      'Rejected',
      'Rejection %',
      'Pending',
      'Cancelled / Other',
      'RFT %',
      'On-Time %',
      'Blue Seal',
      'Silver Seal',
      'Departments Handled',
      'Brands Handled',
    ];

    const summaryRows: (string | number)[][] = [
      summaryHeaders,
      ...sorted.map((m, idx) => [
        idx + 1,
        m.name,
        m.totalSamples,
        m.uniqueStyles,
        m.approved,
        `${m.approvalRate.toFixed(1)}%`,
        m.rejected,
        `${m.rejectionRate.toFixed(1)}%`,
        m.pending,
        m.cancelled + m.other,
        `${m.rftPercent.toFixed(1)}%`,
        `${m.onTimePercent.toFixed(1)}%`,
        m.blueSealCount,
        m.silverSealCount,
        m.departments.join(', ') || '—',
        m.brands.join(', ') || '—',
      ]),
      // Grand Total Row
      [
        'TOTAL',
        `All (${summary.totalTechs} Technologists)`,
        summary.totalSamples,
        metrics.reduce((acc, m) => acc + m.uniqueStyles, 0),
        summary.totalApproved,
        `${summary.overallApprovalRate.toFixed(1)}%`,
        summary.totalRejected,
        `${summary.totalSamples > 0 ? ((summary.totalRejected / summary.totalSamples) * 100).toFixed(1) : 0}%`,
        summary.totalPending,
        metrics.reduce((acc, m) => acc + m.cancelled + m.other, 0),
        `${summary.overallRFT.toFixed(1)}%`,
        `${summary.overallOnTime.toFixed(1)}%`,
        metrics.reduce((acc, m) => acc + m.blueSealCount, 0),
        metrics.reduce((acc, m) => acc + m.silverSealCount, 0),
        'All',
        'All',
      ],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);

    // Apply uniform styling to every row & cell of Sheet 1
    const totalRowsCount = summaryRows.length;
    const lastRowIdx = totalRowsCount - 1;

    for (let r = 0; r < totalRowsCount; r++) {
      const isEven = r % 2 === 0;
      for (let c = 0; c < summaryHeaders.length; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (!wsSummary[cellRef]) wsSummary[cellRef] = { t: 's', v: '' };

        if (r === 0) {
          // Header Row
          wsSummary[cellRef].s = headerStyle;
        } else if (r === lastRowIdx) {
          // Grand Total Row
          wsSummary[cellRef].s = totalRowStyle(c === 1 ? 'left' : 'center');
        } else {
          // Data Rows
          if (c === 1 || c === 14 || c === 15) {
            // Text columns (Name, Departments, Brands)
            wsSummary[cellRef].s = leftDataStyle(isEven);
          } else if (c === 4 || c === 5 || c === 10) {
            // Approved & RFT metrics
            wsSummary[cellRef].s = approvedStyle(isEven);
          } else if (c === 6 || c === 7) {
            // Rejected metrics
            wsSummary[cellRef].s = rejectedStyle(isEven);
          } else if (c === 2) {
            // Total Status Updates count (bold)
            wsSummary[cellRef].s = centerDataStyle(isEven, true);
          } else {
            // Other numbers & counts
            wsSummary[cellRef].s = centerDataStyle(isEven);
          }
        }
      }
    }

    // Set row heights
    wsSummary['!rows'] = [
      { hpt: 26 }, // Header
      ...sorted.map(() => ({ hpt: 20 })),
      { hpt: 24 }, // Total
    ];

    // Set auto-fit column widths
    wsSummary['!cols'] = calculateAutoFitCols(summaryRows);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Individual Performance');

    // ── Sheet 2: Detailed Sample Logs ──
    const logHeaders = [
      '#',
      'Person / Updated By',
      'Style Code',
      'Style Name',
      'Department',
      'Brand',
      'Season',
      'Drop',
      'Seal Type',
      'Status',
      'Status Date',
      'Received at Tech Date',
      'Deadline Date',
      'On Time Review',
      'Vendor',
      'Comments / Remarks',
    ];

    const logData: (string | number)[][] = [logHeaders];
    let counter = 1;
    for (const m of sorted) {
      for (const r of m.samples) {
        logData.push([
          counter++,
          m.name,
          r.styleCode || '—',
          r.styleName || '—',
          r.department || '—',
          r.brand || '—',
          r.season || '—',
          r.drop || '—',
          r.sealType || '—',
          r.statusNormalized || r.status || '—',
          formatDateDisplay(r.date),
          formatDateDisplay(r.receivedAtTechDate),
          formatDateDisplay(r.deadlineDate),
          r.onTime === true ? 'Yes' : r.onTime === false ? 'No (Late)' : '—',
          r.supplier || '—',
          r.comments || '—',
        ]);
      }
    }

    const wsLogs = XLSX.utils.aoa_to_sheet(logData);

    for (let r = 0; r < logData.length; r++) {
      const isEven = r % 2 === 0;
      for (let c = 0; c < logHeaders.length; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (!wsLogs[cellRef]) wsLogs[cellRef] = { t: 's', v: '' };

        if (r === 0) {
          wsLogs[cellRef].s = headerStyle;
        } else {
          // Text columns vs centered data
          if ([1, 2, 3, 4, 5, 14, 15].includes(c)) {
            wsLogs[cellRef].s = leftDataStyle(isEven);
          } else {
            wsLogs[cellRef].s = centerDataStyle(isEven);
          }
        }
      }
    }

    wsLogs['!rows'] = [{ hpt: 26 }, ...logData.slice(1).map(() => ({ hpt: 19 }))];
    wsLogs['!cols'] = calculateAutoFitCols(logData);

    XLSX.utils.book_append_sheet(wb, wsLogs, 'Detailed Sample Logs');

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Individual_Performance_Report_${dateStr}.xlsx`);
  };

  // ── Export CSV ──
  const handleExportCSV = () => {
    const headers = [
      'Person / Technologist',
      'Total Samples',
      'Unique Styles',
      'Approved',
      'Approval %',
      'Rejected',
      'Rejection %',
      'Pending',
      'Cancelled/Other',
      'RFT %',
      'On-Time %',
      'Blue Seal Count',
      'Silver Seal Count',
    ];

    const csvRows = [headers.join(',')];
    for (const m of sorted) {
      csvRows.push(
        [
          `"${m.name.replace(/"/g, '""')}"`,
          m.totalSamples,
          m.uniqueStyles,
          m.approved,
          m.approvalRate.toFixed(1),
          m.rejected,
          m.rejectionRate.toFixed(1),
          m.pending,
          m.cancelled + m.other,
          m.rftPercent.toFixed(1),
          m.onTimePercent.toFixed(1),
          m.blueSealCount,
          m.silverSealCount,
        ].join(',')
      );
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Individual_Performance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Export Individual Person Excel (.xlsx) ──
  const handleExportPersonExcel = (person: TechnologistMetric) => {
    const wb = XLSX.utils.book_new();

    const FONT_NAME = 'Calibri';
    const gridBorder = {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } },
    };

    const headerStyle = {
      fill: { fgColor: { rgb: '0F4C81' } },
      font: { name: FONT_NAME, sz: 10.5, bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
      border: gridBorder,
    };

    const leftDataStyle = (isEven: boolean) => ({
      fill: { fgColor: { rgb: isEven ? 'FFFFFF' : 'F8FAFC' } },
      font: { name: FONT_NAME, sz: 10, color: { rgb: '0F172A' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: gridBorder,
    });

    const centerDataStyle = (isEven: boolean) => ({
      fill: { fgColor: { rgb: isEven ? 'FFFFFF' : 'F8FAFC' } },
      font: { name: FONT_NAME, sz: 10, color: { rgb: '0F172A' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: gridBorder,
    });

    const headers = [
      '#',
      'Style Code',
      'Style Name',
      'Seal Type',
      'Status',
      'Status Date',
      'Received at Tech Date',
      'Deadline Date',
      'On Time',
      'Department',
      'Brand',
      'Season',
      'Drop',
      'Vendor',
      'Comments',
    ];

    const data: (string | number)[][] = [
      headers,
      ...person.samples.map((r, idx) => [
        idx + 1,
        r.styleCode || '—',
        r.styleName || '—',
        r.sealType || '—',
        r.statusNormalized || r.status || '—',
        formatDateDisplay(r.date),
        formatDateDisplay(r.receivedAtTechDate),
        formatDateDisplay(r.deadlineDate),
        r.onTime === true ? 'Yes (On-Time)' : r.onTime === false ? 'No (Late)' : '—',
        r.department || '—',
        r.brand || '—',
        r.season || '—',
        r.drop || '—',
        r.supplier || '—',
        r.comments || '—',
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    for (let r = 0; r < data.length; r++) {
      const isEven = r % 2 === 0;
      for (let c = 0; c < headers.length; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };

        if (r === 0) {
          ws[cellRef].s = headerStyle;
        } else {
          if ([1, 2, 9, 10, 13, 14].includes(c)) {
            ws[cellRef].s = leftDataStyle(isEven);
          } else {
            ws[cellRef].s = centerDataStyle(isEven);
          }
        }
      }
    }

    ws['!rows'] = [{ hpt: 26 }, ...data.slice(1).map(() => ({ hpt: 19 }))];
    ws['!cols'] = calculateAutoFitCols(data);

    XLSX.utils.book_append_sheet(wb, ws, `${person.name.slice(0, 25)} Samples`);
    const sanitized = person.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(wb, `Individual_Performance_${sanitized}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── KPI Banner ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f4c81 0%, #0a3052 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          boxShadow: '0 4px 20px rgba(15, 76, 129, 0.25)',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Individual Performance &amp; Status Updates
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem', marginTop: 4 }}>
              Tracking sample count, state modifications (Approved, Rejected, Pending), and on-time compliance updated by each person
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={handleExportExcel}
              className="btn btn-sm"
              style={{
                background: '#22c55e',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-pill)',
                padding: '8px 18px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.35)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download Excel (.xlsx)
            </button>

            <button
              onClick={handleExportCSV}
              className="btn btn-sm"
              style={{
                background: 'rgba(255,255,255,0.18)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 'var(--radius-pill)',
                padding: '8px 16px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              CSV
            </button>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {/* Active Technologists */}
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px 16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ fontWeight: 900, fontSize: '1.3rem' }}>{summary.totalTechs.toLocaleString()}</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>People / Technologists</div>
          </div>

          {/* Total Samples */}
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px 16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ fontWeight: 900, fontSize: '1.3rem' }}>{summary.totalSamples.toLocaleString()}</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Status Updates</div>
          </div>

          {/* Overall Approval Rate */}
          <div style={{ background: 'rgba(34,197,94,0.22)', borderRadius: 10, padding: '12px 16px', textAlign: 'center', border: '1px solid rgba(74,222,128,0.4)' }}>
            <div style={{ color: '#86efac', fontWeight: 900, fontSize: '1.3rem' }}>{summary.overallApprovalRate.toFixed(1)}%</div>
            <div style={{ color: '#dcfce7', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>Approval Rate</div>
          </div>

          {/* Overall RFT */}
          <div style={{ background: 'rgba(59,130,246,0.22)', borderRadius: 10, padding: '12px 16px', textAlign: 'center', border: '1px solid rgba(96,165,250,0.4)' }}>
            <div style={{ color: '#93c5fd', fontWeight: 900, fontSize: '1.3rem' }}>{summary.overallRFT.toFixed(1)}%</div>
            <div style={{ color: '#dbeafe', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>First Time Right</div>
          </div>

          {/* On-Time Review */}
          <div style={{ background: 'rgba(245,158,11,0.22)', borderRadius: 10, padding: '12px 16px', textAlign: 'center', border: '1px solid rgba(251,191,36,0.4)' }}>
            <div style={{ color: '#fde047', fontWeight: 900, fontSize: '1.3rem' }}>{summary.overallOnTime.toFixed(1)}%</div>
            <div style={{ color: '#fef3c7', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>On-Time Review</div>
          </div>
        </div>
      </div>

      {/* ── Main Data Table Card ── */}
      <div className="table-card">
        <div className="table-toolbar" style={{ gap: 12, flexWrap: 'wrap' }}>
          <input
            id="tech-search-input"
            className="search-input"
            placeholder="Search employee name, department, brand…"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ minWidth: 260 }}
          />

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Showing {sorted.length} Employee{sorted.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ ...thStyle('name'), width: 40, textAlign: 'center' }}>#</th>
                <th style={{ ...thStyle('name'), textAlign: 'left', minWidth: 170 }} onClick={() => handleSort('name')}>
                  Person / Employee Name <SortIcon active={sortKey === 'name'} dir={sortDir} />
                </th>
                <th style={thStyle('totalSamples')} onClick={() => handleSort('totalSamples')}>
                  Status Updates (Count) <SortIcon active={sortKey === 'totalSamples'} dir={sortDir} />
                </th>
                <th style={thStyle('uniqueStyles')} onClick={() => handleSort('uniqueStyles')}>
                  Unique Styles <SortIcon active={sortKey === 'uniqueStyles'} dir={sortDir} />
                </th>
                <th style={thStyle('approved')} onClick={() => handleSort('approved')}>
                  Approved <SortIcon active={sortKey === 'approved'} dir={sortDir} />
                </th>
                <th style={thStyle('rejected')} onClick={() => handleSort('rejected')}>
                  Rejected <SortIcon active={sortKey === 'rejected'} dir={sortDir} />
                </th>
                <th style={thStyle('pending')} onClick={() => handleSort('pending')}>
                  Pending <SortIcon active={sortKey === 'pending'} dir={sortDir} />
                </th>
                <th style={thStyle('approvalRate')} onClick={() => handleSort('approvalRate')}>
                  Approval Rate <SortIcon active={sortKey === 'approvalRate'} dir={sortDir} />
                </th>
                <th style={thStyle('rftPercent')} onClick={() => handleSort('rftPercent')}>
                  RFT % <SortIcon active={sortKey === 'rftPercent'} dir={sortDir} />
                </th>
                <th style={thStyle('onTimePercent')} onClick={() => handleSort('onTimePercent')}>
                  On-Time % <SortIcon active={sortKey === 'onTimePercent'} dir={sortDir} />
                </th>
                <th style={{ ...thStyle('name'), cursor: 'default' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <div className="empty-state">
                      <strong>No Employees Found</strong>
                      <span>Try clearing your search term or adjusting filters.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((item, i) => {
                  const rank = (page - 1) * PAGE_SIZE + i + 1;
                  return (
                    <tr key={item.name} style={{ cursor: 'pointer' }} onClick={() => setSelectedPerson(item)}>
                      {/* Rank */}
                      <td style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)' }}>
                        {rank}
                      </td>

                      {/* Person Name */}
                      <td style={{ textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: 'var(--brand-600)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              flexShrink: 0,
                              textTransform: 'uppercase',
                            }}
                          >
                            {item.name.charAt(0) || 'P'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.875rem' }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {item.blueSealCount > 0 && <span style={{ color: 'var(--blue-seal)', marginRight: 6 }}>BS: {item.blueSealCount}</span>}
                              {item.silverSealCount > 0 && <span style={{ color: 'var(--silver-seal)' }}>SS: {item.silverSealCount}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Total Samples / Status Updates */}
                      <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.95rem', color: 'var(--brand-600)' }}>
                        {item.totalSamples.toLocaleString()}
                      </td>

                      {/* Unique Styles */}
                      <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-body)' }}>
                        {item.uniqueStyles.toLocaleString()}
                      </td>

                      {/* Approved */}
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ color: 'var(--green-text)', fontWeight: 700, fontSize: '0.85rem' }}>
                          {item.approved.toLocaleString()}
                        </span>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          {item.totalSamples > 0 ? `${((item.approved / item.totalSamples) * 100).toFixed(0)}%` : '0%'}
                        </div>
                      </td>

                      {/* Rejected */}
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ color: item.rejected > 0 ? 'var(--red-text)' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem' }}>
                          {item.rejected.toLocaleString()}
                        </span>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          {item.totalSamples > 0 ? `${((item.rejected / item.totalSamples) * 100).toFixed(0)}%` : '0%'}
                        </div>
                      </td>

                      {/* Pending */}
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ color: item.pending > 0 ? '#d97706' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem' }}>
                          {item.pending.toLocaleString()}
                        </span>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          {item.totalSamples > 0 ? `${((item.pending / item.totalSamples) * 100).toFixed(0)}%` : '0%'}
                        </div>
                      </td>

                      {/* Approval Rate */}
                      <td style={{ textAlign: 'center' }}>
                        <RateBadge value={item.approvalRate} type="approval" />
                      </td>

                      {/* RFT % */}
                      <td style={{ textAlign: 'center' }}>
                        <RateBadge value={item.rftPercent} type="rft" />
                      </td>

                      {/* On-Time % */}
                      <td style={{ textAlign: 'center' }}>
                        <RateBadge value={item.onTimePercent} type="ontime" />
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => setSelectedPerson(item)}
                          style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: 'var(--radius-pill)' }}
                        >
                          View Logs
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="table-pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-sm btn-outline"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                className="btn btn-sm btn-outline"
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Drawer for Selected Person's Sample Log ── */}
      {selectedPerson && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          onClick={() => setSelectedPerson(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: 900,
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-heading)' }}>
                  {selectedPerson.name} — Status Update Logs
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {selectedPerson.totalSamples} total status updates • {selectedPerson.approved} Approved • {selectedPerson.rejected} Rejected • {selectedPerson.pending} Pending
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => handleExportPersonExcel(selectedPerson)}
                  className="btn btn-sm"
                  style={{
                    background: '#22c55e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-pill)',
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Export Excel (.xlsx)
                </button>

                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setSelectedPerson(null)}
                  style={{ borderRadius: '50%', width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Sample List */}
            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Style Code / Name</th>
                    <th>Seal Type</th>
                    <th>Vendor</th>
                    <th>Dept / Brand</th>
                    <th>Status Date</th>
                    <th>Status</th>
                    <th>On-Time</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPerson.samples.map((r, idx) => {
                    const isAppr = r.statusNormalized === 'Approved';
                    const isRej = r.statusNormalized === 'Rejected';
                    return (
                      <tr key={idx}>
                        <td style={{ textAlign: 'center', color: 'var(--text-subtle)' }}>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{r.styleName || r.styleCode}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.styleCode}</div>
                        </td>
                        <td>{r.sealType}</td>
                        <td>{r.supplier}</td>
                        <td>
                          <div>{r.department}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.brand}</div>
                        </td>
                        <td>{formatDateDisplay(r.date)}</td>
                        <td>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-pill)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: isAppr ? '#dcfce7' : isRej ? '#fee2e2' : '#fef9c3',
                              color: isAppr ? '#15803d' : isRej ? '#b91c1c' : '#a16207',
                            }}
                          >
                            {r.status || r.statusNormalized}
                          </span>
                        </td>
                        <td>
                          {r.onTime === true ? (
                            <span style={{ color: '#15803d', fontWeight: 700 }}>✓ On Time</span>
                          ) : r.onTime === false ? (
                            <span style={{ color: '#b45309', fontWeight: 700 }}>⚠ Late</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
