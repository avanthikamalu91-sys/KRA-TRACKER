// AnalysisTable.tsx – Detailed style-level table with search, sort, pagination
import React, { useState, useMemo } from 'react';
import { type StyleMetrics, type SealType, formatDateDisplay } from '../utils/dataUtils';

interface Props {
  blueSealStyles:   StyleMetrics[];
  silverSealStyles: StyleMetrics[];
  sealFilter: 'all' | SealType;
  initialSortKey?: SortKey;
  initialSortDir?: SortDir;
}

type SortKey = 'styleCode' | 'styleName' | 'sealType' | 'occurrences' | 'isRFT' | 'primaryStatus' | 'department' | 'brand' | 'season' | 'drop' | 'date';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 25;

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  let cls = 'badge-other';
  if (s === 'approved')  cls = 'badge-approved';
  if (s === 'rejected')  cls = 'badge-rejected';
  if (s === 'pending')   cls = 'badge-pending';
  if (s === 'cancelled') cls = 'badge-other';
  return <span className={`badge ${cls}`}>{status}</span>;
}

function SealBadge({ type }: { type: SealType }) {
  return (
    <span className={`badge ${type === 'Blue Seal' ? 'badge-blue' : 'badge-silver'}`}>
      {type === 'Blue Seal' ? 'Blue Seal' : 'Silver Seal'}
    </span>
  );
}

function RFTBadge({ isRFT }: { isRFT: boolean }) {
  return isRFT
    ? <span className="badge badge-rft">✓ RFT</span>
    : <span className="badge badge-notrft">✗ Not RFT</span>;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`sort-icon ${active ? 'active' : ''}`}>
      {active ? (dir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
    </span>
  );
}

export default function AnalysisTable({ blueSealStyles, silverSealStyles, sealFilter, initialSortKey = 'styleCode', initialSortDir = 'asc' }: Props) {
  const [search,  setSearch]  = useState('');
  const [sortKey, setSortKey] = useState<SortKey>(initialSortKey);
  const [sortDir, setSortDir] = useState<SortDir>(initialSortDir);
  const [page,    setPage]    = useState(1);

  // Re-apply if parent changes the initial sort (e.g. season button click)
  const prevSortKey = React.useRef(initialSortKey);
  const prevSortDir = React.useRef(initialSortDir);
  React.useEffect(() => {
    if (prevSortKey.current !== initialSortKey || prevSortDir.current !== initialSortDir) {
      setSortKey(initialSortKey);
      setSortDir(initialSortDir);
      setPage(1);
      prevSortKey.current = initialSortKey;
      prevSortDir.current = initialSortDir;
    }
  }, [initialSortKey, initialSortDir]);

  const allStyles = useMemo(() => {
    if (sealFilter === 'Blue Seal')   return blueSealStyles;
    if (sealFilter === 'Silver Seal') return silverSealStyles;
    return [...blueSealStyles, ...silverSealStyles];
  }, [blueSealStyles, silverSealStyles, sealFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allStyles;
    return allStyles.filter(s =>
      s.styleCode.toLowerCase().includes(q) ||
      s.styleName.toLowerCase().includes(q) ||
      s.sealType.toLowerCase().includes(q) ||
      s.primaryStatus.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q) ||
      s.brand.toLowerCase().includes(q) ||
      s.season.toLowerCase().includes(q) ||
      s.drop.toLowerCase().includes(q)
    );
  }, [allStyles, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: string | number | boolean = a[sortKey];
      let bVal: string | number | boolean = b[sortKey];
      if (typeof aVal === 'boolean') aVal = aVal ? 0 : 1;
      if (typeof bVal === 'boolean') bVal = bVal ? 0 : 1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const as = String(aVal).toLowerCase();
      const bs = String(bVal).toLowerCase();
      return sortDir === 'asc'
        ? as.localeCompare(bs, undefined, { numeric: true, sensitivity: 'base' })
        : bs.localeCompare(as, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const cols: { key: SortKey; label: string }[] = [
    { key: 'sealType',      label: 'Seal Type' },
    { key: 'styleName',     label: 'Style Name' },
    { key: 'occurrences',   label: 'Occurrences' },
    { key: 'isRFT',         label: 'RFT Status' },
    { key: 'primaryStatus', label: 'Status' },
    { key: 'department',    label: 'Department' },
    { key: 'brand',         label: 'Brand / Division' },
    { key: 'season',        label: 'Season' },
    { key: 'drop',          label: 'Drop' },
    { key: 'date',          label: 'Date' },
  ];

  const pageNums = (): (number | '…')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '…')[] = [1];
    if (page > 3)  pages.push('…');
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) pages.push(p);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="table-card">
      <div className="table-toolbar">
        <input
          id="analysis-search"
          className="search-input"
          placeholder="Search style code, department, status…"
          value={search}
          onChange={handleSearch}
        />
        <span className="table-count">
          {sorted.length.toLocaleString()} styles · page {page} of {totalPages}
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c.key} onClick={() => handleSort(c.key)}>
                  {c.label}
                  <SortIcon active={sortKey === c.key} dir={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                    </div>
                    <strong>No results found</strong>
                    <span style={{ fontSize: '0.8125rem' }}>Try a different search term or reset your filters.</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((s, i) => (
                <tr key={`${s.sealType}-${s.styleCode}-${i}`}>
                  <td><SealBadge type={s.sealType} /></td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.85rem' }}>
                      {s.styleName && s.styleName !== '—' ? s.styleName : s.styleCode}
                    </div>
                    {s.styleName && s.styleName !== '—' && s.styleCode && s.styleCode !== '—' && (
                      <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {s.styleCode}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{
                      fontWeight: 800,
                      fontSize: '1rem',
                      color: s.occurrences === 1 ? 'var(--green-text)' : 'var(--red-text)',
                    }}>
                      {s.occurrences}
                    </span>
                  </td>
                  <td><RFTBadge isRFT={s.isRFT} /></td>
                  <td><StatusBadge status={s.primaryStatus} /></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{s.department || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{s.brand || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{s.season || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{s.drop || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatDateDisplay(s.date)}</td>
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
  );
}
