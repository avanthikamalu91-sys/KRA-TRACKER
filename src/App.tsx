// App.tsx – Tech Analysis Dashboard with SalesHub-style layout
import React, { useState, useMemo, useCallback } from 'react';
import FileUpload from './components/FileUpload';
import FilterBar from './components/FilterBar';
import SealSummary from './components/SealSummary';
import AnalysisTable from './components/AnalysisTable';
import BreakdownTable from './components/BreakdownTable';
import RFTChart from './components/RFTChart';
import VendorPerformance from './components/VendorPerformance';
import PendingSamples from './components/PendingSamples';
import SampleTracking from './components/SampleTracking';
import RejectionAnalysis from './components/RejectionAnalysis';
import { parseExcelFile, isParseError } from './utils/excelParser';
import {
  normalizeRows,
  extractFilterOptions,
  computeDashboard,
  computeBreakdown,
  type NormalizedRow,
  type FilterOptions,
  type ActiveFilters,
  type DashboardMetrics,
  type SealType,
  formatDateDisplay,
} from './utils/dataUtils';

type AppState = 'idle' | 'loading' | 'ready' | 'error';
type NavItem = 'overview' | 'tracking' | 'rejection' | 'pending' | 'vendor' | 'breakdown' | 'detail';

const DEFAULT_FILTERS: ActiveFilters = {
  department: '',
  brand: '',
  season: '',
  drop: '',
  startDate: '',
  endDate: '',
};

// ── Sidebar Icon SVGs ────────────────────────────────────────
function IconGrid() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  );
}
function IconBarChart() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}
function IconTable() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
      <line x1="9" y1="9" x2="9" y2="21"/>
    </svg>
  );
}
function IconLayers() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  );
}
function IconUpload() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}
function IconSettings() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function IconCalendarCheck() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <path d="m9 16 2 2 4-4"/>
    </svg>
  );
}

function IconXCircle() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  );
}

export default function App() {
  const [appState,     setAppState]     = useState<AppState>('idle');
  const [error,        setError]        = useState<string>('');
  const [fileName,     setFileName]     = useState<string>('');
  const [rows,         setRows]         = useState<NormalizedRow[]>([]);
  const [filterOpts,   setFilterOpts]   = useState<FilterOptions>({ departments: [], brands: [], seasons: [], drops: [], hasDates: false });
  const [filters,      setFilters]      = useState<ActiveFilters>(DEFAULT_FILTERS);
  const [activeNav,    setActiveNav]    = useState<NavItem>('overview');
  const [sealFilter,   setSealFilter]   = useState<'all' | SealType>('all');
  const [breakdownDim, setBreakdownDim] = useState<'department' | 'brand' | 'season' | 'drop'>('season');
  const [detailSortKey, setDetailSortKey] = useState<'styleCode' | 'styleName' | 'sealType' | 'occurrences' | 'isRFT' | 'primaryStatus' | 'department' | 'brand' | 'season' | 'drop' | 'date'>('styleName');
  const [detailSortDir, setDetailSortDir] = useState<'asc' | 'desc'>('asc');

  const handleFile = useCallback(async (file: File) => {
    setAppState('loading');
    setError('');
    setFileName(file.name);
    setFilters(DEFAULT_FILTERS);
    const result = await parseExcelFile(file);
    if (isParseError(result)) {
      setError(result.message);
      setAppState('error');
      return;
    }
    const normalized = normalizeRows(result.rows);
    const opts       = extractFilterOptions(normalized);
    setRows(normalized);
    setFilterOpts(opts);
    setFilters({
      ...DEFAULT_FILTERS,
      startDate: opts.minDate || '',
      endDate: opts.maxDate || '',
    });
    setAppState('ready');
    setActiveNav('overview');
  }, []);

  const dashboard: DashboardMetrics = useMemo(() => {
    if (!rows.length) {
      const empty = { totalRows: 0, totalUniqueStyles: 0, approved: 0, rejected: 0, pending: 0, other: 0, rftCount: 0, notRftCount: 0, rftPercent: 0, styleDetails: [] };
      return { blueSeal: empty, silverSeal: empty, totalRows: 0 };
    }
    return computeDashboard(rows, filters);
  }, [rows, filters]);

  const breakdownRows = useMemo(() => {
    if (!rows.length) return [];
    return computeBreakdown(rows, breakdownDim, filters);
  }, [rows, breakdownDim, filters]);

  const totalStyles   = dashboard.blueSeal.totalUniqueStyles + dashboard.silverSeal.totalUniqueStyles;
  const totalRFT      = dashboard.blueSeal.rftCount + dashboard.silverSeal.rftCount;
  const overallRFTPct = totalStyles > 0 ? ((totalRFT / totalStyles) * 100).toFixed(1) : '0.0';

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentUser = {
    name: 'Technical & Quality Team',
    role: 'Quality Administrator',
    email: 'admin@kratracker.com',
  };

  const navItems: { id: NavItem; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { id: 'overview',  label: 'Overview',           icon: <IconGrid /> },
    { id: 'breakdown', label: 'Breakdown',          icon: <IconLayers /> },
    { id: 'tracking',  label: 'Sample Tracking',    icon: <IconCalendarCheck /> },
    { id: 'pending',   label: 'Pending Samples',    icon: <IconClock /> },
    { id: 'vendor',    label: 'Vendor Performance', icon: <IconBarChart /> },
    { id: 'rejection', label: 'Rejection Analysis', icon: <IconXCircle /> },
    { id: 'detail',    label: 'Style Detail',       icon: <IconTable /> },
  ];

  const dateRangeSubtitle = useMemo(() => {
    if (!rows.length) return '';
    const minD = filters.startDate || filterOpts.minDate;
    const maxD = filters.endDate || filterOpts.maxDate;

    if (minD && maxD) {
      if (minD === maxD) {
        return formatDateDisplay(minD);
      }
      return `${formatDateDisplay(minD)} – ${formatDateDisplay(maxD)}`;
    }
    if (minD) return formatDateDisplay(minD);
    if (maxD) return formatDateDisplay(maxD);
    return 'All Dates';
  }, [rows.length, filterOpts.minDate, filterOpts.maxDate, filters.startDate, filters.endDate]);

  const handleNavClick = (id: NavItem) => {
    setActiveNav(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="app-shell">

      {/* ── Mobile Sidebar Overlay Backdrop ── */}
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ═══════════════════════════════════════
          SIDEBAR (Desktop & Mobile Slide Drawer)
      ═══════════════════════════════════════ */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <img
            src="/logo.jpg"
            alt="Z - TRACK Logo"
            className="sidebar-logo-img"
          />
          <span className="sidebar-logo-text">
            Z - TRACK
            <span className="sidebar-logo-sub">ZUDIO QUALITY</span>
          </span>
          <button
            type="button"
            className="mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Menu */}
        <span className="sidebar-section-label">Menu</span>
        <nav className="sidebar-nav">
          {appState === 'ready' ? (
            navItems.map(item => (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                {item.icon}
                {item.label}
              </button>
            ))
          ) : (
            navItems.map(item => (
              <button
                key={item.id}
                className="nav-item"
                style={{ opacity: 0.4, cursor: 'not-allowed' }}
                disabled
              >
                {item.icon}
                {item.label}
              </button>
            ))
          )}
        </nav>

        {/* Tools */}
        <span className="sidebar-section-label">Tools</span>
        <nav className="sidebar-nav">
          <button
            className="nav-item"
            onClick={() => {
              setMobileMenuOpen(false);
              if (appState === 'ready') {
                setAppState('idle');
                setRows([]);
                setFilters(DEFAULT_FILTERS);
              } else {
                document.getElementById('excel-file-input')?.click();
              }
            }}
          >
            <IconUpload />
            {appState === 'ready' ? 'Change File' : 'Upload File'}
          </button>
          {appState === 'ready' && (
            <button
              className="nav-item"
              onClick={() => {
                setMobileMenuOpen(false);
                window.print();
              }}
              title="Export dashboard as PDF"
            >
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export PDF
            </button>
          )}
        </nav>

        <div className="sidebar-spacer" />
      </aside>

      {/* ═══════════════════════════════════════
          MAIN AREA
      ═══════════════════════════════════════ */}
      <div className="main-area">

        {/* ── Top Bar ── */}
        <div className="topbar">
          <div className="topbar-left">
            {/* Hamburger Button for Mobile / Tablet */}
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
              title="Open Navigation Menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div>
              <div className="topbar-title">
                {activeNav === 'overview'  && 'Performance Overview'}
                {activeNav === 'tracking'  && 'Sample Tracking'}
                {activeNav === 'rejection' && 'Rejection Analysis & Defect Breakdown'}
                {activeNav === 'pending'   && 'Pending Samples'}
                {activeNav === 'vendor'    && 'Vendor Performance'}
                {activeNav === 'breakdown' && 'Performance Breakdown'}
                {activeNav === 'detail'    && 'Style Detail Analysis'}
                {appState !== 'ready'      && 'Performance Overview'}
              </div>
              <div className="topbar-subtitle">
                {appState === 'ready' ? (
                  <>
                    <span className="topbar-subtitle-pill">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {dateRangeSubtitle}
                    </span>
                    <span className="topbar-subtitle-dot">·</span>
                    <span className="topbar-subtitle-filename">{fileName}</span>
                  </>
                ) : (
                  'Upload a dataset to view analytics'
                )}
              </div>
            </div>
          </div>

          <div className="topbar-right">
            {appState === 'ready' && (
              <button
                id="btn-export-pdf"
                className="btn btn-primary btn-sm btn-export-desktop"
                onClick={() => window.print()}
                title="Export current dashboard view as PDF"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export PDF
              </button>
            )}
            <div className="topbar-user" title="Technical & Quality Team">
              <div className="topbar-avatar">{currentUser.name.slice(0, 2).toUpperCase()}</div>
              <div className="topbar-user-info">
                <span className="topbar-user-name">{currentUser.name}</span>
                <span className="topbar-user-role">{currentUser.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="content">

          {/* ── Upload / Loading ── */}
          {(appState === 'idle' || appState === 'loading') && (
            <FileUpload onFileSelected={handleFile} loading={appState === 'loading'} />
          )}

          {/* ── Error ── */}
          {appState === 'error' && (
            <>
              <div className="error-banner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span><strong>Upload Error:</strong> {error}</span>
              </div>
              <FileUpload onFileSelected={handleFile} />
            </>
          )}

          {/* ── Dashboard ── */}
          {appState === 'ready' && (
            <>
              {/* Filter Bar */}
              <FilterBar options={filterOpts} filters={filters} onChange={setFilters} rows={rows} />

              {/* Summary row — like the 4 small KPI cards at top of SalesHub */}
              <div className="summary-bar">
                <div className="summary-item">
                  <span className="summary-item-label">Total Samples</span>
                  <span className="summary-item-value">{rows.length.toLocaleString()}</span>
                  <span className="metric-sub">All dataset rows</span>
                </div>
                <div className="summary-item">
                  <span className="summary-item-label">Filtered</span>
                  <span className="summary-item-value">{dashboard.totalRows.toLocaleString()}</span>
                  <span className="metric-sub">Active selection</span>
                </div>
                <div className="summary-item">
                  <span className="summary-item-label">Unique Styles</span>
                  <span className="summary-item-value">{totalStyles.toLocaleString()}</span>
                  <span className="metric-sub">Blue & Silver combined</span>
                </div>
                <div className="summary-item">
                  <span className="summary-item-label">Overall RFT</span>
                  <span className="summary-item-value" style={{ color: 'var(--green-text)' }}>
                    {overallRFTPct}%
                  </span>
                  <span className="metric-sub" style={{ color: 'var(--green-text)', fontWeight: 600 }}>
                    {totalRFT} of {totalStyles} RFT
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-item-label">Blue Styles</span>
                  <span className="summary-item-value" style={{ color: 'var(--blue-seal)' }}>
                    {dashboard.blueSeal.totalUniqueStyles.toLocaleString()}
                  </span>
                  <span className="metric-sub" style={{ color: 'var(--blue-seal)', fontWeight: 600 }}>
                    {dashboard.blueSeal.rftPercent.toFixed(1)}% RFT
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-item-label">Silver Styles</span>
                  <span className="summary-item-value" style={{ color: 'var(--silver-seal)' }}>
                    {dashboard.silverSeal.totalUniqueStyles.toLocaleString()}
                  </span>
                  <span className="metric-sub" style={{ color: 'var(--silver-seal)', fontWeight: 600 }}>
                    {dashboard.silverSeal.rftPercent.toFixed(1)}% RFT
                  </span>
                </div>
              </div>

              {/* ── OVERVIEW TAB ── */}
              { activeNav === 'overview' && (
                  <>
                    <div className="section-title">Seal Performance Summary</div>
                    <div className="kpi-grid">
                      <SealSummary sealType="Blue Seal"   metrics={dashboard.blueSeal} />
                      <SealSummary sealType="Silver Seal" metrics={dashboard.silverSeal} />
                    </div>

                  <div className="section-title">RFT Distribution</div>
                  <div className="chart-cards-row">
                    {/* Blue RFT Chart card */}
                    <div className="seal-card blue-card">
                      <div className="seal-card-header">
                        <div className="seal-label">
                          <span className="seal-name">Blue Seal — RFT</span>
                        </div>
                        <span className="seal-total-badge">
                          {dashboard.blueSeal.rftPercent.toFixed(1)}% RFT
                        </span>
                      </div>
                      <div className="seal-card-body">
                        <RFTChart metrics={dashboard.blueSeal}   sealType="Blue Seal" />
                      </div>
                    </div>

                    {/* Silver RFT Chart card */}
                    <div className="seal-card silver-card">
                      <div className="seal-card-header">
                        <div className="seal-label">
                          <span className="seal-name">Silver Seal — RFT</span>
                        </div>
                        <span className="seal-total-badge">
                          {dashboard.silverSeal.rftPercent.toFixed(1)}% RFT
                        </span>
                      </div>
                      <div className="seal-card-body">
                        <RFTChart metrics={dashboard.silverSeal} sealType="Silver Seal" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── DETAIL TAB ── */}
              {activeNav === 'detail' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <span className="filter-label">Show</span>
                    {(['all', 'Blue Seal', 'Silver Seal'] as const).map(opt => (
                      <button
                        key={opt}
                        id={`seal-filter-${opt.replace(/ /g, '-').toLowerCase()}`}
                        className={`btn btn-sm ${sealFilter === opt ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setSealFilter(opt)}
                      >
                        {opt === 'all' ? 'All Seals' : opt}
                      </button>
                    ))}

                    {/* Season sort */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12, borderLeft: '1px solid var(--border)', paddingLeft: 12 }}>
                      <span className="filter-label">Season</span>
                      <button
                        className={`btn btn-sm ${detailSortKey === 'season' && detailSortDir === 'asc' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => { setDetailSortKey('season'); setDetailSortDir('asc'); }}
                        title="Season A → Z"
                      >
                        A → Z
                      </button>
                      <button
                        className={`btn btn-sm ${detailSortKey === 'season' && detailSortDir === 'desc' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => { setDetailSortKey('season'); setDetailSortDir('desc'); }}
                        title="Season Z → A"
                      >
                        Z → A
                      </button>
                    </div>

                    <span className="table-count" style={{ marginLeft: 'auto' }}>
                      {(sealFilter === 'all'
                        ? dashboard.blueSeal.styleDetails.length + dashboard.silverSeal.styleDetails.length
                        : sealFilter === 'Blue Seal'
                          ? dashboard.blueSeal.styleDetails.length
                          : dashboard.silverSeal.styleDetails.length
                      ).toLocaleString()} styles
                    </span>
                  </div>
                  <AnalysisTable
                    blueSealStyles={dashboard.blueSeal.styleDetails}
                    silverSealStyles={dashboard.silverSeal.styleDetails}
                    sealFilter={sealFilter}
                    initialSortKey={detailSortKey}
                    initialSortDir={detailSortDir}
                  />
                </>
              )}

              {/* ── BREAKDOWN TAB ── */}
              {activeNav === 'breakdown' && (
                <BreakdownTable
                  rows={breakdownRows}
                  dimension={breakdownDim}
                  onDimensionChange={setBreakdownDim}
                  allRows={rows}
                  filters={filters}
                />
              )}
              {activeNav === 'tracking' && (
                <SampleTracking rows={rows} filters={filters} />
              )}
              {activeNav === 'rejection' && (
                <RejectionAnalysis rows={rows} filters={filters} />
              )}
              {activeNav === 'pending' && (
                <PendingSamples rows={rows} filters={filters} />
              )}
              {activeNav === 'vendor' && (
                <VendorPerformance rows={rows} filters={filters} />
              )}
            </>
          )}
        </div>

        {/* ── Mobile Bottom Quick Navigation Bar ── */}
        {appState === 'ready' && (
          <nav className="mobile-bottom-nav">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`mobile-bottom-btn ${activeNav === item.id ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
                title={item.label}
              >
                {item.icon}
                <span>{item.label.split(' ')[0]}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
