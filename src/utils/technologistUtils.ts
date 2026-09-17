// src/utils/technologistUtils.ts
import { type NormalizedRow, type ActiveFilters, applyFilters } from './dataUtils';

export interface TechnologistMetric {
  name: string;
  totalSamples: number;
  uniqueStyles: number;
  approved: number;
  rejected: number;
  pending: number;
  cancelled: number;
  other: number;
  approvalRate: number; // approved / totalSamples * 100
  rejectionRate: number; // rejected / totalSamples * 100
  blueSealCount: number;
  silverSealCount: number;
  rftCount: number;
  rftPercent: number;
  onTimeCount: number;
  onTimeTotal: number;
  onTimePercent: number;
  departments: string[];
  brands: string[];
  recentActivityDate: string;
  samples: NormalizedRow[];
}

export function computeTechnologistMetrics(
  rows: NormalizedRow[],
  filters: ActiveFilters
): TechnologistMetric[] {
  const filtered = applyFilters(rows, filters);

  const map = new Map<string, NormalizedRow[]>();

  for (const row of filtered) {
    let name = row.modifiedBy?.trim() || '';
    if (!name || name === '—' || name === '-') {
      // Fallback: Check if sealer contains a person's name (not just Blue Seal/Silver Seal)
      if (row.sealer && !row.sealer.toLowerCase().includes('blue seal') && !row.sealer.toLowerCase().includes('silver seal')) {
        name = row.sealer.trim();
      } else {
        name = 'Unassigned / System';
      }
    }

    if (!map.has(name)) {
      map.set(name, []);
    }
    map.get(name)!.push(row);
  }

  const result: TechnologistMetric[] = [];

  for (const [name, personRows] of map.entries()) {
    const totalSamples = personRows.length;
    const uniqueStylesSet = new Set(personRows.map(r => r.styleCode).filter(Boolean));
    const uniqueStyles = uniqueStylesSet.size || totalSamples;

    let approved = 0;
    let rejected = 0;
    let pending = 0;
    let cancelled = 0;
    let other = 0;
    let blueSealCount = 0;
    let silverSealCount = 0;
    let onTimeCount = 0;
    let onTimeTotal = 0;

    const deptSet = new Set<string>();
    const brandSet = new Set<string>();
    let latestDate = '';

    for (const r of personRows) {
      if (r.statusNormalized === 'Approved') approved++;
      else if (r.statusNormalized === 'Rejected') rejected++;
      else if (r.statusNormalized === 'Pending') pending++;
      else if (r.statusNormalized === 'Cancelled') cancelled++;
      else other++;

      if (r.sealType === 'Blue Seal') blueSealCount++;
      else if (r.sealType === 'Silver Seal') silverSealCount++;

      if (r.onTime === true) onTimeCount++;
      if (r.onTime !== null) onTimeTotal++;

      if (r.department && r.department !== '—') deptSet.add(r.department);
      if (r.brand && r.brand !== '—') brandSet.add(r.brand);

      const d = r.date || r.receivedAtTechDate || '';
      if (d && (!latestDate || d > latestDate)) {
        latestDate = d;
      }
    }

    // RFT (First Time Right)
    // Style is RFT if it has 1 occurrence and that occurrence is Approved
    let rftCount = 0;
    for (const code of uniqueStylesSet) {
      const styleRows = personRows.filter(r => r.styleCode === code);
      if (styleRows.length === 1 && styleRows[0].statusNormalized === 'Approved') {
        rftCount++;
      }
    }

    const approvalRate = totalSamples > 0 ? (approved / totalSamples) * 100 : 0;
    const rejectionRate = totalSamples > 0 ? (rejected / totalSamples) * 100 : 0;
    const rftPercent = uniqueStyles > 0 ? (rftCount / uniqueStyles) * 100 : 0;
    const onTimePercent = onTimeTotal > 0 ? (onTimeCount / onTimeTotal) * 100 : 0;

    result.push({
      name,
      totalSamples,
      uniqueStyles,
      approved,
      rejected,
      pending,
      cancelled,
      other,
      approvalRate,
      rejectionRate,
      blueSealCount,
      silverSealCount,
      rftCount,
      rftPercent,
      onTimeCount,
      onTimeTotal,
      onTimePercent,
      departments: Array.from(deptSet),
      brands: Array.from(brandSet),
      recentActivityDate: latestDate,
      samples: personRows,
    });
  }

  // Default sort by total samples descending
  return result.sort((a, b) => b.totalSamples - a.totalSamples);
}
