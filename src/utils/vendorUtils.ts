// src/utils/vendorUtils.ts
import { type NormalizedRow, type ActiveFilters, applyFilters } from './dataUtils';

export interface VendorMetric {
  vendor: string;
  totalSamples: number;
  blueSeal: number;
  silverSeal: number;
  approved: number;
  rejected: number;
  rawPerformance: number; // approved / totalSamples * 100
  adjustedPerformance: number; // Bayesian adjusted
}

// Helper to compute overall approval rate across all rows (after filters)
function overallApprovalRate(rows: NormalizedRow[]): number {
  const total = rows.length;
  if (total === 0) return 0;
  const approved = rows.filter(r => r.statusNormalized === 'Approved').length;
  return approved / total;
}

/**
 * Compute per‑vendor metrics, applying the supplied active filters.
 * Uses direct approval percentage (approved / totalSamples * 100).
 */
export function computeVendorMetrics(
  rows: NormalizedRow[],
  filters: ActiveFilters
): VendorMetric[] {
  const filtered = applyFilters(rows, filters);

  const map = new Map<string, VendorMetric>();
  for (const row of filtered) {
    const vendor = row.supplier || 'Unknown';
    let vm = map.get(vendor);
    if (!vm) {
      vm = {
        vendor,
        totalSamples: 0,
        blueSeal: 0,
        silverSeal: 0,
        approved: 0,
        rejected: 0,
        rawPerformance: 0,
        adjustedPerformance: 0,
      };
      map.set(vendor, vm);
    }
    vm.totalSamples++;
    if (row.sealType === 'Blue Seal') vm.blueSeal++;
    if (row.sealType === 'Silver Seal') vm.silverSeal++;
    if (row.statusNormalized === 'Approved') vm.approved++;
    if (row.statusNormalized === 'Rejected') vm.rejected++;
  }

  // Final calculations - direct percentage
  const result: VendorMetric[] = [];
  for (const vm of map.values()) {
    const directPct = vm.totalSamples > 0 ? (vm.approved / vm.totalSamples) * 100 : 0;
    vm.rawPerformance = directPct;
    vm.adjustedPerformance = directPct;
    result.push(vm);
  }
  return result;
}
