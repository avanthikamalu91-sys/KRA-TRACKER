// FilterBar.tsx – Cohesive Date Pill with Day/Month/Year Popover Picker
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { type FilterOptions, type ActiveFilters, type NormalizedRow, formatDateDisplay } from '../utils/dataUtils';

interface Props {
  options: FilterOptions;
  filters: ActiveFilters;
  onChange: (filters: ActiveFilters) => void;
  rows?: NormalizedRow[];
}

const MONTHS = [
  { val: '01', label: '01 - Jan' },
  { val: '02', label: '02 - Feb' },
  { val: '03', label: '03 - Mar' },
  { val: '04', label: '04 - Apr' },
  { val: '05', label: '05 - May' },
  { val: '06', label: '06 - Jun' },
  { val: '07', label: '07 - Jul' },
  { val: '08', label: '08 - Aug' },
  { val: '09', label: '09 - Sep' },
  { val: '10', label: '10 - Oct' },
  { val: '11', label: '11 - Nov' },
  { val: '12', label: '12 - Dec' },
];

function getDaysInMonth(yearStr: string, monthStr: string): number {
  if (!yearStr || !monthStr) return 31;
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  if (isNaN(y) || isNaN(m)) return 31;
  return new Date(y, m, 0).getDate();
}

function parseDateParts(dateStr: string) {
  if (!dateStr || !dateStr.includes('-')) {
    return { year: '', month: '', day: '' };
  }
  const parts = dateStr.split('-');
  return {
    year: parts[0] || '',
    month: parts[1] || '',
    day: parts[2] || '',
  };
}

interface DatePickerPillProps {
  label: 'From' | 'To';
  value: string;
  defaultDate: string;
  onChange: (val: string) => void;
  availableYears: string[];
}

function DatePickerPill({
  label,
  value,
  defaultDate,
  onChange,
  availableYears,
}: DatePickerPillProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const activeDate = value || defaultDate || '';
  const parts = useMemo(() => parseDateParts(activeDate), [activeDate]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const daysCount = getDaysInMonth(parts.year, parts.month);
  const days = useMemo(() => Array.from({ length: daysCount }, (_, i) => String(i + 1).padStart(2, '0')), [daysCount]);

  const handlePartChange = (part: 'day' | 'month' | 'year', val: string) => {
    let year = parts.year || defaultDate?.slice(0, 4) || '2024';
    let month = parts.month || (label === 'From' ? '01' : '12');
    let day = parts.day || (label === 'From' ? '01' : '31');

    if (part === 'year') year = val;
    if (part === 'month') month = val;
    if (part === 'day') day = val;

    const maxDays = getDaysInMonth(year, month);
    if (parseInt(day, 10) > maxDays) day = String(maxDays).padStart(2, '0');

    const newDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    onChange(newDate);
  };

  const formattedDisplay = formatDateDisplay(activeDate);

  return (
    <div className="date-picker-anchor" ref={popoverRef}>
      <button
        type="button"
        id={`filter-${label.toLowerCase()}-btn`}
        className={`date-pill-btn ${value && value !== defaultDate ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={`Click to change ${label} date (Day, Month, Year)`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span className="date-pill-label">{label}:</span>
        <span className="date-pill-value">{formattedDisplay !== '—' ? formattedDisplay : 'Select Date'}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {isOpen && (
        <div className="date-picker-popover">
          <div className="popover-header">
            <span className="popover-title">{label === 'From' ? 'From Date' : 'To Date'}</span>
            <span className="popover-badge">{formattedDisplay}</span>
          </div>

          <div className="popover-selectors-row">
            {/* Day */}
            <div className="popover-select-field">
              <label className="popover-field-label">Day</label>
              <select
                className="filter-select-mini"
                value={parts.day}
                onChange={e => handlePartChange('day', e.target.value)}
              >
                {days.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div className="popover-select-field">
              <label className="popover-field-label">Month</label>
              <select
                className="filter-select-mini"
                value={parts.month}
                onChange={e => handlePartChange('month', e.target.value)}
              >
                {MONTHS.map(m => (
                  <option key={m.val} value={m.val}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div className="popover-select-field">
              <label className="popover-field-label">Year</label>
              <select
                className="filter-select-mini"
                value={parts.year}
                onChange={e => handlePartChange('year', e.target.value)}
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="popover-footer">
            {defaultDate && (
              <button
                type="button"
                className="popover-quick-btn"
                onClick={() => {
                  onChange(defaultDate);
                }}
                title="Reset to default date"
              >
                Default: {formatDateDisplay(defaultDate)}
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary btn-xs"
              style={{ marginLeft: 'auto' }}
              onClick={() => setIsOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FilterBar({ options, filters, onChange, rows }: Props) {
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    const extractYear = (d?: string) => d && d.includes('-') ? d.split('-')[0] : '';
    
    const minY = extractYear(options.minDate);
    const maxY = extractYear(options.maxDate);
    
    const startY = minY ? parseInt(minY, 10) : 2023;
    const endY = maxY ? parseInt(maxY, 10) : 2026;
    
    for (let y = Math.min(startY, 2021); y <= Math.max(endY, 2028); y++) {
      set.add(String(y));
    }
    return [...set].sort();
  }, [options.minDate, options.maxDate]);

  // Dynamically filter Brand / Division list based on selected Department
  const availableBrands = useMemo(() => {
    if (!filters.department || !rows || rows.length === 0) {
      return options.brands;
    }
    const deptRows = rows.filter(r => r.department === filters.department);
    const brands = [...new Set(deptRows.map(r => r.brand).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
    return brands.length > 0 ? brands : options.brands;
  }, [filters.department, rows, options.brands]);

  const activeStartDate = filters.startDate || options.minDate || '';
  const activeEndDate = filters.endDate || options.maxDate || '';

  const isCustomDateRange = 
    (filters.startDate && filters.startDate !== options.minDate) ||
    (filters.endDate && filters.endDate !== options.maxDate);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const hasActive =
    filters.department !== '' ||
    filters.brand !== '' ||
    filters.season !== '' ||
    filters.drop !== '' ||
    isCustomDateRange;

  const reset = () => {
    setIsRefreshing(true);
    onChange({
      department: '',
      brand: '',
      season: '',
      drop: '',
      startDate: options.minDate || '',
      endDate: options.maxDate || '',
    });
    setTimeout(() => setIsRefreshing(false), 450);
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDept = e.target.value;
    if (!newDept) {
      onChange({ ...filters, department: '' });
      return;
    }
    // If the currently selected brand is not in the new department, clear it
    if (rows && rows.length > 0 && filters.brand) {
      const deptRows = rows.filter(r => r.department === newDept);
      const validBrands = new Set(deptRows.map(r => r.brand).filter(Boolean));
      if (!validBrands.has(filters.brand)) {
        onChange({ ...filters, department: newDept, brand: '' });
        return;
      }
    }
    onChange({ ...filters, department: newDept });
  };

  const update = (key: keyof ActiveFilters) => (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => onChange({ ...filters, [key]: e.target.value });

  return (
    <div className="filter-bar">
      <span className="filter-label">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        </svg>
        Filters
      </span>

      <div className="filter-group">
        {/* Department */}
        <select
          id="filter-department"
          className={`filter-select ${filters.department ? 'active' : ''}`}
          value={filters.department}
          onChange={handleDepartmentChange}
          title="Filter by Department"
        >
          <option value="">All Departments</option>
          {options.departments.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {/* Brand / Division (Cascades based on selected Department) */}
        <select
          id="filter-brand"
          className={`filter-select ${filters.brand ? 'active' : ''}`}
          value={filters.brand}
          onChange={update('brand')}
          title="Filter by Brand / Division"
        >
          <option value="">All Brands / Divisions</option>
          {availableBrands.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        {/* Season */}
        <select
          id="filter-season"
          className={`filter-select ${filters.season ? 'active' : ''}`}
          value={filters.season}
          onChange={update('season')}
          title="Filter by Generic Season"
        >
          <option value="">All Seasons</option>
          {options.seasons.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Drop */}
        <select
          id="filter-drop"
          className={`filter-select ${filters.drop ? 'active' : ''}`}
          value={filters.drop}
          onChange={update('drop')}
          title="Filter by Drop"
          disabled={options.drops.length === 0}
        >
          <option value="">All Drops</option>
          {options.drops.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {/* Unified Date Range Controls (Together: From DD/MM/YYYY → To DD/MM/YYYY) */}
        <div className={`filter-date-unified-group ${isCustomDateRange ? 'active' : ''}`}>
          <DatePickerPill
            label="From"
            value={filters.startDate}
            defaultDate={options.minDate || ''}
            onChange={newD => onChange({ ...filters, startDate: newD })}
            availableYears={availableYears}
          />
          <span className="filter-date-arrow">→</span>
          <DatePickerPill
            label="To"
            value={filters.endDate}
            defaultDate={options.maxDate || ''}
            onChange={newD => onChange({ ...filters, endDate: newD })}
            availableYears={availableYears}
          />
        </div>

        {/* Refresh / Reset Button (Icon-only) */}
        <button
          type="button"
          id="btn-refresh-filters"
          className={`filter-refresh-btn ${hasActive ? 'has-active' : ''} ${isRefreshing ? 'spinning' : ''}`}
          onClick={reset}
          title="Reset all filters back to All"
          aria-label="Reset all filters"
        >
          <svg className="filter-refresh-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>
    </div>
  );
}
