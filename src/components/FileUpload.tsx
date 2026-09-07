// FileUpload.tsx – Light theme upload zone
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
    <div
      className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
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

      <div className="upload-icon">
        {loading ? (
          <div className="loading-spinner" />
        ) : (
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--brand-600)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <polyline points="9,15 12,12 15,15"/>
          </svg>
        )}
      </div>

      <h2 className="upload-title">
        {loading ? 'Processing Dataset…' : 'Upload Performance Dataset'}
      </h2>
      <p className="upload-subtitle">
        {loading
          ? 'Parsing dataset and calculating performance metrics.'
          : 'Drag & drop your sample report file here, or click to browse. Processing is performed securely and locally.'}
      </p>

      {!loading && (
        <button
          className="btn btn-primary"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Select File
        </button>
      )}

      <p className="upload-file-types">Supported Formats: .xlsx · .xls</p>
    </div>
  );
}
