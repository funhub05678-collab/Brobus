import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { CategoryBreakdownRow, FinancialSummary, InventorySummary } from '../types/accounting';
import { formatCurrency, formatInteger } from '../lib/accounting';

export type DetailMetricKind =
  | 'stock_levels'
  | 'stock_remaining'
  | 'total_sales'
  | 'profit_margin';

interface CategoryDetailsModalProps {
  isOpen: boolean;
  initialMetric: DetailMetricKind;
  onClose: () => void;
  rows: CategoryBreakdownRow[];
  inventorySummary: InventorySummary;
  financialSummary: FinancialSummary;
  currencySymbol: string;
}

const METRIC_TABS: { id: DetailMetricKind; label: string }[] = [
  { id: 'stock_levels', label: 'Total Stock Levels' },
  { id: 'stock_remaining', label: 'Stocks Remaining' },
  { id: 'total_sales', label: 'Total Sales' },
  { id: 'profit_margin', label: 'Profit Margins' },
];

export function CategoryDetailsModal({
  isOpen,
  initialMetric,
  onClose,
  rows,
  inventorySummary,
  financialSummary,
  currencySymbol,
}: CategoryDetailsModalProps) {
  const [activeMetric, setActiveMetric] = useState<DetailMetricKind>(initialMetric);

  useEffect(() => {
    if (isOpen) {
      setActiveMetric(initialMetric);
    }
  }, [isOpen, initialMetric]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-details-title"
    >
      <div className="w-full sm:max-w-3xl bg-white border border-slate-200 rounded-t-2xl sm:rounded-xl shadow-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 id="category-details-title" className="text-base font-bold text-slate-900">
              Product Category Breakdown
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Detailed metrics grouped by product category
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close category details"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-4 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {METRIC_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveMetric(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeMetric === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {rows.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <p className="text-sm font-medium text-slate-700">
                No product category records available yet.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Once inventory items or sales transactions are recorded by admin, category details will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {activeMetric === 'stock_levels' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-2.5 pr-4">Product Category</th>
                      <th className="py-2.5 px-4 text-right">SKUs</th>
                      <th className="py-2.5 px-4 text-right">Total Stock Level</th>
                      <th className="py-2.5 pl-4 text-right">Share of Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {rows.map((row) => {
                      const share =
                        inventorySummary.totalStockLevels > 0
                          ? (row.totalStockLevel / inventorySummary.totalStockLevels) * 100
                          : 0;
                      return (
                        <tr key={row.category}>
                          <td className="py-3 pr-4 font-semibold text-slate-900">
                            {row.category}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                            {formatInteger(row.skuCount)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                            {formatInteger(row.totalStockLevel)} units
                          </td>
                          <td className="py-3 pl-4 text-right font-mono tabular-nums text-slate-600">
                            {share.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50 text-xs font-bold text-slate-900">
                      <td className="py-2.5 pr-4">All Categories</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {formatInteger(inventorySummary.totalSkus)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {formatInteger(inventorySummary.totalStockLevels)} units
                      </td>
                      <td className="py-2.5 pl-4 text-right font-mono tabular-nums">100.0%</td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {activeMetric === 'stock_remaining' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-2.5 pr-4">Product Category</th>
                      <th className="py-2.5 px-4 text-right">Remaining</th>
                      <th className="py-2.5 px-4 text-right">Total Capacity</th>
                      <th className="py-2.5 px-4 text-right">On-Hand %</th>
                      <th className="py-2.5 pl-4 text-right">Alerts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {rows.map((row) => {
                      const onHandPct =
                        row.totalStockLevel > 0
                          ? (row.stockRemaining / row.totalStockLevel) * 100
                          : 0;
                      return (
                        <tr key={row.category}>
                          <td className="py-3 pr-4 font-semibold text-slate-900">
                            {row.category}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                            {formatInteger(row.stockRemaining)} units
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                            {formatInteger(row.totalStockLevel)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                            {onHandPct.toFixed(1)}%
                          </td>
                          <td
                            className={`py-3 pl-4 text-right text-xs font-semibold ${
                              row.lowOrOutCount > 0 ? 'text-amber-700' : 'text-emerald-700'
                            }`}
                          >
                            {row.lowOrOutCount > 0
                              ? `${row.lowOrOutCount} low/out`
                              : 'Nominal'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50 text-xs font-bold text-slate-900">
                      <td className="py-2.5 pr-4">All Categories</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {formatInteger(inventorySummary.stocksRemaining)} units
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {formatInteger(inventorySummary.totalStockLevels)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {inventorySummary.stockUtilizationPct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 pl-4 text-right">
                        {inventorySummary.lowStockCount + inventorySummary.outOfStockCount} alerts
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {activeMetric === 'total_sales' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-2.5 pr-4">Product Category</th>
                      <th className="py-2.5 px-4 text-right">Sales Count</th>
                      <th className="py-2.5 px-4 text-right">Units Sold</th>
                      <th className="py-2.5 px-4 text-right">Total Sales</th>
                      <th className="py-2.5 pl-4 text-right">Revenue Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {rows.map((row) => {
                      const share =
                        financialSummary.totalSales > 0
                          ? (row.totalSales / financialSummary.totalSales) * 100
                          : 0;
                      return (
                        <tr key={row.category}>
                          <td className="py-3 pr-4 font-semibold text-slate-900">
                            {row.category}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                            {formatInteger(row.salesCount)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                            {formatInteger(row.unitsSold)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                            {formatCurrency(row.totalSales, currencySymbol)}
                          </td>
                          <td className="py-3 pl-4 text-right font-mono tabular-nums text-slate-600">
                            {share.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50 text-xs font-bold text-slate-900">
                      <td className="py-2.5 pr-4">All Categories</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {formatInteger(financialSummary.salesCount)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {formatInteger(rows.reduce((sum, r) => sum + r.unitsSold, 0))}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {formatCurrency(financialSummary.totalSales, currencySymbol)}
                      </td>
                      <td className="py-2.5 pl-4 text-right font-mono tabular-nums">
                        {financialSummary.totalSales > 0 ? '100.0%' : '0.0%'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {activeMetric === 'profit_margin' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-2.5 pr-4">Product Category</th>
                      <th className="py-2.5 px-4 text-right">Sales</th>
                      <th className="py-2.5 px-4 text-right">Cost Basis</th>
                      <th className="py-2.5 px-4 text-right">Gross Profit</th>
                      <th className="py-2.5 pl-4 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {rows.map((row) => (
                      <tr key={row.category}>
                        <td className="py-3 pr-4 font-semibold text-slate-900">
                          {row.category}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                          {formatCurrency(row.totalSales, currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                          {formatCurrency(row.costOfGoods, currencySymbol)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                            row.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {formatCurrency(row.grossProfit, currencySymbol)}
                        </td>
                        <td
                          className={`py-3 pl-4 text-right font-mono tabular-nums font-semibold ${
                            row.profitMarginPct >= 0 ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {row.profitMarginPct.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50 text-xs font-bold text-slate-900">
                      <td className="py-2.5 pr-4">Overall Gross Margin</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {formatCurrency(financialSummary.totalSales, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {formatCurrency(financialSummary.totalCOGS, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {formatCurrency(financialSummary.grossProfit, currencySymbol)}
                      </td>
                      <td className="py-2.5 pl-4 text-right font-mono tabular-nums">
                        {financialSummary.grossMarginPct.toFixed(1)}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 flex justify-end bg-slate-50/60 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
