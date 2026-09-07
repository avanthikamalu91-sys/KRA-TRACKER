// SampleTracking.tsx – Track Sample Deadlines: On Time (True), Late (False), and Not Received / Pending (No True/False)
import React, { useState, useMemo } from 'react';
import { type NormalizedRow, type SealType, type ActiveFilters, applyFilters, formatDateDisplay } from '../utils/dataUtils';

interface Props {
  rows: NormalizedRow[];
  filters: ActiveFilters;
}

export type DeadlineCategory = 'all' | 'on_time' | 'late' | 'not_received';

export type SortKey =
  | 'styleCode'
  | 'styleName'
  | 'sealType'
  | 'supplier'
  | 'department'
  | 'season'
  | 'drop'
  | 'deadlineDate'
  | 'receivedDate'
  | 'daysVariance'
  | 'deadlineStatus'
  | 'rawStatus';

export type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 25;

export interface DeadlineTrackingItem {
  styleCode: string;
  styleName: string;
  sealType: SealType;
  supplier: string;
  department: string;
  brand: string;
  season: string;
  drop: string;
  sampleRound: string | number;
  deadlineDate: string;
  receivedDate: string; // Received at Technologist date
  daysVariance: number | null; // Days difference
  onTime: boolean | null; // true = On Time, false = Late, null = No true/false (Not Received / Pending)
  deadlineCategory: 'on_time' | 'late' | 'not_received';
  deadlineStatus: string;
  rawStatus: string;
}

// Calculate days between two YYYY-MM-DD dates
function diffDays(targetDateStr: string, baseDateStr: string): number | null {
  if (!targetDateStr || !baseDateStr) return null;
  const target = new Date(targetDateStr + 'T00:00:00');
  const base = new Date(baseDateStr + 'T00:00:00');
  if (isNaN(target.getTime()) || isNaN(base.getTime())) return null;
  const diffTime = target.getTime() - base.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

function getTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function DeadlineBadge({ category, variance }: { category: DeadlineTrackingItem['deadlineCategory']; variance: number | null }) {
  if (category === 'on_time') {
    const earlyText = variance !== null && variance < 0 ? ` (${Math.abs(variance)}d early)` : '';
    return (
      <span style={{
        background: '#dcfce7',
        color: '#15803d',
        border: '1px solid #86efac',
        borderRadius: 'var(--radius-pill)',
        padding: '3px 10px',
        fontSize: '0.75rem',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        whiteSpace: 'nowrap',
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        On Time{earlyText}
      </span>
    );
  }

  if (category === 'late') {
    const lateDays = variance !== null && variance > 0 ? ` (+${variance}d late)` : '';
    return (
      <span style={{
        background: '#fef3c7',
        color: '#b45309',
        border: '1px solid #fde047',
        borderRadius: 'var(--radius-pill)',
        padding: '3px 10px',
        fontSize: '0.75rem',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        whiteSpace: 'nowrap',
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        Late{lateDays}
      </span>
    );
  }

  // Not Received / Pending (No true/false)
  const overdueDays = variance !== null && variance > 0 ? ` (${variance}d overdue)` : '';
  return (
    <span style={{
      background: '#fee2e2',
      color: '#b91c1c',
      border: '1px solid #fca5a5',
      borderRadius: 'var(--radius-pill)',
      padding: '3px 10px',
      fontSize: '0.75rem',
      fontWeight: 800,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      whiteSpace: 'nowrap',
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      Not Received / Pending{overdueDays}
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

export default function SampleTracking({ rows, filters }: Props) {
  const [search, setSearch] = useState('');
  const [sealFilter, setSealFilter] = useState<'all' | SealType>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineCategory>('all');
  const [sortKey, setSortKey] = useState<SortKey>('daysVariance');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  const todayStr = useMemo(() => getTodayStr(), []);

  // Process rows into items:
  // 1. On Time (onTime === true)
  // 2. Late (onTime === false)
  // 3. Not Received / Pending (onTime === null / no true or false)
  const trackedItems: DeadlineTrackingItem[] = useMemo(() => {
    const filteredRows = applyFilters(rows, filters);

    return filteredRows
      .filter(r => r.sealType !== null)
      .map(r => {
        const deadline = r.deadlineDate || '';
        const recDate = r.receivedAtTechDate || (r.statusNormalized === 'Approved' ? r.date : '');
        const onTimeVal = r.onTime;

        let category: DeadlineTrackingItem['deadlineCategory'];
        let variance: number | null = null;
        let deadlineStatus = '';

        if (onTimeVal === true) {
          // 1. On Time
          category = 'on_time';
          if (recDate && deadline) {
            variance = diffDays(recDate, deadline);
          }
          deadlineStatus = 'On Time';
        } else if (onTimeVal === false) {
          // 2. Late
          category = 'late';
          if (recDate && deadline) {
            variance = diffDays(recDate, deadline);
            deadlineStatus = variance && variance > 0 ? `Late (+${variance}d)` : 'Late';
          } else {
            deadlineStatus = 'Late';
          }
        } else {
          // 3. No true or false (Pending / Not received at technologist)
          category = 'not_received';
          if (deadline) {
            const overdue = diffDays(todayStr, deadline);
            variance = overdue;
            if (overdue !== null && overdue > 0) {
              deadlineStatus = `Not Received (${overdue}d overdue)`;
            } else {
              const daysLeft = overdue !== null ? Math.abs(overdue) : 0;
              deadlineStatus = `Pending (${daysLeft}d left)`;
            }
          } else {
            deadlineStatus = 'Pending (No Deadline)';
          }
        }

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
          deadlineDate: deadline,
          receivedDate: recDate,
          daysVariance: variance,
          onTime: onTimeVal,
          deadlineCategory: category,
          deadlineStatus,
          rawStatus: r.status || 'Pending',
        };
      });
  }, [rows, filters, todayStr]);

  // Overall KPI counts
  const countOnTime = trackedItems.filter(i => i.deadlineCategory === 'on_time').length;
  const countLate = trackedItems.filter(i => i.deadlineCategory === 'late').length;
  const countNotReceived = trackedItems.filter(i => i.deadlineCategory === 'not_received').length;

  const totalEvaluated = countOnTime + countLate;
  const onTimeRate = totalEvaluated > 0
    ? ((countOnTime / totalEvaluated) * 100).toFixed(1)
    : '0.0';

  // Filter items
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trackedItems.filter(item => {
      if (sealFilter !== 'all' && item.sealType !== sealFilter) return false;

      if (deadlineFilter !== 'all') {
        if (item.deadlineCategory !== deadlineFilter) return false;
      }

      if (!q) return true;
      return (
        item.styleCode.toLowerCase().includes(q) ||
        item.styleName.toLowerCase().includes(q) ||
        item.supplier.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        item.season.toLowerCase().includes(q) ||
        item.drop.toLowerCase().includes(q) ||
        item.deadlineStatus.toLowerCase().includes(q)
      );
    });
  }, [trackedItems, search, sealFilter, deadlineFilter]);

  // Sort items
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: string | number | null = a[sortKey];
      let bVal: string | number | null = b[sortKey];

      if (sortKey === 'daysVariance') {
        aVal = a.daysVariance ?? -9999;
        bVal = b.daysVariance ?? -9999;
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
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'daysVariance' ? 'desc' : 'asc'); }
    setPage(1);
  };

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: '12px 14px',
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
      {/* ── Header KPI Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f4c81 0%, #0a3052 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        marginBottom: 20,
        boxShadow: '0 4px 20px rgba(15, 76, 129, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Sample Tracking &amp; On-Time Compliance
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.8125rem', marginTop: 3 }}>
              Tracking sample deadlines across 3 options: On Time (True), Late (False), and Not Received / Pending (No True/False).
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: 12,
            padding: '8px 18px',
            textAlign: 'center',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <div style={{ color: '#86efac', fontWeight: 900, fontSize: '1.4rem' }}>{onTimeRate}%</div>
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>On-Time Rate</div>
          </div>
        </div>

        {/* Metric Chips Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {/* Total Tracked */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.12)',
            borderRadius: 10,
            padding: '10px 14px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem' }}>{trackedItems.length.toLocaleString()}</div>
            <div style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Samples</div>
          </div>

          {/* 1. On Time */}
          <div style={{
            background: 'rgba(34, 197, 94, 0.2)',
            borderRadius: 10,
            padding: '10px 14px',
            textAlign: 'center',
            border: '1px solid rgba(74, 222, 128, 0.35)',
          }}>
            <div style={{ color: '#86efac', fontWeight: 800, fontSize: '1.2rem' }}>{countOnTime.toLocaleString()}</div>
            <div style={{ color: '#dcfce7', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>✓ On Time</div>
          </div>

          {/* 2. Late */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            borderRadius: 10,
            padding: '10px 14px',
            textAlign: 'center',
            border: '1px solid rgba(251, 191, 36, 0.35)',
          }}>
            <div style={{ color: '#fde047', fontWeight: 800, fontSize: '1.2rem' }}>{countLate.toLocaleString()}</div>
            <div style={{ color: '#fef3c7', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>⚠ Late</div>
          </div>

          {/* 3. Not Received / Pending */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.22)',
            borderRadius: 10,
            padding: '10px 14px',
            textAlign: 'center',
            border: '1px solid rgba(248, 113, 113, 0.4)',
          }}>
            <div style={{ color: '#fca5a5', fontWeight: 800, fontSize: '1.2rem' }}>{countNotReceived.toLocaleString()}</div>
            <div style={{ color: '#fee2e2', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>✕ Not Received / Pending</div>
          </div>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="table-card">
        {/* Toolbar with the 3 Primary Options */}
        <div className="table-toolbar" style={{ gap: 12, flexWrap: 'wrap' }}>
          {/* Search Input */}
          <input
            id="deadline-search"
            className="search-input"
            placeholder="Search style name, style code, vendor…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ minWidth: 220 }}
          />

          {/* 3 Primary Deadline Options */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="filter-label">Compliance:</span>

            {/* All */}
            <button
              id="deadline-filter-all"
              className={`btn btn-sm ${deadlineFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setDeadlineFilter('all'); setPage(1); }}
            >
              All ({trackedItems.length})
            </button>

            {/* 1. On Time (True) */}
            <button
              id="deadline-filter-ontime"
              className={`btn btn-sm ${deadlineFilter === 'on_time' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setDeadlineFilter('on_time'); setPage(1); }}
              style={deadlineFilter === 'on_time' ? { background: '#15803d', borderColor: '#15803d' } : {}}
            >
              ✓ On Time ({countOnTime})
            </button>

            {/* 2. Late (False) */}
            <button
              id="deadline-filter-late"
              className={`btn btn-sm ${deadlineFilter === 'late' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setDeadlineFilter('late'); setPage(1); }}
              style={deadlineFilter === 'late' ? { background: '#b45309', borderColor: '#b45309' } : {}}
            >
              ⚠ Late ({countLate})
            </button>

            {/* 3. Not Received / Pending (No True/False) */}
            <button
              id="deadline-filter-notreceived"
              className={`btn btn-sm ${deadlineFilter === 'not_received' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setDeadlineFilter('not_received'); setPage(1); }}
              style={deadlineFilter === 'not_received' ? { background: '#b91c1c', borderColor: '#b91c1c' } : {}}
            >
              ✕ Not Received ({countNotReceived})
            </button>
          </div>

          {/* Seal filter */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
            <span className="filter-label">Seal:</span>
            {(['all', 'Blue Seal', 'Silver Seal'] as const).map(opt => (
              <button
                key={opt}
                id={`deadline-seal-${opt.replace(/ /g, '-').toLowerCase()}`}
                className={`btn btn-sm ${sealFilter === opt ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setSealFilter(opt); setPage(1); }}
              >
                {opt === 'all' ? 'All' : opt}
              </button>
            ))}
          </div>
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
                  Dept / Brand <SortIcon active={sortKey === 'department'} dir={sortDir} />
                </th>
                <th style={thStyle('season')} onClick={() => handleSort('season')}>
                  Season / Drop <SortIcon active={sortKey === 'season'} dir={sortDir} />
                </th>
                <th style={thStyle('deadlineDate')} onClick={() => handleSort('deadlineDate')}>
                  Deadline Date <SortIcon active={sortKey === 'deadlineDate'} dir={sortDir} />
                </th>
                <th style={thStyle('receivedDate')} onClick={() => handleSort('receivedDate')}>
                  Received at Tech <SortIcon active={sortKey === 'receivedDate'} dir={sortDir} />
                </th>
                <th style={thStyle('deadlineStatus')} onClick={() => handleSort('deadlineStatus')}>
                  Compliance Status <SortIcon active={sortKey === 'deadlineStatus'} dir={sortDir} />
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
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                      </div>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-heading)' }}>
                        No Styles Match the Selected Compliance Filter
                      </strong>
                      <span style={{ fontSize: '0.8125rem' }}>
                        Try switching compliance options or clearing your search term.
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
                          <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
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

                      {/* Dept & Brand */}
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

                      {/* Deadline Date */}
                      <td>
                        <span style={{ fontWeight: 700, color: item.deadlineDate ? 'var(--text-heading)' : 'var(--text-muted)' }}>
                          {formatDateDisplay(item.deadlineDate)}
                        </span>
                      </td>

                      {/* Received at Tech Date */}
                      <td>
                        {item.receivedDate ? (
                          <span style={{ color: 'var(--text-body)', fontWeight: 600 }}>
                            {formatDateDisplay(item.receivedDate)}
                          </span>
                        ) : (
                          <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.8rem' }}>
                            ✕ Not Received
                          </span>
                        )}
                      </td>

                      {/* Deadline / On Time Status Badge */}
                      <td>
                        <DeadlineBadge category={item.deadlineCategory} variance={item.daysVariance} />
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
              Page {page} of {totalPages} ({sorted.length.toLocaleString()} styles)
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
