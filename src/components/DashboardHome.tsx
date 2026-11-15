import React, { useState } from 'react';
import { ArrowRight, Plus, Package, TrendingUp, Wallet, Layers } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import {
  computeNetIncomeAllocations,
  formatCurrency,
  formatInteger,
} from '../lib/accounting';
import { InteractivePieChart } from './InteractivePieChart';
import { CategoryDetailsModal, DetailMetricKind } from './CategoryDetailsModal';
import { SalesVsStockChart } from './SalesVsStockChart';
import { TransactionType } from '../types/accounting';

interface DashboardHomeProps {
  onNavigate: (tab: 'home' | 'transactions' | 'inventory' | 'budget') => void;
  onOpenNewTransaction: (type?: TransactionType) => void;
}

const TX_TYPE_LABELS: Record<TransactionType, string> = {
  sale: 'Sale',
  purchase: 'Purchase',
  petty_cash_expense: 'Petty Cash',
  operating_expense: 'Operating Expense',
  petty_cash_topup: 'Petty Cash Top-Up',
  fund_deposit: 'Fund Deposit',
};

export function DashboardHome({
  onNavigate,
  onOpenNewTransaction,
}: DashboardHomeProps) {
  const {
    dataLoading,
    transactions,
    inventory,
    budgetConfig,
    financialSummary,
    inventorySummary,
    categoryBreakdown,
    isAdmin,
  } = useLedger();

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<DetailMetricKind>('stock_levels');

  const currency = budgetConfig.currencySymbol || 'Rs ';
  const allocationSlices = computeNetIncomeAllocations(
    financialSummary.netProfit,
    budgetConfig
  );

  const openCategoryDetails = (metric: DetailMetricKind) => {
    setSelectedMetric(metric);
    setDetailsModalOpen(true);
  };

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-36 bg-white border border-slate-200 rounded-xl p-5 animate-pulse"
            >
              <div className="h-3 w-24 bg-slate-200 rounded mb-3" />
              <div className="h-7 w-32 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
        <div className="h-80 bg-white border border-slate-200 rounded-xl p-6 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Admin Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Financial &amp; Inventory Overview
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Live stock levels, sales revenue, profit margins, petty cash balance, and net income allocation.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onOpenNewTransaction('sale')}
              className="h-10 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Record Transaction
            </button>
          </div>
        )}
      </div>

      {/* Total Funds Available Master Panel */}
      <section
        aria-label="Total funds available"
        className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="text-xs font-semibold text-slate-500">
              Total Funds Available
            </div>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-3">
              <span
                className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums ${
                  financialSummary.totalFundsAvailable >= 0
                    ? 'text-slate-900'
                    : 'text-red-700'
                }`}
              >
                {formatCurrency(financialSummary.totalFundsAvailable, currency)}
              </span>
              <span
                className={`text-xs font-semibold ${
                  financialSummary.totalFundsAvailable >= 0
                    ? 'text-emerald-700'
                    : 'text-red-700'
                }`}
              >
                {financialSummary.totalFundsAvailable >= 0
                  ? 'Available Balance'
                  : 'Fund Deficit'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              All expenditures and inventory purchases are drawn from this fund balance.
            </p>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onOpenNewTransaction('fund_deposit')}
                className="h-10 px-3.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Funds
              </button>
              <button
                type="button"
                onClick={() => onOpenNewTransaction('purchase')}
                className="h-10 px-3.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap shrink-0"
              >
                Draw Purchase
              </button>
              <button
                type="button"
                onClick={() => onOpenNewTransaction('operating_expense')}
                className="h-10 px-3.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap shrink-0"
              >
                Draw Expenditure
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="pt-2 lg:pt-0 lg:pr-4">
            <div className="text-xs text-slate-500">Capital &amp; Deposits</div>
            <div className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              +{formatCurrency((budgetConfig.openingFundBalance || 0) + financialSummary.fundDeposits, currency)}
            </div>
          </div>
          <div className="pt-2 lg:pt-0 lg:px-4">
            <div className="text-xs text-slate-500">Sales Added</div>
            <div className="text-sm font-bold text-emerald-700 font-mono tabular-nums mt-0.5">
              +{formatCurrency(financialSummary.totalSales, currency)}
            </div>
          </div>
          <div className="pt-2 lg:pt-0 lg:px-4">
            <div className="text-xs text-slate-500">Purchases Drawn</div>
            <div className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              -{formatCurrency(financialSummary.totalPurchases, currency)}
            </div>
          </div>
          <div className="pt-2 lg:pt-0 lg:pl-4">
            <div className="text-xs text-slate-500">Expenditures Drawn</div>
            <div className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              -{formatCurrency(financialSummary.totalExpenses, currency)}
            </div>
          </div>
        </div>
      </section>

      {/* Primary 4 KPI Summary Strip with "See details" button under each panel */}
      <section aria-label="Key performance metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Total Stock Levels</span>
                <Layers className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2.5 text-2xl font-bold text-slate-900 tabular-nums font-mono">
                {formatInteger(inventorySummary.totalStockLevels)}
              </div>
              <div className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
                <span>{inventorySummary.totalSkus} active SKUs</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  Cost {formatCurrency(inventorySummary.inventoryCostValue, currency)}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => openCategoryDetails('stock_levels')}
                className="w-full h-9 px-3 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center justify-between transition-colors"
              >
                <span>See details</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Stocks Remaining</span>
                <Package className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2.5 text-2xl font-bold text-slate-900 tabular-nums font-mono">
                {formatInteger(inventorySummary.stocksRemaining)}
              </div>
              <div className="mt-1.5 text-xs flex items-center gap-1.5">
                <span className="text-slate-600 tabular-nums">
                  {inventorySummary.stockUtilizationPct.toFixed(1)}% on hand
                </span>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span
                  className={
                    inventorySummary.lowStockCount + inventorySummary.outOfStockCount > 0
                      ? 'font-semibold text-amber-700'
                      : 'text-emerald-700 font-medium'
                  }
                >
                  {inventorySummary.lowStockCount + inventorySummary.outOfStockCount > 0
                    ? `${inventorySummary.lowStockCount + inventorySummary.outOfStockCount} need restock`
                    : 'All stock nominal'}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => openCategoryDetails('stock_remaining')}
                className="w-full h-9 px-3 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center justify-between transition-colors"
              >
                <span>See details</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Total Sales</span>
                <TrendingUp className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2.5 text-2xl font-bold text-slate-900 tabular-nums font-mono">
                {formatCurrency(financialSummary.totalSales, currency)}
              </div>
              <div className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
                <span>{financialSummary.salesCount} recorded sales</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  Gross {formatCurrency(financialSummary.grossProfit, currency)}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => openCategoryDetails('total_sales')}
                className="w-full h-9 px-3 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center justify-between transition-colors"
              >
                <span>See details</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Profit Margins</span>
                <Wallet className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2.5">
                <span
                  className={`text-2xl font-bold tabular-nums font-mono ${
                    financialSummary.netMarginPct >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {financialSummary.netMarginPct.toFixed(1)}%
                </span>
                <span className="text-xs font-medium text-slate-500">Net Margin</span>
              </div>
              <div className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
                <span className="tabular-nums">
                  Gross {financialSummary.grossMarginPct.toFixed(1)}%
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums font-medium text-slate-700">
                  Net {formatCurrency(financialSummary.netProfit, currency)}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => openCategoryDetails('profit_margin')}
                className="w-full h-9 px-3 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center justify-between transition-colors"
              >
                <span>See details</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Secondary Ledger Strip */}
      <section className="bg-white border border-slate-200 rounded-xl px-5 py-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="pt-2 lg:pt-0 lg:pr-4">
            <div className="text-xs text-slate-500">Gross Profit</div>
            <div className="text-base font-bold text-slate-900 tabular-nums font-mono mt-0.5">
              {formatCurrency(financialSummary.grossProfit, currency)}
            </div>
          </div>
          <div className="pt-2 lg:pt-0 lg:px-4">
            <div className="text-xs text-slate-500">Petty Cash Remaining</div>
            <div className="text-base font-bold text-slate-900 tabular-nums font-mono mt-0.5">
              {formatCurrency(financialSummary.pettyCashBalance, currency)}
            </div>
          </div>
          <div className="pt-2 lg:pt-0 lg:px-4">
            <div className="text-xs text-slate-500">Total Expenses</div>
            <div className="text-base font-bold text-slate-900 tabular-nums font-mono mt-0.5">
              {formatCurrency(financialSummary.totalExpenses, currency)}
            </div>
          </div>
          <div className="pt-2 lg:pt-0 lg:pl-4">
            <div className="text-xs text-slate-500">Net Profit (Allocatable)</div>
            <div
              className={`text-base font-bold tabular-nums font-mono mt-0.5 ${
                financialSummary.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {formatCurrency(financialSummary.netProfit, currency)}
            </div>
          </div>
        </div>
      </section>

      {/* Main Split: Net Income Budget Allocation Pie Chart + Inventory Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Net Income Budget Allocation
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Interactive breakdown of {formatCurrency(Math.max(0, financialSummary.netProfit), currency)} net income ({budgetConfig.advertisingPct}% Advertising, {budgetConfig.brandingPct}% Branding &amp; Petty cash, {budgetConfig.reinvestmentPct}% Reinvestment, {budgetConfig.savingsPct}% Savings)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('budget')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              Full Analytics <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <InteractivePieChart
            slices={allocationSlices}
            totalAmount={Math.max(0, financialSummary.netProfit)}
            centerLabel="Net Income"
            currencySymbol={currency}
            emptyMessage="Record sales exceeding costs & expenses to allocate net income."
          />
        </section>

        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Inventory Management Status
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Stock remaining vs. total stocked capacity
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              View Inventory <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {inventory.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-500">No inventory items recorded yet.</p>
              <button
                type="button"
                onClick={() => onNavigate('inventory')}
                className="mt-3 h-10 px-4 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
              >
                Open Inventory
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {inventory.slice(0, 5).map((item) => {
                const ratio =
                  item.totalStockLevel > 0
                    ? Math.min(100, (item.stockRemaining / item.totalStockLevel) * 100)
                    : 0;
                const statusLabel =
                  item.stockRemaining <= 0
                    ? 'Out of Stock'
                    : item.stockRemaining <= item.reorderLevel
                      ? 'Low Stock'
                      : 'In Stock';
                const statusColor =
                  item.stockRemaining <= 0
                    ? 'text-red-700'
                    : item.stockRemaining <= item.reorderLevel
                      ? 'text-amber-700'
                      : 'text-emerald-700';
                const barColor =
                  item.stockRemaining <= 0
                    ? 'bg-red-600'
                    : item.stockRemaining <= item.reorderLevel
                      ? 'bg-amber-500'
                      : 'bg-teal-600';

                return (
                  <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">{item.sku}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.category}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-slate-900 tabular-nums font-mono">
                          {formatInteger(item.stockRemaining)} / {formatInteger(item.totalStockLevel)} {item.unitLabel}
                        </div>
                        <div className={`text-xs font-semibold ${statusColor}`}>
                          {statusLabel}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Monthly & Yearly Sales Revenue vs. Total Stock Levels Graph */}
      <SalesVsStockChart
        transactions={transactions}
        inventory={inventory}
        currencySymbol={currency}
      />

      {/* Recent Transactions */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Transactions</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest sales, purchases, petty cash disbursements, and operating expenses
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('transactions')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            View All Ledger <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500">
              {isAdmin
                ? 'No transactions recorded yet. Log your first sale, purchase, or petty cash expense.'
                : 'No transactions recorded yet.'}
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={() => onOpenNewTransaction('sale')}
                className="mt-3 h-10 px-4 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
              >
                Log First Transaction
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.slice(0, 6).map((tx) => {
              const isInflow =
                tx.type === 'sale' ||
                tx.type === 'petty_cash_topup' ||
                tx.type === 'fund_deposit';
              return (
                <div
                  key={tx.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/60"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {tx.title}
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="font-medium text-slate-700">
                        {TX_TYPE_LABELS[tx.type]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{tx.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{tx.transactionDate}</span>
                      <span aria-hidden="true">·</span>
                      <span>by {tx.createdByUsername}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-bold tabular-nums font-mono ${
                        isInflow ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {isInflow ? '+' : '-'}
                      {formatCurrency(tx.amount, currency)}
                    </div>
                    {tx.type === 'sale' && (
                      <div className="text-xs text-slate-500 tabular-nums font-mono">
                        Profit {formatCurrency(tx.amount - tx.costAmount, currency)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <CategoryDetailsModal
        isOpen={detailsModalOpen}
        initialMetric={selectedMetric}
        onClose={() => setDetailsModalOpen(false)}
        rows={categoryBreakdown}
        inventorySummary={inventorySummary}
        financialSummary={financialSummary}
        currencySymbol={currency}
      />
    </div>
  );
}
