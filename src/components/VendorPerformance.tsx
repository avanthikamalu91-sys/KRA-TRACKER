// src/components/VendorPerformance.tsx
import React, { useState, useMemo } from 'react';
import type { NormalizedRow, ActiveFilters } from '../utils/dataUtils';
import { computeVendorMetrics, type VendorMetric } from '../utils/vendorUtils';

const PAGE_SIZE = 25;

type SortKey = keyof Pick<VendorMetric, 'vendor' | 'totalSamples' | 'blueSeal' | 'silverSeal' | 'approved' | 'rejected' | 'adjustedPerformance'>;
type SortDir = 'asc' | 'desc';

function PerfBadge({ value }: { value: number }) {
  let bg: string, color: string;
  if (value >= 90)      { bg = '#dcfce7'; color = '#15803d'; }
  else if (value >= 75) { bg = '#fef9c3'; color = '#a16207'; }
  else if (value >= 60) { bg = '#ffedd5'; color = '#c2410c'; }
  else                  { bg = '#fee2e2'; color = '#b91c1c'; }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: bg, color, borderRadius: 6,
      padding: '3px 8px', fontWeight: 700, fontSize: '0.82rem',
    }}>
      {value.toFixed(1)}%
    </span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span style={{ opacity: 0.25, fontSize: '0.7rem' }}>⇅</span>;
  return <span style={{ fontSize: '0.8rem', color: 'var(--purple-nav)' }}>{dir === 'desc' ? '↓' : '↑'}</span>;
}

export default function VendorPerformance({ rows, filters }: { rows: NormalizedRow[]; filters: ActiveFilters }) {
  const [search, setSearch]   = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('totalSamples');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage]       = useState(1);

  const vendorMetrics = useMemo(() => computeVendorMetrics(rows, filters), [rows, filters]);

  const filtered = useMemo(() => {
    if (!search.trim()) return vendorMetrics;
    const q = search.toLowerCase();
    return vendorMetrics.filter(v => v.vendor.toLowerCase().includes(q));
  }, [vendorMetrics, search]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey] as string | number;
      const bv = b[sortKey] as string | number;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir(key === 'vendor' ? 'asc' : 'desc'); }
    setPage(1);
  };

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: '13px 14px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    userSelect: 'none',
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: sortKey === key ? 'var(--brand-600)' : 'var(--text-muted)',
    borderBottom: sortKey === key ? '2px solid var(--brand-600)' : '2px solid var(--border)',
    background: sortKey === key ? 'rgba(15,76,129,0.06)' : 'var(--bg-card2)',
    transition: 'all 0.15s',
  });

  return (
    <div>
      {/* ── Header card ── */}
      <div style={{
        background: '#0f4c81',
        borderRadius: 'var(--radius-lg)',
        padding: '22px 28px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(15,76,129,0.25)',
      }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
            Vendor Performance
          </div>
          <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.8rem', marginTop: 2 }}>
            {vendorMetrics.length} vendors · Direct approval rate (%)
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'Vendors', val: vendorMetrics.length },
            { label: 'Samples', val: rows.length.toLocaleString() },
          ].map(kpi => (
            <div key={kpi.label} style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 12,
              padding: '8px 16px',
              textAlign: 'center',
              backdropFilter: 'blur(4px)',
            }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem' }}>{kpi.val}</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem', fontWeight: 600 }}>{kpi.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="table-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card)',
        }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              style={{
                width: '100%', padding: '8px 12px 8px 34px',
                border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)', fontSize: '0.8375rem', color: 'var(--text-body)',
                outline: 'none', fontFamily: 'inherit',
              }}
              placeholder="Search vendor…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {filtered.length} vendor{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle('vendor'), width: 36, textAlign: 'center', paddingRight: 0 }}>#</th>
                <th style={thStyle('vendor')} onClick={() => handleSort('vendor')}>
                  Vendor <SortIcon active={sortKey === 'vendor'} dir={sortDir} />
                </th>
                <th style={thStyle('totalSamples')} onClick={() => handleSort('totalSamples')}>
                  Total Samples <SortIcon active={sortKey === 'totalSamples'} dir={sortDir} />
                </th>
                <th style={{ ...thStyle('blueSeal'), color: sortKey === 'blueSeal' ? '#0f4c81' : '#0f4c81', borderBottom: sortKey === 'blueSeal' ? '2px solid #0f4c81' : '2px solid var(--border)', background: sortKey === 'blueSeal' ? 'rgba(15,76,129,0.06)' : 'var(--bg-card2)' }}
                  onClick={() => handleSort('blueSeal')}>
                  Blue Seal <SortIcon active={sortKey === 'blueSeal'} dir={sortDir} />
                </th>
                <th style={{ ...thStyle('silverSeal'), color: sortKey === 'silverSeal' ? '#334155' : '#64748b', borderBottom: sortKey === 'silverSeal' ? '2px solid #64748b' : '2px solid var(--border)', background: sortKey === 'silverSeal' ? 'rgba(100,116,139,0.05)' : 'var(--bg-card2)' }}
                  onClick={() => handleSort('silverSeal')}>
                  Silver Seal <SortIcon active={sortKey === 'silverSeal'} dir={sortDir} />
                </th>
                <th style={{ ...thStyle('approved'), color: sortKey === 'approved' ? '#15803d' : '#16a34a', borderBottom: sortKey === 'approved' ? '2px solid #22c55e' : '2px solid var(--border)', background: sortKey === 'approved' ? 'rgba(22,163,74,0.04)' : 'var(--bg-card2)' }}
                  onClick={() => handleSort('approved')}>
                  Approved <SortIcon active={sortKey === 'approved'} dir={sortDir} />
                </th>
                <th style={{ ...thStyle('rejected'), color: sortKey === 'rejected' ? '#b91c1c' : '#dc2626', borderBottom: sortKey === 'rejected' ? '2px solid #ef4444' : '2px solid var(--border)', background: sortKey === 'rejected' ? 'rgba(220,38,38,0.04)' : 'var(--bg-card2)' }}
                  onClick={() => handleSort('rejected')}>
                  Rejected <SortIcon active={sortKey === 'rejected'} dir={sortDir} />
                </th>
                <th style={thStyle('adjustedPerformance')} onClick={() => handleSort('adjustedPerformance')}>
                  Performance % <SortIcon active={sortKey === 'adjustedPerformance'} dir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                    No vendors match your search.
                  </td>
                </tr>
              ) : (
                paginated.map((v, i) => {
                  const rank = (page - 1) * PAGE_SIZE + i + 1;
                  const isEven = i % 2 === 1;
                  return (
                    <tr key={`${v.vendor}-${i}`} style={{
                      background: isEven ? 'var(--bg-card2)' : 'var(--bg-card)',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = isEven ? 'var(--bg-card2)' : 'var(--bg-card)')}>
                      {/* Rank */}
                      <td style={{ padding: '12px 8px 12px 14px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700 }}>
                        {rank}
                      </td>
                      {/* Vendor */}
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.875rem' }}>
                        {v.vendor}
                      </td>
                      {/* Total Samples */}
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--text-body)', fontSize: '0.9rem' }}>
                        {v.totalSamples.toLocaleString()}
                      </td>
                      {/* Blue Seal */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          background: '#e8f1f8', color: '#0f4c81',
                          borderRadius: 6, padding: '2px 8px',
                          fontWeight: 700, fontSize: '0.82rem',
                        }}>
                          {v.blueSeal}
                        </span>
                      </td>
                      {/* Silver Seal */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          background: '#f1f5f9', color: '#475569',
                          borderRadius: 6, padding: '2px 8px',
                          fontWeight: 700, fontSize: '0.82rem',
                        }}>
                          {v.silverSeal}
                        </span>
                      </td>
                      {/* Approved */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#15803d', fontSize: '0.875rem' }}>
                          {v.approved}
                        </span>
                      </td>
                      {/* Rejected */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#b91c1c', fontSize: '0.875rem' }}>
                          {v.rejected}
                        </span>
                      </td>
                      {/* Performance */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <PerfBadge value={v.adjustedPerformance} />
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
          <div style={{
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-card2)',
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</button>
              <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next ›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
