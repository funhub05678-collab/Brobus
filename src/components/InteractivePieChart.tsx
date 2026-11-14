import React, { useState } from 'react';
import { AllocationSlice } from '../types/accounting';
import { formatCurrency } from '../lib/accounting';

interface InteractivePieChartProps {
  slices: AllocationSlice[];
  totalAmount: number;
  centerLabel: string;
  currencySymbol: string;
  emptyMessage?: string;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function describeDonutSlice(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.99) {
    // Full circle fallback as two semicircles
    const topOuter = polarToCartesian(cx, cy, outerRadius, 0);
    const bottomOuter = polarToCartesian(cx, cy, outerRadius, 180);
    const topInner = polarToCartesian(cx, cy, innerRadius, 0);
    const bottomInner = polarToCartesian(cx, cy, innerRadius, 180);
    return [
      `M ${topOuter.x} ${topOuter.y}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${bottomOuter.x} ${bottomOuter.y}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${topOuter.x} ${topOuter.y}`,
      `M ${topInner.x} ${topInner.y}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${bottomInner.x} ${bottomInner.y}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${topInner.x} ${topInner.y}`,
      'Z',
    ].join(' ');
  }

  const startOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
  const endOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
  const startInner = polarToCartesian(cx, cy, innerRadius, endAngle);
  const endInner = polarToCartesian(cx, cy, innerRadius, startAngle);
  const largeArcFlag = sweep <= 180 ? '0' : '1';

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ');
}

export function InteractivePieChart({
  slices,
  totalAmount,
  centerLabel,
  currencySymbol,
  emptyMessage = 'No positive balance available to visualize yet.',
}: InteractivePieChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeId = hoveredId ?? selectedId;
  const activeSlice = slices.find((s) => s.id === activeId) || null;

  const nonZeroSlices = slices.filter((s) => s.percentage > 0);
  const totalPct = nonZeroSlices.reduce((acc, s) => acc + s.percentage, 0);

  const cx = 120;
  const cy = 120;
  const outerR = 96;
  const innerR = 58;

  let currentAngle = 0;
  const computedArcs = nonZeroSlices.map((slice) => {
    const normalizedSweep = totalPct > 0 ? (slice.percentage / totalPct) * 360 : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + normalizedSweep;
    currentAngle = endAngle;

    const midAngle = (startAngle + endAngle) / 2;
    const isActive = activeId === slice.id;
    const offset = isActive ? 6 : 0;
    const rad = ((midAngle - 90) * Math.PI) / 180;
    const dx = offset * Math.cos(rad);
    const dy = offset * Math.sin(rad);

    return {
      slice,
      path: describeDonutSlice(cx, cy, outerR, innerR, startAngle, endAngle),
      transform: `translate(${dx.toFixed(2)}, ${dy.toFixed(2)})`,
      isActive,
    };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
      <div className="md:col-span-5 flex flex-col items-center justify-center">
        {totalPct <= 0 || totalAmount <= 0 ? (
          <div className="w-56 h-56 rounded-full border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-center p-6">
            <span className="text-xs font-medium text-slate-500">{centerLabel}</span>
            <span className="text-lg font-bold text-slate-900 tabular-nums mt-1">
              {formatCurrency(totalAmount, currencySymbol)}
            </span>
            <span className="text-xs text-slate-400 mt-2 leading-snug">{emptyMessage}</span>
          </div>
        ) : (
          <div className="relative w-60 h-60 flex items-center justify-center">
            <svg
              viewBox="0 0 240 240"
              className="w-full h-full overflow-visible"
              role="img"
              aria-label={`${centerLabel} interactive pie chart`}
            >
              {computedArcs.map(({ slice, path, transform, isActive }) => (
                <path
                  key={slice.id}
                  d={path}
                  fill={slice.color}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  transform={transform}
                  opacity={activeId && !isActive ? 0.55 : 1}
                  className="cursor-pointer transition-all duration-150 focus:outline-none"
                  tabIndex={0}
                  role="button"
                  aria-label={`${slice.label}: ${slice.percentage.toFixed(1)}% (${formatCurrency(slice.amount, currencySymbol)})`}
                  onMouseEnter={() => setHoveredId(slice.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(slice.id)}
                  onBlur={() => setHoveredId(null)}
                  onClick={() =>
                    setSelectedId((prev) => (prev === slice.id ? null : slice.id))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedId((prev) => (prev === slice.id ? null : slice.id));
                    }
                  }}
                />
              ))}
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-10">
              <span className="text-xs font-medium text-slate-500 truncate max-w-[110px]">
                {activeSlice ? activeSlice.label : centerLabel}
              </span>
              <span className="text-base sm:text-lg font-bold text-slate-900 tabular-nums mt-0.5">
                {activeSlice
                  ? formatCurrency(activeSlice.amount, currencySymbol)
                  : formatCurrency(totalAmount, currencySymbol)}
              </span>
              {activeSlice && (
                <span className="text-xs font-semibold text-teal-700 tabular-nums mt-0.5">
                  {activeSlice.percentage.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="md:col-span-7 space-y-2">
        {slices.map((slice) => {
          const isActive = activeId === slice.id;
          return (
            <button
              key={slice.id}
              type="button"
              onMouseEnter={() => setHoveredId(slice.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() =>
                setSelectedId((prev) => (prev === slice.id ? null : slice.id))
              }
              className={`w-full text-left px-3.5 py-3 rounded-lg border transition-colors flex items-center justify-between gap-3 ${
                isActive
                  ? 'border-slate-400 bg-slate-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50/70'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className="w-3 h-3 rounded-sm shrink-0 mt-1"
                  style={{ backgroundColor: slice.color }}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {slice.label}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{slice.subtitle}</div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-slate-900 tabular-nums font-mono">
                  {formatCurrency(slice.amount, currencySymbol)}
                </div>
                <div className="text-xs font-medium text-slate-500 tabular-nums">
                  {slice.percentage.toFixed(1)}%
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
