// FileUpload.tsx – Highly Aesthetic Z-TRACK Upload Screen with Zudio Branding
import React, { useRef, useState } from 'react';

interface Props {
  onFileSelected: (file: File) => void;
  loading?: boolean;
}

export default function FileUpload({ onFileSelected, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      alert('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }
    onFileSelected(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="upload-page-container">
      {/* ── 1. Hero Brand Header ── */}
      <div className="upload-brand-header">
        <div className="upload-brand-badge">
          <span className="badge-pulse-dot" />
          TECHNICAL & QUALITY SERVICES
        </div>

        <div className="upload-brand-identity">
          <div className="upload-logo-wrapper">
            <img
              src="/logo.jpg"
              alt="Zudio Logo"
              className="upload-zudio-logo"
            />
          </div>
          <div className="upload-brand-text">
            <h1 className="upload-brand-title">Z - TRACK</h1>
            <p className="upload-brand-subtitle">
              Sample Quality & Technical Performance Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Aesthetic Drag & Drop Area ── */}
      <div
        className={`upload-zone-aesthetic ${dragOver ? 'drag-over' : ''} ${loading ? 'loading' : ''}`}
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id="excel-file-input"
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          style={{ display: 'none' }}
        />

        {loading ? (
          <div className="upload-loading-content">
            <div className="upload-loading-spinner" />
            <h2 className="upload-loading-title">Analyzing Dataset…</h2>
            <p className="upload-loading-desc">
              Extracting sample cycles, evaluating on-time adherence, and computing RFT matrices.
            </p>
            <div className="upload-progress-bar">
              <div className="upload-progress-fill" />
            </div>
          </div>
        ) : (
          <>
            <div className="upload-icon-aesthetic">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9,15 12,12 15,15" />
              </svg>
            </div>

            <h2 className="upload-zone-title">Upload Performance Dataset</h2>
            <p className="upload-zone-desc">
              Drag & drop your Excel report here, or click anywhere to select from your device.
            </p>

            <button
              type="button"
              className="btn btn-primary upload-browse-btn"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Browse Excel File (.xlsx / .xls)
            </button>

            <div className="upload-security-badges">
              <span className="security-tag">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                100% Client-Side Processing
              </span>
              <span className="security-tag">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                Auto-Computes RFT & Deadlines
              </span>
              <span className="security-tag">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                Excel Pivot Export Ready
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── 3. Three Showcase Feature Cards ── */}
      <div className="upload-feature-grid">
        <div className="upload-feature-card">
          <div className="feature-card-icon blue-seal-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div className="feature-card-content">
            <h3 className="feature-card-title">Blue & Silver Seal Tracking</h3>
            <p className="feature-card-desc">
              Track submission rounds, evaluate on-time reviews, and measure Right-First-Time (RFT%) success rates.
            </p>
          </div>
        </div>

        <div className="upload-feature-card">
          <div className="feature-card-icon matrix-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
          </div>
          <div className="feature-card-content">
            <h3 className="feature-card-title">Department & Drop Breakdown</h3>
            <p className="feature-card-desc">
              Hierarchical drop matrices across Ethnicwear, Footwear, Innerwear, Kidswear & Menswear with Excel export.
            </p>
          </div>
        </div>

        <div className="upload-feature-card">
          <div className="feature-card-icon vendor-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <div className="feature-card-content">
            <h3 className="feature-card-title">Rejection & Vendor Scorecards</h3>
            <p className="feature-card-desc">
              Deep-dive into defect Pareto charts, vendor performance leaderboards, and pending sample bottlenecks.
            </p>
          </div>
        </div>
      </div>

      {/* ── 4. Brand Tagline ── */}
      <div className="upload-footer-tag">
        <span>ZUDIO QUALITY & TECHNICAL ASSURANCE</span>
        <span className="dot-sep">·</span>
        <span>TRENT LIMITED</span>
      </div>
    </div>
  );
}
