import React, { useMemo, useState } from 'react';
import { InventoryItem, TransactionRecord } from '../types/accounting';
import {
  computeMonthlySalesAndStockLevels,
  computeYearlySalesAndStockLevels,
  formatCurrency,
  formatInteger,
  getAvailableChartYears,
  PeriodSalesStockPoint,
} from '../lib/accounting';

interface SalesVsStockChartProps {
  transactions: TransactionRecord[];
  inventory: InventoryItem[];
  currencySymbol: string;
}

type Granularity = 'monthly' | 'yearly';

function formatCompactCurrencyAxis(value: number, symbol: string): string {
  const prefix = symbol.trim() || 'Rs';
  if (value === 0) return `${prefix} 0`;
  if (value >= 1_000_000) return `${prefix} ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${prefix} ${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return `${prefix} ${Math.round(value)}`;
}

function formatCompactUnitsAxis(value: number): string {
  if (value === 0) return '0 u';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M u`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k u`;
  return `${Math.round(value)} u`;
}

export function SalesVsStockChart({
  transactions,
  inventory,
  currencySymbol,
}: SalesVsStockChartProps) {
  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(
    () => getAvailableChartYears(transactions, inventory, currentYear),
    [transactions, inventory, currentYear]
  );

  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0] || currentYear);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const activeYear = availableYears.includes(selectedYear)
    ? selectedYear
    : availableYears[0] || currentYear;

  const data: PeriodSalesStockPoint[] = useMemo(() => {
    if (granularity === 'monthly') {
      return computeMonthlySalesAndStockLevels(transactions, inventory, activeYear);
    }
    return computeYearlySalesAndStockLevels(transactions, inventory);
  }, [transactions, inventory, granularity, activeYear]);

  const summaryMetrics = useMemo(() => {
    let totalSales = 0;
    let peakStockLevel = 0;
    for (const row of data) {
      totalSales += row.salesRevenue;
      if (row.totalStockLevels > peakStockLevel) {
        peakStockLevel = row.totalStockLevels;
      }
    }
    return { totalSales, peakStockLevel };
  }, [data]);

  const maxSales = useMemo(() => {
    let peak = 0;
    for (const row of data) {
      if (row.salesRevenue > peak) peak = row.salesRevenue;
    }
    return peak > 0 ? peak * 1.15 : 1000;
  }, [data]);

  const maxStock = useMemo(() => {
    let peak = 0;
    for (const row of data) {
      if (row.totalStockLevels > peak) peak = row.totalStockLevels;
    }
    return peak > 0 ? peak * 1.15 : 100;
  }, [data]);

  const hasAnyData = summaryMetrics.totalSales > 0 || summaryMetrics.peakStockLevel > 0;
  const activePoint = data.find((d) => d.key === activeKey) || null;

  // Dual-axis SVG geometry
  const svgWidth = 780;
  const svgHeight = 284;
  const padLeft = 72;
  const padRight = 64;
  const padTop = 20;
  const padBottom = 38;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const groupWidth = plotWidth / Math.max(1, data.length);
  const barWidth = Math.min(22, Math.max(8, (groupWidth * 0.62) / 2));
  const barGap = 4;

  return (
    <section
      aria-label="Sales revenue and total stock levels chart"
      className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Sales Revenue vs. Total Stock Levels
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {granularity === 'monthly'
              ? `Month-by-month sales revenue (${currencySymbol.trim()}) and total stock levels (units) for ${activeYear}`
              : `Year-by-year sales revenue (${currencySymbol.trim()}) and total stock levels (units)`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {granularity === 'monthly' && (
            <select
              aria-label="Select year"
              value={activeYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setActiveKey(null);
              }}
              className="h-9 px-3 text-xs font-semibold font-mono bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-teal-600"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setGranularity('monthly');
                setActiveKey(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                granularity === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => {
                setGranularity('yearly');
                setActiveKey(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                granularity === 'yearly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>
      </div>

      {/* Period Summary + Legend */}
      <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-5 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-teal-600 inline-block" aria-hidden="true" />
            <span className="text-slate-600">Sales Revenue:</span>
            <span className="font-mono font-bold text-slate-900 tabular-nums">
              {formatCurrency(summaryMetrics.totalSales, currencySymbol)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" aria-hidden="true" />
            <span className="text-slate-600">Total Stock Levels:</span>
            <span className="font-mono font-bold text-slate-900 tabular-nums">
              {formatInteger(summaryMetrics.peakStockLevel)} units
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          {activePoint ? (
            <span className="font-medium text-slate-800">
              {activePoint.label}
              {granularity === 'monthly' ? ` ${activeYear}` : ''}: Sales{' '}
              <span className="font-mono font-bold text-teal-700 tabular-nums">
                {formatCurrency(activePoint.salesRevenue, currencySymbol)}
              </span>{' '}
              · Stock Level{' '}
              <span className="font-mono font-bold text-blue-700 tabular-nums">
                {formatInteger(activePoint.totalStockLevels)} units
              </span>
            </span>
          ) : (
            <span>Hover or tap any {granularity === 'monthly' ? 'month' : 'year'} bar to inspect values</span>
          )}
        </div>
      </div>

      {/* Dual-Axis Grouped Bar Chart Canvas */}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[580px]">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto select-none"
            role="img"
            aria-label="Grouped bar chart comparing sales revenue and total stock levels"
          >
            {/* Horizontal grid lines & Left/Right Y-axis labels */}
            {yTicks.map((ratio) => {
              const salesTick = maxSales * ratio;
              const stockTick = maxStock * ratio;
              const yPos = padTop + plotHeight - ratio * plotHeight;
              return (
                <g key={ratio}>
                  <line
                    x1={padLeft}
                    y1={yPos}
                    x2={svgWidth - padRight}
                    y2={yPos}
                    stroke={ratio === 0 ? '#CBD5E1' : '#F1F5F9'}
                    strokeWidth={1}
                  />
                  {/* Left axis: Sales Revenue */}
                  <text
                    x={padLeft - 10}
                    y={yPos + 4}
                    textAnchor="end"
                    className="fill-teal-700 text-[11px] font-mono"
                  >
                    {formatCompactCurrencyAxis(salesTick, currencySymbol)}
                  </text>
                  {/* Right axis: Total Stock Levels */}
                  <text
                    x={svgWidth - padRight + 10}
                    y={yPos + 4}
                    textAnchor="start"
                    className="fill-blue-700 text-[11px] font-mono"
                  >
                    {formatCompactUnitsAxis(stockTick)}
                  </text>
                </g>
              );
            })}

            {/* Grouped Bars */}
            {data.map((point, index) => {
              const groupX = padLeft + index * groupWidth;
              const centerX = groupX + groupWidth / 2;
              const isActive = activeKey === point.key;

              const salesHeight =
                point.salesRevenue > 0
                  ? Math.max(2, (point.salesRevenue / maxSales) * plotHeight)
                  : 0;
              const stockHeight =
                point.totalStockLevels > 0
                  ? Math.max(2, (point.totalStockLevels / maxStock) * plotHeight)
                  : 0;

              const salesX = centerX - barWidth - barGap / 2;
              const stockX = centerX + barGap / 2;
              const salesY = padTop + plotHeight - salesHeight;
              const stockY = padTop + plotHeight - stockHeight;

              return (
                <g
                  key={point.key}
                  className="cursor-pointer"
                  tabIndex={0}
                  role="button"
                  aria-label={`${point.label}: Sales ${formatCurrency(point.salesRevenue, currencySymbol)}, Total Stock Levels ${formatInteger(point.totalStockLevels)} units`}
                  onMouseEnter={() => setActiveKey(point.key)}
                  onMouseLeave={() => setActiveKey(null)}
                  onFocus={() => setActiveKey(point.key)}
                  onBlur={() => setActiveKey(null)}
                  onClick={() =>
                    setActiveKey((prev) => (prev === point.key ? null : point.key))
                  }
                >
                  {/* Hover column backdrop */}
                  <rect
                    x={groupX + 2}
                    y={padTop}
                    width={Math.max(0, groupWidth - 4)}
                    height={plotHeight}
                    rx={6}
                    fill={isActive ? '#F8FAFC' : 'transparent'}
                  />

                  {/* Sales Revenue Bar */}
                  <rect
                    x={salesX}
                    y={salesY}
                    width={barWidth}
                    height={salesHeight}
                    rx={3}
                    fill="#0D9488"
                    opacity={activeKey && !isActive ? 0.55 : 1}
                  />

                  {/* Total Stock Levels Bar */}
                  <rect
                    x={stockX}
                    y={stockY}
                    width={barWidth}
                    height={stockHeight}
                    rx={3}
                    fill="#2563EB"
                    opacity={activeKey && !isActive ? 0.55 : 1}
                  />

                  {/* X-Axis Label */}
                  <text
                    x={centerX}
                    y={padTop + plotHeight + 22}
                    textAnchor="middle"
                    className={`text-[11px] font-medium ${
                      isActive ? 'fill-slate-900 font-bold' : 'fill-slate-500'
                    }`}
                  >
                    {point.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {!hasAnyData && (
        <div className="mt-2 pt-3 border-t border-slate-100 text-xs text-slate-500 text-center">
          No sales or inventory stock levels recorded for{' '}
          {granularity === 'monthly' ? activeYear : 'any year'} yet. Once recorded, monthly and yearly bars will populate automatically.
        </div>
      )}
    </section>
  );
}
