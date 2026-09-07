// src/components/RejectionAnalysis.tsx – Premium Rejection Analysis Dashboard
import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import type { NormalizedRow, ActiveFilters, SealType } from '../utils/dataUtils';
import { applyFilters, formatDateDisplay } from '../utils/dataUtils';

interface Props {
  rows?: NormalizedRow[];
  filters?: ActiveFilters;
}

export interface RejectedStyleRecord {
  styleCode: string;
  styleName: string;
  sealType: SealType;
  department: string;
  brand: string;
  season: string;
  drop: string;
  supplier: string;
  rejectionCount: number;
  totalSubmissions: number;
  primaryReason: string;
  allReasons: string[];
  date: string;
}

type SortKey = 'styleCode' | 'styleName' | 'sealType' | 'rejectionCount' | 'supplier' | 'brand' | 'department' | 'primaryReason' | 'date';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 25;

const PALETTE = ['#ef4444', '#f59e0b', '#0ea5e9', '#8b5cf6', '#10b981', '#6366f1', '#ec4899', '#64748b'];

function SealBadge({ type }: { type: SealType }) {
  return (
    <span className={`badge ${type === 'Blue Seal' ? 'badge-blue' : 'badge-silver'}`}>
      {type === 'Blue Seal' ? 'Blue Seal' : 'Silver Seal'}
    </span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`sort-icon ${active ? 'active' : ''}`}>
      {active ? (dir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
    </span>
  );
}

// Safely categorize raw text reasons into standard apparel defect buckets
function categorizeReason(raw: unknown): string {
  if (raw === null || raw === undefined) return 'Unspecified Technical Feedback';
  const str = String(raw).trim();
  if (!str || str === '—' || str === '-' || str === 'null' || str === 'undefined') {
    return 'Unspecified Technical Feedback';
  }
  const t = str.toLowerCase();

  if (t.includes('fit') || t.includes('measurement') || t.includes('waist') || t.includes('chest') || t.includes('length') || t.includes('tight') || t.includes('loose') || t.includes('spec') || t.includes('tolerance') || t.includes('crotch') || t.includes('hip') || t.includes('size')) {
    return 'Fit & Measurement Deviation';
  }
  if (t.includes('workmanship') || t.includes('sewing') || t.includes('stitch') || t.includes('puckering') || t.includes('construction') || t.includes('finish') || t.includes('hem') || t.includes('seam') || t.includes('tension')) {
    return 'Workmanship & Construction';
  }
  if (t.includes('fabric') || t.includes('gsm') || t.includes('shade') || t.includes('shrinkage') || t.includes('handfeel') || t.includes('color') || t.includes('bleeding') || t.includes('yarn') || t.includes('weight') || t.includes('wash')) {
    return 'Fabric & Color Quality';
  }
  if (t.includes('pattern') || t.includes('grading') || t.includes('balance') || t.includes('shape') || t.includes('armhole') || t.includes('neck') || t.includes('sleeve') || t.includes('pitch')) {
    return 'Pattern & Grading Issue';
  }
  if (t.includes('trim') || t.includes('zipper') || t.includes('button') || t.includes('label') || t.includes('elastic') || t.includes('thread') || t.includes('care label') || t.includes('badge') || t.includes('pocket')) {
    return 'Trims & Accessories';
  }
  if (t.includes('sample') || t.includes('missing') || t.includes('artwork') || t.includes('print') || t.includes('embroidery') || t.includes('placement') || t.includes('tech pack')) {
    return 'Artwork & Spec Discrepancy';
  }
  return str.length > 30 ? str.slice(0, 30) + '...' : str;
}

export default function RejectionAnalysis({ rows = [], filters }: Props) {
  const [sealFilter, setSealFilter] = useState<'all' | SealType>('all');
  const [selectedReasonFilter, setSelectedReasonFilter] = useState<string>('all');
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rejectionCount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [accountabilityType, setAccountabilityType] = useState<'vendor' | 'buyer'>('vendor');

  // 1. Filter rows by active global filters
  const filteredRows = useMemo(() => {
    if (!rows || !Array.isArray(rows)) return [];
    if (!filters) return rows;
    return applyFilters(rows, filters);
  }, [rows, filters]);

  // 2. Compute metrics, department chart data, accountability chart data, reason table, and style records
  const {
    rejectedRecords,
    deptChartData,
    accountabilityChartData,
    reasonTableData,
    totalRejectedRows,
    blueRejectedCount,
    silverRejectedCount,
  } = useMemo(() => {
    let blueCount = 0;
    let silverCount = 0;
    let totalRejected = 0;

    const styleMap = new Map<string, { rows: NormalizedRow[]; sealType: SealType }>();
    const deptMap: Record<string, { blue: number; silver: number; total: number }> = {};
    const vendorMap: Record<string, { rejections: number; blue: number; silver: number; totalSubmissions: number }> = {};
    const buyerMap: Record<string, { rejections: number; blue: number; silver: number; totalSubmissions: number }> = {};
    const reasonMap: Record<string, { rejections: number; blue: number; silver: number }> = {};

    for (const r of filteredRows) {
      if (!r) continue;
      const dept = r.department || 'Unassigned';
      const vend = r.supplier || 'Unassigned';
      const buyer = r.brand || 'Unassigned';
      const seal = r.sealType || 'Blue Seal';

      if (!deptMap[dept]) deptMap[dept] = { blue: 0, silver: 0, total: 0 };
      if (!vendorMap[vend]) vendorMap[vend] = { rejections: 0, blue: 0, silver: 0, totalSubmissions: 0 };
      if (!buyerMap[buyer]) buyerMap[buyer] = { rejections: 0, blue: 0, silver: 0, totalSubmissions: 0 };

      vendorMap[vend].totalSubmissions++;
      buyerMap[buyer].totalSubmissions++;

      const isRejected = (r.statusNormalized || '').toLowerCase() === 'rejected' || (r.status || '').toLowerCase().includes('reject');

      if (isRejected) {
        totalRejected++;
        if (seal === 'Blue Seal') {
          blueCount++;
          deptMap[dept].blue++;
          vendorMap[vend].blue++;
          buyerMap[buyer].blue++;
        }
        if (seal === 'Silver Seal') {
          silverCount++;
          deptMap[dept].silver++;
          vendorMap[vend].silver++;
          buyerMap[buyer].silver++;
        }

        deptMap[dept].total++;
        vendorMap[vend].rejections++;
        buyerMap[buyer].rejections++;

        const reasonCat = categorizeReason(r.comments || '');
        if (!reasonMap[reasonCat]) reasonMap[reasonCat] = { rejections: 0, blue: 0, silver: 0 };
        reasonMap[reasonCat].rejections++;
        if (seal === 'Blue Seal') reasonMap[reasonCat].blue++;
        if (seal === 'Silver Seal') reasonMap[reasonCat].silver++;

        const sc = (r.styleCode || 'UNKNOWN').trim();
        const key = `${sc}_${seal}`;
        if (!styleMap.has(key)) {
          styleMap.set(key, { rows: [], sealType: seal });
        }
        styleMap.get(key)!.rows.push(r);
      }
    }

    // Build style records
    const records: RejectedStyleRecord[] = [];
    for (const [, { rows: sRows, sealType }] of styleMap.entries()) {
      if (!sRows || sRows.length === 0) continue;
      const first = sRows[0];
      const comments = sRows.map(r => (r.comments ? String(r.comments).trim() : '')).filter(Boolean);
      const uniqueComments = [...new Set(comments)];
      const primaryReason = uniqueComments.length > 0 ? uniqueComments.join(' | ') : categorizeReason(first.comments);

      const sc = first.styleCode || 'UNKNOWN';
      const totalSubs = filteredRows.filter(r => (r.styleCode || '').trim() === sc.trim() && r.sealType === sealType).length;
      const dates = sRows.map(r => r.date).filter(Boolean).sort();
      const latestDate = dates.length > 0 ? dates[dates.length - 1] : '—';

      records.push({
        styleCode: sc,
        styleName: first.styleName || sc,
        sealType,
        department: first.department || '—',
        brand: first.brand || '—',
        season: first.season || '—',
        drop: first.drop || '—',
        supplier: first.supplier || '—',
        rejectionCount: sRows.length,
        totalSubmissions: Math.max(totalSubs, sRows.length),
        primaryReason,
        allReasons: uniqueComments.length > 0 ? uniqueComments : [categorizeReason(first.comments)],
        date: latestDate,
      });
    }

    // Department Chart Data
    const deptChartData = Object.entries(deptMap)
      .filter(([, d]) => d.total > 0)
      .map(([name, d]) => ({
        name: name.length > 14 ? name.slice(0, 14) + '…' : name,
        fullName: name,
        'Blue Seal': d.blue,
        'Silver Seal': d.silver,
        total: d.total,
      }))
      .sort((a, b) => b.total - a.total);

    // Accountability Chart Data (Vendor or Buyer)
    const activeAccountabilityMap = accountabilityType === 'vendor' ? vendorMap : buyerMap;
    const accountabilityChartData = Object.entries(activeAccountabilityMap)
      .filter(([, d]) => d.rejections > 0)
      .map(([name, d]) => {
        const rate = d.totalSubmissions > 0 ? Math.round((d.rejections / d.totalSubmissions) * 1000) / 10 : 0;
        return {
          name: name.length > 15 ? name.slice(0, 15) + '…' : name,
          fullName: name,
          'Blue Seal': d.blue,
          'Silver Seal': d.silver,
          rejections: d.rejections,
          rate,
          totalSubmissions: d.totalSubmissions,
        };
      })
      .sort((a, b) => b.rejections - a.rejections)
      .slice(0, 8);

    // Reason Table Data
    const reasonTableData = Object.entries(reasonMap)
      .map(([reason, d]) => {
        const sharePct = totalRejected > 0 ? ((d.rejections / totalRejected) * 100).toFixed(1) : '0.0';
        return {
          reason,
          count: d.rejections,
          sharePct,
          blue: d.blue,
          silver: d.silver,
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      rejectedRecords: records,
      deptChartData,
      accountabilityChartData,
      reasonTableData,
      totalRejectedRows: totalRejected,
      blueRejectedCount: blueCount,
      silverRejectedCount: silverCount,
    };
  }, [filteredRows, accountabilityType]);

  // Overall Donut Data
  const overallDonutData = useMemo(() => {
    return [
      { name: 'Blue Seal', value: blueRejectedCount, color: 'var(--blue-seal)' },
      { name: 'Silver Seal', value: silverRejectedCount, color: 'var(--silver-seal)' },
    ].filter(d => d.value > 0);
  }, [blueRejectedCount, silverRejectedCount]);

  // Filtered styles for table
  const filteredStyles = useMemo(() => {
    return rejectedRecords.filter(item => {
      if (sealFilter !== 'all' && item.sealType !== sealFilter) return false;
      if (selectedReasonFilter !== 'all') {
        const matches = item.allReasons.some(r => categorizeReason(r) === selectedReasonFilter);
        if (!matches) return false;
      }
      if (selectedEntityFilter !== 'all') {
        if (accountabilityType === 'vendor' && item.supplier !== selectedEntityFilter) return false;
        if (accountabilityType === 'buyer' && item.brand !== selectedEntityFilter) return false;
      }
      if (search) {
        const q = search.trim().toLowerCase();
        const codeMatch = item.styleCode.toLowerCase().includes(q);
        const nameMatch = item.styleName.toLowerCase().includes(q);
        const vendMatch = item.supplier.toLowerCase().includes(q);
        const buyerMatch = item.brand.toLowerCase().includes(q);
        const deptMatch = item.department.toLowerCase().includes(q);
        const reasMatch = item.primaryReason.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !vendMatch && !buyerMatch && !deptMatch && !reasMatch) return false;
      }
      return true;
    });
  }, [rejectedRecords, sealFilter, selectedReasonFilter, selectedEntityFilter, accountabilityType, search]);

  // Sorted styles
  const sortedStyles = useMemo(() => {
    return [...filteredStyles].sort((a, b) => {
      let aVal: string | number = a[sortKey];
      let bVal: string | number = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const as = String(aVal).toLowerCase();
      const bs = String(bVal).toLowerCase();
      return sortDir === 'asc'
        ? as.localeCompare(bs, undefined, { numeric: true, sensitivity: 'base' })
        : bs.localeCompare(as, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [filteredStyles, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedStyles.length / PAGE_SIZE));
  const paginatedStyles = sortedStyles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'rejectionCount' ? 'desc' : 'asc'); }
    setPage(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const pageNums = (): (number | '…')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '…')[] = [1];
    if (page > 3) pages.push('…');
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) pages.push(p);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  };

  const overallRejectionRate = filteredRows.length > 0
    ? ((totalRejectedRows / filteredRows.length) * 100).toFixed(1)
    : '0.0';

  const cols: { key: SortKey; label: string }[] = [
    { key: 'sealType',        label: 'Seal Type' },
    { key: 'styleName',       label: 'Style Name' },
    { key: 'rejectionCount',  label: 'Rejections' },
    { key: 'primaryReason',   label: 'Reason / Rejection Details' },
    { key: 'supplier',        label: 'Vendor / Supplier' },
    { key: 'brand',           label: 'Brand / Buyer' },
    { key: 'department',      label: 'Department' },
    { key: 'date',            label: 'Inspection Date' },
  ];

  return (
    <div className="rejection-analysis-view" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Summary KPI Bar ── */}
      <div className="summary-bar" style={{ margin: 0 }}>
        <div className="summary-item">
          <span className="summary-item-label">Total Rejections</span>
          <span className="summary-item-value" style={{ color: '#ef4444' }}>
            {totalRejectedRows.toLocaleString()}
          </span>
          <span className="metric-sub" style={{ color: '#ef4444', fontWeight: 600 }}>
            {rejectedRecords.length} unique rejected styles
          </span>
        </div>

        <div className="summary-item">
          <span className="summary-item-label">Rejection Rate</span>
          <span className="summary-item-value" style={{ color: '#f59e0b' }}>
            {overallRejectionRate}%
          </span>
          <span className="metric-sub">
            across {filteredRows.length.toLocaleString()} sample evaluations
          </span>
        </div>

        <div className="summary-item">
          <span className="summary-item-label">Blue Seal Failures</span>
          <span className="summary-item-value" style={{ color: 'var(--blue-seal)' }}>
            {blueRejectedCount.toLocaleString()}
          </span>
          <span className="metric-sub" style={{ color: 'var(--blue-seal)', fontWeight: 600 }}>
            {totalRejectedRows > 0 ? ((blueRejectedCount / totalRejectedRows) * 100).toFixed(1) : '0.0'}% rejection share
          </span>
        </div>

        <div className="summary-item">
          <span className="summary-item-label">Silver Seal Failures</span>
          <span className="summary-item-value" style={{ color: 'var(--silver-seal)' }}>
            {silverRejectedCount.toLocaleString()}
          </span>
          <span className="metric-sub" style={{ color: 'var(--silver-seal)', fontWeight: 600 }}>
            {totalRejectedRows > 0 ? ((silverRejectedCount / totalRejectedRows) * 100).toFixed(1) : '0.0'}% rejection share
          </span>
        </div>
      </div>

      {/* ── SECTION 1: Overall Rejections & Department-wise Charts ── */}
      <div className="chart-cards-row">
        {/* Chart 1: Overall Rejection Share (Donut Chart) */}
        <div className="seal-card" style={{ flex: 1 }}>
          <div className="seal-card-header">
            <div className="seal-label">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span className="seal-name" style={{ color: 'var(--text-heading)' }}>Overall Rejections Distribution</span>
            </div>
            <span className="seal-total-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              {totalRejectedRows} Total Cases
            </span>
          </div>

          <div className="seal-card-body" style={{ padding: '20px 24px' }}>
            {totalRejectedRows === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                No rejection data recorded in this dataset selection.
              </div>
            ) : (
              <div style={{ height: 210 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={overallDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {overallDonutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) => {
                        const num = typeof val === 'number' ? val : Number(val) || 0;
                        return [`${num.toLocaleString()} rejections (${totalRejectedRows > 0 ? ((num / totalRejectedRows) * 100).toFixed(1) : 0}%)`, 'Count'];
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={10}
                      wrapperStyle={{ paddingTop: 8 }}
                      formatter={(value) => (
                        <span style={{ color: 'var(--text-heading)', fontSize: '0.8rem', fontWeight: 700 }}>{String(value)}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Department-wise Rejections Bar Chart */}
        <div className="seal-card" style={{ flex: 1.3 }}>
          <div className="seal-card-header">
            <div className="seal-label">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
              <span className="seal-name" style={{ color: 'var(--text-heading)' }}>Department-wise Rejections Chart</span>
            </div>
            <span className="seal-total-badge">
              {deptChartData.length} Departments
            </span>
          </div>

          <div className="seal-card-body" style={{ padding: '20px 24px' }}>
            {deptChartData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                No departmental rejection data available.
              </div>
            ) : (
              <div style={{ height: 210 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                    <Tooltip
                      formatter={(val: unknown, name: unknown) => [`${val} rejections`, String(name)]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || String(label)}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 6, fontSize: '0.75rem' }} />
                    <Bar dataKey="Blue Seal" fill="var(--blue-seal)" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="Silver Seal" fill="var(--silver-seal)" radius={[4, 4, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Rejection Reason Table & Accountability Graph Side-by-Side ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20 }}>
        {/* Left Side: Rejection Reason Table */}
        <div className="card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-heading)', margin: '0 0 4px 0' }}>
                Rejection Reason Breakdown Table
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Technical defect categories and case counts
              </p>
            </div>
            {selectedReasonFilter !== 'all' && (
              <button
                className="btn btn-xs btn-outline"
                onClick={() => setSelectedReasonFilter('all')}
                style={{ color: '#ef4444', borderColor: '#fca5a5' }}
              >
                Clear Reason ({selectedReasonFilter}) ✕
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table className="analysis-table" style={{ width: '100%', fontSize: '0.825rem' }}>
              <thead>
                <tr>
                  <th>Reason Category</th>
                  <th style={{ textAlign: 'right' }}>Rejections</th>
                  <th style={{ textAlign: 'right' }}>Share (%)</th>
                  <th style={{ textAlign: 'center' }}>Blue / Silver</th>
                </tr>
              </thead>
              <tbody>
                {reasonTableData.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                      No rejection reasons recorded.
                    </td>
                  </tr>
                ) : (
                  reasonTableData.map((r, idx) => {
                    const isSelected = selectedReasonFilter === r.reason;
                    const color = PALETTE[idx % PALETTE.length];
                    return (
                      <tr
                        key={r.reason}
                        onClick={() => setSelectedReasonFilter(isSelected ? 'all' : r.reason)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.08)' : undefined,
                        }}
                        title="Click to filter rejected styles table"
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                            <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{r.reason}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#ef4444' }}>
                          {r.count}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {r.sharePct}%
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--blue-seal)', fontWeight: 700 }}>{r.blue}</span>
                          {' / '}
                          <span style={{ color: 'var(--silver-seal)', fontWeight: 700 }}>{r.silver}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Accountability Graph (Vendor / Buyer Chart) */}
        <div className="card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-heading)', margin: '0 0 4px 0' }}>
                Accountability Graph
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                {accountabilityType === 'vendor' ? 'Vendor / Factory defect accountability' : 'Buyer / Brand failure distribution'}
              </p>
            </div>

            {/* Toggle Vendor vs Buyer Chart */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
              <button
                className={`btn btn-xs ${accountabilityType === 'vendor' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => {
                  setAccountabilityType('vendor');
                  setSelectedEntityFilter('all');
                }}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              >
                Vendor
              </button>
              <button
                className={`btn btn-xs ${accountabilityType === 'buyer' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => {
                  setAccountabilityType('buyer');
                  setSelectedEntityFilter('all');
                }}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              >
                Buyer
              </button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 250 }}>
            {accountabilityChartData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                No accountability data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={accountabilityChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} width={100} />
                  <Tooltip
                    formatter={(val: unknown, name: unknown) => [`${val} rejections`, String(name)]}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || String(label)}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 4, fontSize: '0.75rem' }} />
                  <Bar dataKey="Blue Seal" fill="var(--blue-seal)" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Silver Seal" fill="var(--silver-seal)" stackId="a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 3: Standard Rejected Styles Table (Just like AnalysisTable) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span className="filter-label">Show</span>
        {(['all', 'Blue Seal', 'Silver Seal'] as const).map(opt => (
          <button
            key={opt}
            id={`rejection-seal-filter-${opt.replace(/ /g, '-').toLowerCase()}`}
            className={`btn btn-sm ${sealFilter === opt ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => {
              setSealFilter(opt);
              setPage(1);
            }}
          >
            {opt === 'all' ? 'All Seals' : opt}
          </button>
        ))}

        {selectedReasonFilter !== 'all' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 700, color: '#ef4444' }}>
            <span>Filtered Reason: {selectedReasonFilter}</span>
            <button onClick={() => setSelectedReasonFilter('all')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 800, padding: 0 }}>✕</button>
          </span>
        )}

        <span className="table-count" style={{ marginLeft: 'auto' }}>
          {sortedStyles.length.toLocaleString()} rejected styles
        </span>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <input
            id="rejection-table-search"
            className="search-input"
            placeholder="Search style code, vendor, buyer, reason…"
            value={search}
            onChange={handleSearch}
          />
          <span className="table-count">
            {sortedStyles.length.toLocaleString()} styles · page {page} of {totalPages}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                {cols.map(c => (
                  <th key={c.key} onClick={() => handleSort(c.key)} style={{ cursor: 'pointer' }}>
                    {c.label}
                    <SortIcon active={sortKey === c.key} dir={sortDir} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedStyles.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                      </div>
                      <strong>No rejected styles found</strong>
                      <span style={{ fontSize: '0.8125rem' }}>Try a different search query or clear filters.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStyles.map((s, i) => (
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
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          color: '#ef4444',
                          background: '#fef2f2',
                          border: '1px solid #fee2e2',
                          padding: '3px 9px',
                          borderRadius: '12px',
                        }}
                      >
                        {s.rejectionCount} {s.rejectionCount === 1 ? 'time' : 'times'}
                      </span>
                    </td>
                    <td style={{ maxWidth: '320px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#991b1b',
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          lineHeight: 1.4,
                        }}
                      >
                        {s.primaryReason}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                      {s.supplier || '—'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.brand || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.department || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {formatDateDisplay(s.date)}
                    </td>
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
