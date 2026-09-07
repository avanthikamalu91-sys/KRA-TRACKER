// PendingSamples.tsx – Track Pending Samples, Seal Types, and Aging
import React, { useState, useMemo } from 'react';
import { type NormalizedRow, type SealType, type ActiveFilters, applyFilters, formatDateDisplay } from '../utils/dataUtils';

interface Props {
  rows: NormalizedRow[];
  filters: ActiveFilters;
}

type AgingBucket = 'all' | '<7' | '7-14' | '15-30' | '>30';
type SortKey = 'styleCode' | 'styleName' | 'sealType' | 'supplier' | 'department' | 'season' | 'drop' | 'sampleRound' | 'date' | 'daysPending';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 25;

export interface PendingSampleItem {
  styleCode: string;
  styleName: string;
  sealType: SealType;
  supplier: string;
  department: string;
  brand: string;
  season: string;
  drop: string;
  sampleRound: string | number;
  date: string;
  daysPending: number | null;
  status: string;
}

export function calculateDaysPending(dateStr: string): number | null {
  if (!dateStr) return null;
  const itemDate = new Date(dateStr + 'T00:00:00');
  if (isNaN(itemDate.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = today.getTime() - itemDate.getTime();
  const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  return diffDays;
}

function AgingBadge({ days }: { days: number | null }) {
  if (days === null) {
    return (
      <span style={{
        background: '#f1f5f9',
        color: '#64748b',
        borderRadius: 6,
        padding: '3px 8px',
        fontSize: '0.75rem',
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
      }}>
        No Date
      </span>
    );
  }

  if (days <= 7) {
    return (
      <span style={{
        background: '#dcfce7',
        color: '#15803d',
        border: '1px solid #bbf7d0',
        borderRadius: 6,
        padding: '3px 9px',
        fontSize: '0.75rem',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
      }}>
        {days} day{days !== 1 ? 's' : ''}
      </span>
    );
  }

  if (days <= 14) {
    return (
      <span style={{
        background: '#fef9c3',
        color: '#854d0e',
        border: '1px solid #fef08a',
        borderRadius: 6,
        padding: '3px 9px',
        fontSize: '0.75rem',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
      }}>
        {days} days
      </span>
    );
  }

  if (days <= 30) {
    return (
      <span style={{
        background: '#ffedd5',
        color: '#9a3412',
        border: '1px solid #fed7aa',
        borderRadius: 6,
        padding: '3px 9px',
        fontSize: '0.75rem',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
      }}>
        {days} days
      </span>
    );
  }

  return (
    <span style={{
      background: '#fee2e2',
      color: '#991b1b',
      border: '1px solid #fecaca',
      borderRadius: 6,
      padding: '3px 9px',
      fontSize: '0.75rem',
      fontWeight: 800,
      display: 'inline-flex',
      alignItems: 'center',
    }}>
      {days} days
    </span>
  );
}

function SealBadge({ type }: { type: SealType }) {
  const isBlue = type === 'Blue Seal';
  return (
    <span style={{
      background: isBlue ? 'var(--blue-seal-bg)' : 'var(--silver-seal-bg)',
      color: isBlue ? 'var(--blue-seal)' : 'var(--silver-seal)',
      border: `1px solid ${isBlue ? 'var(--blue-seal-light)' : 'var(--silver-seal-light)'}`,
      borderRadius: 'var(--radius-pill)',
      padding: '3px 10px',
      fontSize: '0.72rem',
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
    }}>
      {isBlue ? 'Blue Seal' : 'Silver Seal'}
    </span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{
      opacity: active ? 1 : 0.35,
      marginLeft: 4,
      fontSize: '0.7rem',
      color: active ? 'var(--brand-600)' : 'inherit',
    }}>
      {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );
}

export default function PendingSamples({ rows, filters }: Props) {
  const [search, setSearch] = useState('');
  const [sealFilter, setSealFilter] = useState<'all' | SealType>('all');
  const [agingFilter, setAgingFilter] = useState<AgingBucket>('all');
  const [sortKey, setSortKey] = useState<SortKey>('daysPending');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  // 1. Filter rows by active global filters, selecting ONLY Pending samples with Received at Technologist dates
  const pendingSamples: PendingSampleItem[] = useMemo(() => {
    const filteredRows = applyFilters(rows, filters);
    const hasAnyTechDate = filteredRows.some(r => !!r.receivedAtTechDate);

    return filteredRows
      .filter(r => {
        if (r.statusNormalized === 'Approved' || r.statusNormalized === 'Rejected' || r.statusNormalized === 'Cancelled') {
          return false;
        }
        if (r.sealType === null) return false;

        // Require Received at Technologist date
        const recDate = r.receivedAtTechDate || (hasAnyTechDate ? '' : r.date);
        return Boolean(recDate);
      })
      .map(r => {
        const date = r.receivedAtTechDate || r.date || '';
        return {
          styleCode: r.styleCode || '—',
          styleName: r.styleName || '—',
          sealType: r.sealType as SealType,
          supplier: r.supplier || 'Unknown Vendor',
          department: r.department || '—',
          brand: r.brand || '—',
          season: r.season || '—',
          drop: r.drop || '—',
          sampleRound: r.sampleRound ? String(r.sampleRound).replace(/^round\s*/i, '') : '1',
          date,
          daysPending: calculateDaysPending(date),
          status: r.status || 'Pending',
        };
      });
  }, [rows, filters]);

  // Metrics
  const totalPending = pendingSamples.length;
  const bluePending  = pendingSamples.filter(s => s.sealType === 'Blue Seal').length;
  const silverPending = pendingSamples.filter(s => s.sealType === 'Silver Seal').length;
  
  const validDays = pendingSamples.map(s => s.daysPending).filter((d): d is number => d !== null);
  const avgDays = validDays.length > 0
    ? Math.round(validDays.reduce((a, b) => a + b, 0) / validDays.length)
    : 0;
  const criticalCount = pendingSamples.filter(s => s.daysPending !== null && s.daysPending > 30).length;

  // 2. Filter by search, seal type, aging bucket
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pendingSamples.filter(s => {
      if (sealFilter !== 'all' && s.sealType !== sealFilter) return false;

      if (agingFilter !== 'all') {
        if (agingFilter === '<7' && (s.daysPending === null || s.daysPending > 7)) return false;
        if (agingFilter === '7-14' && (s.daysPending === null || s.daysPending < 7 || s.daysPending > 14)) return false;
        if (agingFilter === '15-30' && (s.daysPending === null || s.daysPending < 15 || s.daysPending > 30)) return false;
        if (agingFilter === '>30' && (s.daysPending === null || s.daysPending <= 30)) return false;
      }

      if (!q) return true;
      return (
        s.styleCode.toLowerCase().includes(q) ||
        s.styleName.toLowerCase().includes(q) ||
        s.supplier.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.brand.toLowerCase().includes(q) ||
        s.season.toLowerCase().includes(q) ||
        s.drop.toLowerCase().includes(q)
      );
    });
  }, [pendingSamples, search, sealFilter, agingFilter]);

  // 3. Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: string | number | null = a[sortKey];
      let bVal: string | number | null = b[sortKey];

      // Handle nulls in days pending
      if (sortKey === 'daysPending') {
        aVal = a.daysPending ?? -1;
        bVal = b.daysPending ?? -1;
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const as = String(aVal || '').toLowerCase();
      const bs = String(bVal || '').toLowerCase();
      return sortDir === 'asc'
        ? as.localeCompare(bs, undefined, { numeric: true, sensitivity: 'base' })
        : bs.localeCompare(as, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'daysPending' ? 'desc' : 'asc'); }
    setPage(1);
  };

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: '12px 16px',
    textAlign: 'center',
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: sortKey === key ? 'var(--brand-600)' : 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    background: sortKey === key ? 'rgba(15, 76, 129, 0.06)' : 'var(--bg-card2)',
    borderBottom: sortKey === key ? '2px solid var(--brand-600)' : '1px solid var(--border)',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  });

  return (
    <div>
      {/* ── Top KPI Cards Header ── */}
      <div style={{
        background: '#0f4c81',
        borderRadius: 'var(--radius-lg)',
        padding: '22px 28px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(15, 76, 129, 0.25)',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.01em' }}>
            Pending Samples
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.8125rem', marginTop: 3 }}>
            Monitoring pending styles with Received at Technologist dates &amp; aging
          </div>
        </div>

        {/* Metric Chips */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.14)',
            borderRadius: 12,
            padding: '8px 16px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem' }}>{totalPending.toLocaleString()}</div>
            <div style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Pending</div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.14)',
            borderRadius: 12,
            padding: '8px 16px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}>
            <div style={{ color: '#93c5fd', fontWeight: 800, fontSize: '1.15rem' }}>{bluePending.toLocaleString()}</div>
            <div style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase' }}>Blue Seal</div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.14)',
            borderRadius: 12,
            padding: '8px 16px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}>
            <div style={{ color: '#e2e8f0', fontWeight: 800, fontSize: '1.15rem' }}>{silverPending.toLocaleString()}</div>
            <div style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase' }}>Silver Seal</div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.14)',
            borderRadius: 12,
            padding: '8px 16px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}>
            <div style={{ color: '#fef08a', fontWeight: 800, fontSize: '1.15rem' }}>{avgDays} d</div>
            <div style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase' }}>Avg Days</div>
          </div>

          {criticalCount > 0 && (
            <div style={{
              background: '#ef4444',
              borderRadius: 12,
              padding: '8px 16px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
            }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem' }}>{criticalCount}</div>
              <div style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>Overdue &gt;30d</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="table-card">
        {/* Toolbar */}
        <div className="table-toolbar" style={{ gap: 14 }}>
          {/* Search */}
          <input
            id="tracking-search"
            className="search-input"
            placeholder="Search style name, style code, vendor…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />

          {/* Seal Filter */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className="filter-label">Seal:</span>
            {(['all', 'Blue Seal', 'Silver Seal'] as const).map(opt => (
              <button
                key={opt}
                id={`tracking-seal-${opt.replace(/ /g, '-').toLowerCase()}`}
                className={`btn btn-sm ${sealFilter === opt ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setSealFilter(opt); setPage(1); }}
              >
                {opt === 'all' ? 'All Seals' : opt}
              </button>
            ))}
          </div>

          {/* Aging Filter */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className="filter-label">Aging:</span>
            {(['all', '<7', '7-14', '15-30', '>30'] as const).map(bucket => {
              const labelMap = {
                all: 'All',
                '<7': '< 7d',
                '7-14': '7–14d',
                '15-30': '15–30d',
                '>30': '> 30d',
              };
              return (
                <button
                  key={bucket}
                  className={`btn btn-sm ${agingFilter === bucket ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => { setAgingFilter(bucket); setPage(1); }}
                >
                  {labelMap[bucket]}
                </button>
              );
            })}
          </div>

          <span className="table-count">
            {sorted.length.toLocaleString()} pending styles · page {page} of {totalPages}
          </span>
        </div>

        {/* Table Body */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ ...thStyle('styleCode'), width: 40, textAlign: 'center', paddingRight: 4 }}>#</th>
                <th style={thStyle('styleName')} onClick={() => handleSort('styleName')}>
                  Style Name <SortIcon active={sortKey === 'styleName'} dir={sortDir} />
                </th>
                <th style={thStyle('sealType')} onClick={() => handleSort('sealType')}>
                  Seal Type <SortIcon active={sortKey === 'sealType'} dir={sortDir} />
                </th>
                <th style={thStyle('supplier')} onClick={() => handleSort('supplier')}>
                  Vendor <SortIcon active={sortKey === 'supplier'} dir={sortDir} />
                </th>
                <th style={thStyle('department')} onClick={() => handleSort('department')}>
                  Department / Brand <SortIcon active={sortKey === 'department'} dir={sortDir} />
                </th>
                <th style={thStyle('season')} onClick={() => handleSort('season')}>
                  Season / Drop <SortIcon active={sortKey === 'season'} dir={sortDir} />
                </th>
                <th style={thStyle('sampleRound')} onClick={() => handleSort('sampleRound')}>
                  Round <SortIcon active={sortKey === 'sampleRound'} dir={sortDir} />
                </th>
                <th style={thStyle('date')} onClick={() => handleSort('date')}>
                  Received at Technologist <SortIcon active={sortKey === 'date'} dir={sortDir} />
                </th>
                <th style={thStyle('daysPending')} onClick={() => handleSort('daysPending')}>
                  Days Pending <SortIcon active={sortKey === 'daysPending'} dir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--brand-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-heading)' }}>
                        {totalPending === 0 ? 'No Pending Styles' : 'No Results Match Filter'}
                      </strong>
                      <span style={{ fontSize: '0.8125rem' }}>
                        {totalPending === 0
                          ? 'All styles in this dataset have been approved or completed.'
                          : 'Try resetting your search query or aging filter options.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((item, i) => {
                  const rank = (page - 1) * PAGE_SIZE + i + 1;
                  return (
                    <tr key={`${item.styleCode}-${item.sealType}-${i}`}>
                      {/* Rank */}
                      <td style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700 }}>
                        {rank}
                      </td>

                      {/* Style Name & Code */}
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.875rem' }}>
                          {item.styleName && item.styleName !== '—' ? item.styleName : item.styleCode}
                        </div>
                        {item.styleName && item.styleName !== '—' && item.styleCode && item.styleCode !== '—' && (
                          <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {item.styleCode}
                          </div>
                        )}
                      </td>

                      {/* Seal Type */}
                      <td>
                        <SealBadge type={item.sealType} />
                      </td>

                      {/* Vendor */}
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text-body)', fontSize: '0.85rem' }}>
                          {item.supplier}
                        </span>
                      </td>

                      {/* Dept / Brand */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-body)' }}>
                          {item.department}
                        </div>
                        {item.brand && item.brand !== '—' && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {item.brand}
                          </div>
                        )}
                      </td>

                      {/* Season & Drop */}
                      <td>
                        <div style={{ color: 'var(--text-body)', fontWeight: 500 }}>
                          {item.season}
                        </div>
                        {item.drop && item.drop !== '—' && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {item.drop}
                          </div>
                        )}
                      </td>

                      {/* Round */}
                      <td>
                        <span style={{
                          background: 'var(--bg-input)',
                          borderRadius: 6,
                          padding: '2px 8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                        }}>
                          {item.sampleRound}
                        </span>
                      </td>

                      {/* Received Date */}
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-body)' }}>
                        {formatDateDisplay(item.date)}
                      </td>

                      {/* Days Pending / Aging */}
                      <td>
                        <AgingBadge days={item.daysPending} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', padding: '0 10px', fontWeight: 600 }}>
              Page {page} of {totalPages}
            </span>
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
