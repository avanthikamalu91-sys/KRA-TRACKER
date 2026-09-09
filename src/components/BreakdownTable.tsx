// BreakdownTable.tsx – Highly Aesthetic Department / Brand / Season / Drop Performance Breakdown
import React, { useState, useMemo } from 'react';
import type { BreakdownRow, NormalizedRow, ActiveFilters } from '../utils/dataUtils';
import { exportBreakdownToExcel } from '../utils/excelExport';

interface Props {
  rows: BreakdownRow[];
  dimension: 'department' | 'brand' | 'season' | 'drop';
  onDimensionChange: (dim: 'department' | 'brand' | 'season' | 'drop') => void;
  allRows?: NormalizedRow[];
  filters?: ActiveFilters;
}

type SortKey = keyof BreakdownRow;
type SortDir = 'asc' | 'desc';
type ViewMode = 'all' | 'combined' | 'blue' | 'silver';

const PAGE_SIZE = 25;

function PctBadge({ pct }: { pct: number }) {
  const isHigh = pct >= 85;
  const isMed = pct >= 65 && pct < 85;
  const color = isHigh ? '#16a34a' : isMed ? '#d97706' : '#dc2626';
  const bg = isHigh ? '#f0fdf4' : isMed ? '#fffbeb' : '#fef2f2';
  const border = isHigh ? '#bbf7d0' : isMed ? '#fde68a' : '#fecaca';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <div className="progress-bar-track" style={{ width: 50, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(pct, 100)}%`,
            height: '100%',
            background: isHigh
              ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)'
              : isMed
              ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
              : 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
            borderRadius: 3,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      <span
        style={{
          fontSize: '0.78rem',
          fontWeight: 800,
          color,
          background: bg,
          border: `1px solid ${border}`,
          padding: '2px 7px',
          borderRadius: 6,
          minWidth: 46,
          textAlign: 'center',
        }}
      >
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`sort-icon ${active ? 'active' : ''}`} style={{ marginLeft: 4 }}>
      {active ? (dir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
    </span>
  );
}

export default function BreakdownTable({ rows, dimension, onDimensionChange, allRows, filters }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('overallSamples');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      exportBreakdownToExcel({
        rows,
        dimension,
        allRows,
        filters,
      });
    } catch (e) {
      console.error('Failed to export Excel:', e);
      alert('Failed to export Excel. Please try again.');
    } finally {
      setTimeout(() => setIsExporting(false), 600);
    }
  };

  const dims: { val: 'department' | 'brand' | 'season' | 'drop'; label: string; icon: React.ReactNode }[] = [
    {
      val: 'department',
      label: 'Department',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
        </svg>
      ),
    },
    {
      val: 'brand',
      label: 'Brand / Division',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
      ),
    },
    {
      val: 'season',
      label: 'Season',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
          <polyline points="2 17 12 22 22 17"/>
          <polyline points="2 12 12 17 22 12"/>
        </svg>
      ),
    },
    {
      val: 'drop',
      label: 'Drop / Phase',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
    },
  ];

  const dimLabel =
    dimension === 'department' ? 'Department' :
    dimension === 'brand'      ? 'Brand / Division' :
    dimension === 'season'     ? 'Season' :
                                 'Drop';

  // Filtered rows
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => r.dimension.toLowerCase().includes(q));
  }, [rows, search]);

  // Sorted rows
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
        : String(bv).localeCompare(String(av), undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // Summary Metrics across this dimension
  const summary = useMemo(() => {
    if (rows.length === 0) return null;
    const totalSamples = rows.reduce((acc, r) => acc + r.overallSamples, 0);
    const totalUniqueStyles = rows.reduce((acc, r) => acc + r.overallUniqueStyles, 0);
    const totalApproved = rows.reduce((acc, r) => acc + r.overallApproved, 0);
    const totalRejected = rows.reduce((acc, r) => acc + r.overallRejected, 0);
    const totalRFT = rows.reduce((acc, r) => acc + r.overallRFT, 0);
    const overallRFT = totalUniqueStyles > 0 ? (totalRFT / totalUniqueStyles) * 100 : 0;

    const sortedByRFT = [...rows].filter(r => r.overallUniqueStyles > 0).sort((a, b) => b.overallRFTPct - a.overallRFTPct);
    const bestGroup = sortedByRFT[0];
    const lowestGroup = sortedByRFT[sortedByRFT.length - 1];

    return {
      totalSamples,
      totalUniqueStyles,
      totalApproved,
      totalRejected,
      overallRFT,
      bestGroup,
      lowestGroup,
    };
  }, [rows]);

  const pageNums = (): (number | '…')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '…')[] = [1];
    if (page > 3) pages.push('…');
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) pages.push(p);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  };

  if (rows.length === 0) {
    return (
      <div className="table-card">
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <strong>No breakdown data available</strong>
          <span style={{ fontSize: '0.8125rem' }}>Apply a different filter combination to view breakdown analytics.</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── 1. Dimension Selector Buttons (Premium Pill Bar) ── */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="filter-label">Analyze By</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {dims.map(d => {
              const isActive = dimension === d.val;
              return (
                <button
                  key={d.val}
                  id={`breakdown-btn-${d.val}`}
                  className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => {
                    onDimensionChange(d.val);
                    setPage(1);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontWeight: 800,
                    padding: '8px 16px',
                    borderRadius: '10px',
                    boxShadow: isActive ? '0 4px 14px rgba(15, 76, 129, 0.25)' : 'none',
                    transition: 'all 0.18s ease',
                  }}
                >
                  {d.icon}
                  {d.label}
                  {isActive && (
                    <span style={{ background: 'rgba(255,255,255,0.25)', padding: '1px 7px', borderRadius: 10, fontSize: '0.72rem', marginLeft: 2 }}>
                      {rows.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* View Mode Filters (Combined, Detailed, Blue, Silver) */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px', gap: 2 }}>
          {(
            [
              { id: 'all', label: 'Full Breakdown' },
              { id: 'combined', label: 'Overall Combined' },
              { id: 'blue', label: 'Blue Seal' },
              { id: 'silver', label: 'Silver Seal' },
            ] as const
          ).map(vm => (
            <button
              key={vm.id}
              className={`btn btn-xs ${viewMode === vm.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode(vm.id)}
              style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: '7px' }}
            >
              {vm.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. Summary KPI Bar for Selected Dimension ── */}
      {summary && (
        <div className="summary-bar" style={{ margin: 0 }}>
          <div className="summary-item">
            <span className="summary-item-label">Total Groups</span>
            <span className="summary-item-value" style={{ color: 'var(--brand-700)' }}>
              {rows.length}
            </span>
            <span className="metric-sub">{dimLabel} categories</span>
          </div>

          <div className="summary-item">
            <span className="summary-item-label">Total Samples</span>
            <span className="summary-item-value">
              {summary.totalSamples.toLocaleString()}
            </span>
            <span className="metric-sub">
              {summary.totalUniqueStyles.toLocaleString()} unique styles
            </span>
          </div>

          <div className="summary-item">
            <span className="summary-item-label">Overall Approvals</span>
            <span className="summary-item-value" style={{ color: 'var(--green-text)' }}>
              {summary.totalApproved.toLocaleString()}
            </span>
            <span className="metric-sub">
              {summary.totalRejected.toLocaleString()} rejections
            </span>
          </div>

          <div className="summary-item">
            <span className="summary-item-label">Average RFT%</span>
            <span className="summary-item-value" style={{ color: summary.overallRFT >= 80 ? 'var(--green-text)' : '#f59e0b' }}>
              {summary.overallRFT.toFixed(1)}%
            </span>
            <span className="metric-sub">First-time approval rate</span>
          </div>

          {summary.bestGroup && (
            <div className="summary-item">
              <span className="summary-item-label">Top Performer</span>
              <span className="summary-item-value" style={{ fontSize: '0.95rem', color: 'var(--green-text)', lineHeight: 1.3, marginTop: 4 }}>
                {summary.bestGroup.dimension}
              </span>
              <span className="metric-sub" style={{ color: 'var(--green-text)', fontWeight: 700 }}>
                {summary.bestGroup.overallRFTPct.toFixed(1)}% RFT
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── 3. High-Quality Standard Breakdown Table ── */}
      <div className="table-card">
        <div className="table-toolbar">
          <input
            id="breakdown-search"
            className="search-input"
            placeholder={`Search ${dimLabel.toLowerCase()} name…`}
            value={search}
            onChange={handleSearch}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="table-count">
              {sorted.length} of {rows.length} {dimLabel.toLowerCase()} groups · page {page} of {totalPages}
            </span>
            <button
              type="button"
              id="btn-export-breakdown-excel"
              className="btn btn-sm"
              onClick={handleExportExcel}
              disabled={isExporting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontWeight: 700,
                fontSize: '0.8125rem',
                color: '#15803d',
                borderColor: '#86efac',
                background: '#f0fdf4',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                boxShadow: '0 1px 3px rgba(22, 163, 74, 0.1)',
              }}
              title="Export complete breakdown summaries to Excel (.xlsx)"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {isExporting ? 'Exporting…' : 'Export Excel (.xlsx)'}
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('dimension')} style={{ minWidth: 180, cursor: 'pointer' }}>
                  {dimLabel} <SortIcon active={sortKey === 'dimension'} dir={sortDir} />
                </th>

                {/* COMBINED OVERALL COLUMNS */}
                {(viewMode === 'all' || viewMode === 'combined') && (
                  <>
                    <th onClick={() => handleSort('overallSamples')} style={{ cursor: 'pointer', background: 'rgba(15, 76, 129, 0.04)' }} title="Total sample rows evaluated in this drop/group">
                      Total Samples <SortIcon active={sortKey === 'overallSamples'} dir={sortDir} />
                    </th>
                    <th onClick={() => handleSort('overallUniqueStyles')} style={{ cursor: 'pointer', background: 'rgba(15, 76, 129, 0.04)' }} title="Count of distinct style codes">
                      Unique Styles <SortIcon active={sortKey === 'overallUniqueStyles'} dir={sortDir} />
                    </th>
                    <th onClick={() => handleSort('overallApproved')} style={{ cursor: 'pointer', color: 'var(--green-text)', background: 'rgba(15, 76, 129, 0.04)' }}>
                      Approved <SortIcon active={sortKey === 'overallApproved'} dir={sortDir} />
                    </th>
                    <th onClick={() => handleSort('overallRejected')} style={{ cursor: 'pointer', color: 'var(--red-text)', background: 'rgba(15, 76, 129, 0.04)' }}>
                      Rejected <SortIcon active={sortKey === 'overallRejected'} dir={sortDir} />
                    </th>
                    <th onClick={() => handleSort('overallRFTPct')} style={{ cursor: 'pointer', background: 'rgba(15, 76, 129, 0.04)' }}>
                      Overall RFT% <SortIcon active={sortKey === 'overallRFTPct'} dir={sortDir} />
                    </th>
                  </>
                )}

                {/* BLUE SEAL COLUMNS */}
                {(viewMode === 'all' || viewMode === 'blue') && (
                  <>
                    <th onClick={() => handleSort('blueSamples')} style={{ color: 'var(--blue-seal)', cursor: 'pointer' }} title="Total Blue Seal submission instances">
                      Blue Samples <SortIcon active={sortKey === 'blueSamples'} dir={sortDir} />
                    </th>
                    <th onClick={() => handleSort('blueTotal')} style={{ color: 'var(--blue-seal)', cursor: 'pointer' }} title="Unique Blue Seal styles">
                      Blue Styles <SortIcon active={sortKey === 'blueTotal'} dir={sortDir} />
                    </th>
                    <th onClick={() => handleSort('blueApproved')} style={{ color: 'var(--blue-seal)', cursor: 'pointer' }}>
                      Blue Appr <SortIcon active={sortKey === 'blueApproved'} dir={sortDir} />
                    </th>
                    <th onClick={() => handleSort('blueRejected')} style={{ color: 'var(--blue-seal)', cursor: 'pointer' }}>
                      Blue Rej <SortIcon active={sortKey === 'blueRejected'} dir={sortDir} />
                    </th>
                    <th onClick={() => handleSort('blueRFTPct')} style={{ color: 'var(--blue-seal)', cursor: 'pointer' }}>
                      Blue RFT% <SortIcon active={sortKey === 'blueRFTPct'} dir={sortDir} />
                    </th>
                  </>
                )}

                {/* SILVER SEAL COLUMNS */}
                {(viewMode === 'all' || viewMode === 'silver') && (
                  <>
                    <th onClick={() => handleSort('silverSamples')} style={{ color: 'var(--silver-seal)', cursor: 'pointer' }} title="Total Silver Seal submission instances">
                      Silver Samples <SortIcon active={sortKey === 'silverSamples'} dir={sortDir} />
                    </th>
                    <th onClick={() => handleSort('silverTotal')} style={{ color: 'var(--silver-seal)', cursor: 'pointer' }} title="Unique Silver Seal styles">
                      Silver Styles <SortIcon active={sortKey === 'silverTotal'} dir={sortDir} />
                    </th>
                    <th onClick={() => handleSort('silverApproved')} style={{ color: 'var(--silver-seal)', cursor: 'pointer' }}>
                      Silver Appr <SortIcon active={sortKey === 'silverApproved'} dir={sortDir} />
                    </th>
                    <th onClick={() => handleSort('silverRejected')} style={{ color: 'var(--silver-seal)', cursor: 'pointer' }}>
                      Silver Rej <SortIcon active={sortKey === 'silverRejected'} dir={sortDir} />
                    </th>
                    <th onClick={() => handleSort('silverRFTPct')} style={{ color: 'var(--silver-seal)', cursor: 'pointer' }}>
                      Silver RFT% <SortIcon active={sortKey === 'silverRFTPct'} dir={sortDir} />
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={15}>
                    <div className="empty-state">
                      <strong>No matching {dimLabel.toLowerCase()} found</strong>
                      <span style={{ fontSize: '0.8125rem' }}>Try searching with a different term.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map(r => (
                  <tr key={r.dimension}>
                    {/* Dimension Name */}
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '0.875rem' }}>
                        {r.dimension}
                      </div>
                    </td>

                    {/* COMBINED OVERALL METRICS */}
                    {(viewMode === 'all' || viewMode === 'combined') && (
                      <>
                        <td style={{ background: 'rgba(15, 76, 129, 0.02)' }}>
                          <span style={{ fontWeight: 800, color: 'var(--brand-700)', fontSize: '0.9rem' }}>
                            {r.overallSamples.toLocaleString()}
                          </span>
                        </td>
                        <td style={{ background: 'rgba(15, 76, 129, 0.02)' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>
                            {r.overallUniqueStyles.toLocaleString()}
                          </span>
                        </td>
                        <td style={{ color: 'var(--green-text)', fontWeight: 700, background: 'rgba(15, 76, 129, 0.02)' }}>
                          {r.overallApproved.toLocaleString()}
                        </td>
                        <td style={{ color: r.overallRejected > 0 ? 'var(--red-text)' : 'var(--text-muted)', fontWeight: 700, background: 'rgba(15, 76, 129, 0.02)' }}>
                          {r.overallRejected.toLocaleString()}
                        </td>
                        <td style={{ background: 'rgba(15, 76, 129, 0.02)' }}>
                          <PctBadge pct={r.overallRFTPct} />
                        </td>
                      </>
                    )}

                    {/* BLUE SEAL METRICS */}
                    {(viewMode === 'all' || viewMode === 'blue') && (
                      <>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--blue-seal)' }}>
                            {r.blueSamples.toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                            {r.blueTotal.toLocaleString()}
                          </span>
                        </td>
                        <td style={{ color: 'var(--green-text)', fontWeight: 600 }}>{r.blueApproved.toLocaleString()}</td>
                        <td style={{ color: r.blueRejected > 0 ? 'var(--red-text)' : 'var(--text-muted)', fontWeight: 600 }}>{r.blueRejected.toLocaleString()}</td>
                        <td>
                          <PctBadge pct={r.blueRFTPct} />
                        </td>
                      </>
                    )}

                    {/* SILVER SEAL METRICS */}
                    {(viewMode === 'all' || viewMode === 'silver') && (
                      <>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--silver-seal)' }}>
                            {r.silverSamples.toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                            {r.silverTotal.toLocaleString()}
                          </span>
                        </td>
                        <td style={{ color: 'var(--green-text)', fontWeight: 600 }}>{r.silverApproved.toLocaleString()}</td>
                        <td style={{ color: r.silverRejected > 0 ? 'var(--red-text)' : 'var(--text-muted)', fontWeight: 600 }}>{r.silverRejected.toLocaleString()}</td>
                        <td>
                          <PctBadge pct={r.silverRFTPct} />
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
            >
              ‹
            </button>
            {pageNums().map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>…</span>
              ) : (
                <button
                  key={p}
                  className={`page-btn ${page === p ? 'active' : ''}`}
                  onClick={() => setPage(Number(p))}
                >
                  {p}
                </button>
              )
            )}
            <button
              className="page-btn"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
