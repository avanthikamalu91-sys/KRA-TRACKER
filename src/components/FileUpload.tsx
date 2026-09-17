// FileUpload.tsx – Dual Upload Interface for Sample Performance Data & Critical Path Calendar
import React, { useRef, useState } from 'react';

interface Props {
  onSampleFileSelected: (file: File) => void;
  onCalendarFileSelected?: (file: File) => void;
  onProceed?: () => void;
  sampleFileName?: string;
  sampleRowCount?: number;
  calendarFileName?: string;
  calendarDropCount?: number;
  loading?: boolean;
}

export default function FileUpload({
  onSampleFileSelected,
  onCalendarFileSelected,
  onProceed,
  sampleFileName,
  sampleRowCount,
  calendarFileName,
  calendarDropCount,
  loading,
}: Props) {
  const sampleInputRef = useRef<HTMLInputElement>(null);
  const calendarInputRef = useRef<HTMLInputElement>(null);
  const [sampleDragOver, setSampleDragOver] = useState(false);
  const [calDragOver, setCalDragOver] = useState(false);

  const validateExcel = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
      alert('Please upload a valid Excel or CSV file (.xlsx, .xls, .csv)');
      return false;
    }
    return true;
  };

  const handleSampleFile = (file: File) => {
    if (validateExcel(file)) {
      onSampleFileSelected(file);
    }
  };

  const handleCalendarFile = (file: File) => {
    if (validateExcel(file) && onCalendarFileSelected) {
      onCalendarFileSelected(file);
    }
  };

  return (
    <div className="dual-upload-container">
      <div className="upload-header-banner">
        <h1 className="upload-main-title">Z - TRACK Intelligence & Analytics</h1>
        <p className="upload-main-subtitle">
          Upload your Sample Performance Data and Critical Path Calendar to calculate accurate On-Time Sealing & RFT milestones.
        </p>
      </div>

      <div className="dual-upload-grid">
        {/* ── CARD 1: Sample Data (Required) ── */}
        <div
          className={`upload-card-box ${sampleDragOver ? 'drag-over' : ''} ${sampleFileName ? 'loaded' : ''}`}
          onClick={() => !loading && sampleInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setSampleDragOver(true); }}
          onDragLeave={() => setSampleDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSampleDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleSampleFile(file);
          }}
        >
          <input
            ref={sampleInputRef}
            id="sample-file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleSampleFile(f);
              e.target.value = '';
            }}
            style={{ display: 'none' }}
          />

          <div className="upload-card-badge primary">Step 1 · Required</div>

          <div className="upload-icon-circle">
            {loading ? (
              <div className="loading-spinner" />
            ) : sampleFileName ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--brand-600)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9,15 12,12 15,15" />
              </svg>
            )}
          </div>

          <h3 className="upload-card-title">1. Upload Sample Data</h3>

          {sampleFileName ? (
            <div className="upload-file-status success">
              <span className="file-status-icon">✓</span>
              <div className="file-status-info">
                <span className="file-status-name" title={sampleFileName}>{sampleFileName}</span>
                {sampleRowCount !== undefined && (
                  <span className="file-status-sub">{sampleRowCount.toLocaleString()} records</span>
                )}
              </div>
              <button
                type="button"
                className="btn-link-action"
                onClick={(e) => {
                  e.stopPropagation();
                  sampleInputRef.current?.click();
                }}
              >
                Replace
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={(e) => { e.stopPropagation(); sampleInputRef.current?.click(); }}
            >
              Select Sample Excel
            </button>
          )}

          <span className="upload-supported-tag">Formats: .xlsx, .xls, .csv</span>
        </div>

        {/* ── CARD 2: Critical Path / Delivery Calendar (Recommended) ── */}
        <div
          className={`upload-card-box ${calDragOver ? 'drag-over' : ''} ${calendarFileName ? 'loaded' : ''}`}
          onClick={() => !loading && calendarInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setCalDragOver(true); }}
          onDragLeave={() => setCalDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setCalDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleCalendarFile(file);
          }}
        >
          <input
            ref={calendarInputRef}
            id="calendar-file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleCalendarFile(f);
              e.target.value = '';
            }}
            style={{ display: 'none' }}
          />

          <div className="upload-card-badge secondary">Step 2 · Delivery Calendar</div>

          <div className="upload-icon-circle calendar">
            {calendarFileName ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="m9 16 2 2 4-4" />
              </svg>
            )}
          </div>

          <h3 className="upload-card-title">2. Upload Delivery Calendar</h3>

          {calendarFileName ? (
            <div className="upload-file-status success">
              <span className="file-status-icon">✓</span>
              <div className="file-status-info">
                <span className="file-status-name" title={calendarFileName}>{calendarFileName}</span>
              </div>
              <button
                type="button"
                className="btn-link-action"
                onClick={(e) => {
                  e.stopPropagation();
                  calendarInputRef.current?.click();
                }}
              >
                Replace
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={(e) => { e.stopPropagation(); calendarInputRef.current?.click(); }}
            >
              Select Calendar File
            </button>
          )}

          <span className="upload-supported-tag">Formats: .xlsx, .xls, .csv</span>
        </div>
      </div>

      {/* Action Footer when files are ready */}
      <div className="upload-action-footer">
        {sampleFileName ? (
          <div className="upload-ready-card">
            <div className="ready-card-left">
              <div className="ready-badge">✓ Ready to Analyze</div>
              <div className="ready-summary-pills">
                <span className="ready-pill success">
                  <span className="pill-dot green" />
                  Sample Data: {sampleRowCount?.toLocaleString() || 0} rows
                </span>
                {calendarFileName ? (
                  <span className="ready-pill calendar">
                    <span className="chip-dot" />
                    Calendar: {calendarFileName}
                  </span>
                ) : (
                  <span className="ready-pill muted">
                    📅 Calendar: Optional
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              id="btn-proceed-dashboard"
              className="btn btn-primary btn-proceed-main"
              onClick={onProceed}
            >
              <span>Proceed to Dashboard</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        ) : (
          <p className="upload-guide-text">
            Upload your Sample Data to proceed. Delivery Calendar can be added now or at any time later.
          </p>
        )}
      </div>
    </div>
  );
}

