// SealSummary.tsx – KPI card for Blue or Silver Seal with spacious, uncluttered layout
import React from 'react';
import type { SealMetrics, SealType } from '../utils/dataUtils';

interface Props {
  sealType: SealType;
  metrics: SealMetrics;
}

function fmt(n: number) { return n.toLocaleString(); }

export default function SealSummary({ sealType, metrics }: Props) {
  const isBlue   = sealType === 'Blue Seal';
  const colorKey = isBlue ? 'blue' : 'silver';

  const {
    totalRows, totalUniqueStyles,
    approved, rejected, pending, other,
  } = metrics;

  const cancelledAndOther = other;
  const pendingTotal = pending + cancelledAndOther;

  const approvedPct = totalRows > 0 ? ((approved / totalRows) * 100).toFixed(1) : '0.0';
  const rejectedPct = totalRows > 0 ? ((rejected / totalRows) * 100).toFixed(1) : '0.0';
  const pendingPct  = totalRows > 0 ? ((pendingTotal / totalRows) * 100).toFixed(1) : '0.0';

  return (
    <div className={`seal-card ${colorKey}-card`}>
      {/* Header */}
      <div className="seal-card-header">
        <div className="seal-label">
          <span className="seal-name">{sealType.toUpperCase()}</span>
        </div>
        <span className="seal-total-badge">
          {fmt(totalRows)} samples
        </span>
      </div>

      {/* Body */}
      <div className="seal-card-body" style={{ padding: '14px 18px' }}>
        {/* 4 metric columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 14,
        }}>
          {/* Total */}
          <div className="metric-item">
            <span className="metric-label">Total Samples</span>
            <span className="metric-value default" style={{ fontSize: '1.25rem' }}>{fmt(totalRows)}</span>
            <span className="metric-sub" style={{ fontSize: '0.72rem' }}>{fmt(totalUniqueStyles)} unique</span>
          </div>

          {/* Approved */}
          <div className="metric-item">
            <span className="metric-label">Approved</span>
            <span className="metric-value approved" style={{ fontSize: '1.25rem' }}>{fmt(approved)}</span>
            <span className="metric-sub" style={{ color: 'var(--green-text)', fontWeight: 600, fontSize: '0.72rem' }}>
              {approvedPct}% of total
            </span>
          </div>

          {/* Rejected */}
          <div className="metric-item">
            <span className="metric-label">Rejected</span>
            <span className="metric-value rejected" style={{ fontSize: '1.25rem' }}>{fmt(rejected)}</span>
            <span className="metric-sub" style={{ color: 'var(--red-text)', fontWeight: 600, fontSize: '0.72rem' }}>
              {rejectedPct}% of total
            </span>
          </div>

          {/* Pending / Other */}
          <div className="metric-item">
            <span className="metric-label">Pending / Other</span>
            <span className="metric-value pending" style={{ fontSize: '1.25rem' }}>{fmt(pendingTotal)}</span>
            <span className="metric-sub" style={{ color: 'var(--amber-text)', fontWeight: 600, fontSize: '0.72rem' }}>
              {pendingPct}% of total
            </span>
          </div>
        </div>

        {/* Compact Status Breakdown Section */}
        <div style={{
          background: 'var(--bg-card2)',
          borderRadius: 8,
          padding: '12px 14px',
          border: '1px solid var(--border)',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}>
            <span style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Sample Status Breakdown
            </span>
            <span style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: 'var(--green-text)',
            }}>
              {approvedPct}% <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Approved</span>
            </span>
          </div>

          {/* 3 Compact Category Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginBottom: 10,
          }}>
            {/* Approved Card */}
            <div style={{
              background: 'var(--green-bg)',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              padding: '8px 12px',
            }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--green-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Approved
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--green-text)', margin: '2px 0 1px 0' }}>
                {approvedPct}%
              </div>
              <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 500 }}>
                {fmt(approved)} samples
              </div>
            </div>

            {/* Rejected Card */}
            <div style={{
              background: 'var(--red-bg)',
              border: '1px solid #fecaca',
              borderRadius: 8,
              padding: '8px 12px',
            }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--red-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Rejected
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--red-text)', margin: '2px 0 1px 0' }}>
                {rejectedPct}%
              </div>
              <div style={{ fontSize: '0.7rem', color: '#991b1b', fontWeight: 500 }}>
                {fmt(rejected)} samples
              </div>
            </div>

            {/* Pending / Other Card */}
            <div style={{
              background: 'var(--amber-bg)',
              border: '1px solid #fde68a',
              borderRadius: 8,
              padding: '8px 12px',
            }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--amber-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pending / Other
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--amber-text)', margin: '2px 0 1px 0' }}>
                {pendingPct}%
              </div>
              <div style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 500 }}>
                {fmt(pendingTotal)} samples
              </div>
            </div>
          </div>

          {/* Segmented Progress Bar */}
          <div style={{
            display: 'flex',
            height: 8,
            overflow: 'hidden',
            borderRadius: 4,
            background: '#e2e8f0',
            marginTop: 8,
          }}>
            <div
              style={{
                width: `${approvedPct}%`,
                background: 'linear-gradient(90deg, #16a34a, #22c55e)',
                height: '100%',
                transition: 'width 0.5s ease',
              }}
              title={`Approved: ${approvedPct}%`}
            />
            <div
              style={{
                width: `${rejectedPct}%`,
                background: 'linear-gradient(90deg, #dc2626, #ef4444)',
                height: '100%',
                transition: 'width 0.5s ease',
              }}
              title={`Rejected: ${rejectedPct}%`}
            />
            <div
              style={{
                width: `${pendingPct}%`,
                background: 'linear-gradient(90deg, #d97706, #f59e0b)',
                height: '100%',
                transition: 'width 0.5s ease',
              }}
              title={`Pending/Other: ${pendingPct}%`}
            />
          </div>

          {/* Min / Max / Center Labels */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 5,
            fontSize: '0.7rem',
            color: 'var(--text-subtle)',
            fontWeight: 500,
          }}>
            <span>0%</span>
            <span style={{ color: 'var(--green-text)', fontWeight: 700 }}>
              Approval: {approvedPct}%
            </span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
