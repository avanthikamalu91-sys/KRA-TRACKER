// RFTChart.tsx – Recharts donut chart & RFT details with spacious, uncluttered layout
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { SealMetrics, SealType } from '../utils/dataUtils';

interface Props {
  metrics: SealMetrics;
  sealType: SealType;
}

function fmt(n: number) { return n.toLocaleString(); }

function CustomLabel({
  cx, cy, midAngle, innerRadius, outerRadius, percent
}: {
  cx: number; cy: number; midAngle: number;
  innerRadius: number; outerRadius: number; percent: number;
}) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      style={{
        fontSize: '0.875rem',
        fontWeight: 800,
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.6))',
      }}
    >
      {(percent * 100).toFixed(0)}%
    </text>
  );
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      padding: '12px 16px',
      fontSize: '0.8125rem',
      boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
    }}>
      <p style={{ fontWeight: 700, color: '#1e1b4b', marginBottom: 4 }}>{payload[0].name}</p>
      <p style={{ color: '#475569', fontWeight: 600 }}>
        {payload[0].value.toLocaleString()} style{payload[0].value !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

export default function RFTChart({ metrics, sealType }: Props) {
  const isBlue      = sealType === 'Blue Seal';
  const rftColor    = '#22c55e';
  const notRftColor = '#ef4444';

  const { totalUniqueStyles, rftCount, notRftCount, rftPercent } = metrics;
  const notRftPercent = totalUniqueStyles > 0 ? ((notRftCount / totalUniqueStyles) * 100).toFixed(1) : '0.0';

  const data = [
    { name: 'RFT (1 occurrence)',      value: rftCount },
    { name: 'Not RFT (2+ occurrences)', value: notRftCount },
  ].filter(d => d.value > 0);

  return (
    <div style={{ padding: '4px 2px' }}>
      {/* 3 Compact RFT Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10,
        marginBottom: 12,
      }}>
        {/* Unique Styles Card */}
        <div style={{
          background: 'var(--bg-card2)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '8px 12px',
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Unique Styles
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: isBlue ? 'var(--blue-seal)' : 'var(--silver-seal)', margin: '2px 0 1px 0' }}>
            {fmt(totalUniqueStyles)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
            Styles analyzed
          </div>
        </div>

        {/* RFT ✓ Card */}
        <div style={{
          background: 'var(--green-bg)',
          border: '1px solid #bbf7d0',
          borderRadius: 8,
          padding: '8px 12px',
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--green-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            RFT ✓ (1 Occurrence)
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--green-text)', margin: '2px 0 1px 0' }}>
            {rftPercent.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 600 }}>
            {fmt(rftCount)} styles
          </div>
        </div>

        {/* Not RFT ✗ Card */}
        <div style={{
          background: 'var(--red-bg)',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: '8px 12px',
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--red-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Not RFT ✗ (2+ Occurrences)
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--red-text)', margin: '2px 0 1px 0' }}>
            {notRftPercent}%
          </div>
          <div style={{ fontSize: '0.7rem', color: '#991b1b', fontWeight: 600 }}>
            {fmt(notRftCount)} styles
          </div>
        </div>
      </div>

      {/* Compact Progress Bar */}
      <div style={{ marginBottom: 12 }}>
        <div className="progress-bar-track" style={{ height: 8 }}>
          <div
            className={`progress-bar-fill ${isBlue ? 'blue' : 'silver'}`}
            style={{ width: `${Math.min(rftPercent, 100)}%` }}
          />
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 5,
          fontSize: '0.7rem',
          color: 'var(--text-subtle)',
          fontWeight: 500,
        }}>
          <span>0%</span>
          <span style={{ color: isBlue ? 'var(--blue-seal)' : 'var(--silver-seal)', fontWeight: 700 }}>
            RFT Rate: {rftPercent.toFixed(1)}%
          </span>
          <span>100%</span>
        </div>
      </div>

      {/* Compact Donut Chart */}
      {data.length > 0 && totalUniqueStyles > 0 ? (
        <div style={{ height: 185 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%" cy="50%"
                innerRadius={44} outerRadius={76}
                paddingAngle={4}
                dataKey="value"
                labelLine={false}
                label={CustomLabel as never}
                startAngle={90} endAngle={-270}
              >
                <Cell fill={rftColor} strokeWidth={0} />
                <Cell fill={notRftColor} strokeWidth={0} />
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingTop: 4 }}
                formatter={(value) => (
                  <span style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 600 }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100 }}>
          <span style={{ color: 'var(--text-subtle)', fontSize: '0.8125rem' }}>No style data available</span>
        </div>
      )}
    </div>
  );
}
