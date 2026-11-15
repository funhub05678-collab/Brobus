import React, { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import {
  computeBalanceSheet,
  computeCashFlowStatement,
  computeProfitAndLoss,
  filterTransactionsByDateRange,
  formatCurrency,
} from '../lib/accounting';

export type StatementType = 'balance_sheet' | 'cash_flow' | 'profit_loss';
type PeriodPreset = 'all' | 'this_year' | 'this_month' | 'custom';

interface FinancialStatementsViewProps {
  statementType: StatementType;
}

export function FinancialStatementsView({
  statementType,
}: FinancialStatementsViewProps) {
  const { transactions, inventory, budgetConfig } = useLedger();

  const now = new Date();
  const currentYear = String(now.getFullYear());
  const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayIso = now.toISOString().slice(0, 10);

  const [preset, setPreset] = useState<PeriodPreset>('all');
  const [customStart, setCustomStart] = useState(`${currentYear}-01-01`);
  const [customEnd, setCustomEnd] = useState(todayIso);

  const currency = budgetConfig.currencySymbol || 'Rs ';

  const { startDate, endDate, periodLabel } = useMemo(() => {
    if (preset === 'this_year') {
      return {
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-12-31`,
        periodLabel: `Fiscal Year ${currentYear}`,
      };
    }
    if (preset === 'this_month') {
      return {
        startDate: `${currentMonth}-01`,
        endDate: `${currentMonth}-31`,
        periodLabel: `Month ${currentMonth}`,
      };
    }
    if (preset === 'custom') {
      return {
        startDate: customStart || undefined,
        endDate: customEnd || undefined,
        periodLabel: `${customStart || 'Start'} to ${customEnd || 'Present'}`,
      };
    }
    return {
      startDate: undefined,
      endDate: undefined,
      periodLabel: 'All Recorded Periods',
    };
  }, [preset, currentYear, currentMonth, customStart, customEnd]);

  const filteredTx = useMemo(
    () => filterTransactionsByDateRange(transactions, startDate, endDate),
    [transactions, startDate, endDate]
  );

  const pnl = useMemo(() => computeProfitAndLoss(filteredTx), [filteredTx]);

  const cashFlow = useMemo(
    () => computeCashFlowStatement(transactions, budgetConfig, startDate, endDate),
    [transactions, budgetConfig, startDate, endDate]
  );

  const balanceSheet = useMemo(
    () => computeBalanceSheet(transactions, inventory, budgetConfig, endDate),
    [transactions, inventory, budgetConfig, endDate]
  );

  const handleExportCsv = () => {
    const rows: string[][] = [];
    if (statementType === 'profit_loss') {
      rows.push(['Profit & Loss Statement', periodLabel]);
      rows.push(['Line Item', `Amount (${currency.trim()})`]);
      rows.push(['REVENUE', '']);
      if (pnl.revenueByCategory.length === 0) {
        rows.push(['Sales Revenue', '0.00']);
      } else {
        for (const item of pnl.revenueByCategory) {
          rows.push([item.label, item.amount.toFixed(2)]);
        }
      }
      rows.push(['Total Revenue', pnl.totalRevenue.toFixed(2)]);
      rows.push(['Cost of Goods Sold (COGS)', (-pnl.cogsAmount).toFixed(2)]);
      rows.push(['Gross Profit', pnl.grossProfit.toFixed(2)]);
      rows.push(['OPERATING & PETTY CASH EXPENSES', '']);
      for (const item of pnl.pettyCashByCategory) {
        rows.push([`Petty Cash - ${item.label}`, item.amount.toFixed(2)]);
      }
      for (const item of pnl.operatingByCategory) {
        rows.push([`Operating - ${item.label}`, item.amount.toFixed(2)]);
      }
      rows.push(['Total Expenses', pnl.totalExpenses.toFixed(2)]);
      rows.push(['Net Profit / (Loss)', pnl.netProfit.toFixed(2)]);
    } else if (statementType === 'cash_flow') {
      rows.push(['Cash Flow Statement', periodLabel]);
      rows.push(['Cash Flow Activity', `Amount (${currency.trim()})`]);
      rows.push(['Cash received from sales', cashFlow.cashFromSales.toFixed(2)]);
      rows.push(['Cash paid for inventory purchases', (-cashFlow.cashPaidPurchases).toFixed(2)]);
      rows.push(['Cash paid for petty cash expenses', (-cashFlow.cashPaidPettyCash).toFixed(2)]);
      rows.push(['Cash paid for operating expenses', (-cashFlow.cashPaidOperating).toFixed(2)]);
      rows.push(['Net cash from operating activities', cashFlow.netOperatingCashFlow.toFixed(2)]);
      rows.push(['Cash paid for capital expenditures (Fixed Assets)', (-cashFlow.cashPaidCapitalExpenditure).toFixed(2)]);
      rows.push(['Net cash from investing activities', cashFlow.netInvestingCashFlow.toFixed(2)]);
      rows.push(['Net cash from financing activities (Capital & deposits)', cashFlow.netFinancingCashFlow.toFixed(2)]);
      rows.push(['Opening cash balance', cashFlow.openingCashBalance.toFixed(2)]);
      rows.push(['Net increase / (decrease) in cash', cashFlow.netChangeInCash.toFixed(2)]);
      rows.push(['Ending cash & funds available', cashFlow.endingCashBalance.toFixed(2)]);
    } else {
      rows.push(['Balance Sheet', endDate ? `As of ${endDate}` : 'As of Current Date']);
      rows.push(['Account', `Amount (${currency.trim()})`]);
      rows.push(['CURRENT ASSETS', '']);
      rows.push(['Cash & Available Funds', balanceSheet.cashAndFundsAsset.toFixed(2)]);
      rows.push(['Inventory on Hand (at Cost)', balanceSheet.inventoryAssetValue.toFixed(2)]);
      rows.push(['Total Current Assets', balanceSheet.totalCurrentAssets.toFixed(2)]);
      rows.push(['NON-CURRENT ASSETS (CAPITAL EXPENDITURE)', '']);
      if (balanceSheet.capitalExpenditureByCategory.length === 0) {
        rows.push(['Capital Expenditure (Fixed Assets)', balanceSheet.capitalExpenditureAsset.toFixed(2)]);
      } else {
        for (const item of balanceSheet.capitalExpenditureByCategory) {
          rows.push([`Capital Expenditure - ${item.label}`, item.amount.toFixed(2)]);
        }
      }
      rows.push(['Total Non-Current Assets', balanceSheet.capitalExpenditureAsset.toFixed(2)]);
      rows.push(['Total Assets', balanceSheet.totalAssets.toFixed(2)]);
      rows.push(['LIABILITIES', '']);
      rows.push(['Cash / Fund Overdraft Deficit', balanceSheet.cashOverdraftLiability.toFixed(2)]);
      rows.push(['Accounts Payable', balanceSheet.accountsPayableLiability.toFixed(2)]);
      rows.push(['Total Liabilities', balanceSheet.totalLiabilities.toFixed(2)]);
      rows.push(['OWNER EQUITY', '']);
      rows.push(['Paid-In Capital & Fund Deposits', balanceSheet.paidInCapital.toFixed(2)]);
      rows.push(['Retained Earnings (Net Profit)', balanceSheet.retainedEarnings.toFixed(2)]);
      rows.push(['Inventory Capital & Stock Valuation Adjustment', balanceSheet.inventoryCapitalAdjustment.toFixed(2)]);
      rows.push(['Total Equity', balanceSheet.totalEquity.toFixed(2)]);
      rows.push(['Total Liabilities & Equity', balanceSheet.totalLiabilitiesAndEquity.toFixed(2)]);
    }

    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meridian-${statementType}-${todayIso}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const titleMap: Record<StatementType, { title: string; subtitle: string }> = {
    balance_sheet: {
      title: 'Balance Sheet',
      subtitle: 'Statement of financial position showing Assets, Liabilities, and Equity.',
    },
    cash_flow: {
      title: 'Cash Flow Statement',
      subtitle: 'Direct-method summary of operating, investing, and financing cash movements.',
    },
    profit_loss: {
      title: 'Profit & Loss Statement',
      subtitle: 'Income statement detailing sales revenue, cost of goods sold, expenses, and net profit.',
    },
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {titleMap[statementType].title}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {titleMap[statementType].subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="h-10 px-3.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="h-10 px-3.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Statement
          </button>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          {(
            [
              { id: 'all', label: 'All Time' },
              { id: 'this_year', label: `Year ${currentYear}` },
              { id: 'this_month', label: 'This Month' },
              { id: 'custom', label: 'Custom Range' },
            ] as { id: PeriodPreset; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPreset(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                preset === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {preset === 'custom' ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="text-slate-600 font-medium">From</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
            />
            <label className="text-slate-600 font-medium">To</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
            />
          </div>
        ) : (
          <div className="text-xs text-slate-500">
            Reporting scope:{' '}
            <span className="font-semibold text-slate-800">
              {statementType === 'balance_sheet'
                ? endDate
                  ? `As of ${endDate}`
                  : 'As of Current Date'
                : periodLabel}
            </span>
          </div>
        )}
      </div>

      {/* PROFIT & LOSS STATEMENT */}
      {statementType === 'profit_loss' && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ledger Book — Profit &amp; Loss Statement
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{periodLabel}</p>
            </div>
            <div className="text-xs text-slate-500 font-mono tabular-nums">
              Gross Margin {pnl.grossMarginPct.toFixed(1)}% · Net Margin {pnl.netMarginPct.toFixed(1)}%
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Revenue */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 pb-2 border-b border-slate-200">
                Revenue
              </h3>
              <div className="divide-y divide-slate-100 text-sm">
                {pnl.revenueByCategory.length === 0 ? (
                  <div className="py-2.5 flex justify-between text-slate-500">
                    <span>Sales Revenue</span>
                    <span className="font-mono tabular-nums">{formatCurrency(0, currency)}</span>
                  </div>
                ) : (
                  pnl.revenueByCategory.map((item) => (
                    <div key={item.label} className="py-2.5 flex justify-between gap-4">
                      <span className="text-slate-700">{item.label}</span>
                      <span className="font-mono tabular-nums text-slate-900">
                        {formatCurrency(item.amount, currency)}
                      </span>
                    </div>
                  ))
                )}
                <div className="py-3 flex justify-between font-bold text-slate-900 bg-slate-50/70 px-2 rounded">
                  <span>Total Revenue</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(pnl.totalRevenue, currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cost of Goods Sold */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 pb-2 border-b border-slate-200">
                Cost of Goods Sold
              </h3>
              <div className="divide-y divide-slate-100 text-sm">
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-700">Direct Product Cost / COGS</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    ({formatCurrency(pnl.cogsAmount, currency)})
                  </span>
                </div>
                <div className="py-3 flex justify-between font-bold text-slate-900 bg-slate-50/70 px-2 rounded">
                  <span>Gross Profit</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(pnl.grossProfit, currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Operating & Petty Cash Expenses */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 pb-2 border-b border-slate-200">
                Operating &amp; Petty Cash Expenses
              </h3>
              <div className="divide-y divide-slate-100 text-sm">
                {pnl.pettyCashByCategory.length === 0 &&
                pnl.operatingByCategory.length === 0 ? (
                  <div className="py-2.5 flex justify-between text-slate-500">
                    <span>No expenses recorded in period</span>
                    <span className="font-mono tabular-nums">{formatCurrency(0, currency)}</span>
                  </div>
                ) : (
                  <>
                    {pnl.pettyCashByCategory.map((item) => (
                      <div key={`pc-${item.label}`} className="py-2.5 flex justify-between gap-4">
                        <span className="text-slate-700">
                          Petty Cash · {item.label}
                        </span>
                        <span className="font-mono tabular-nums text-slate-900">
                          {formatCurrency(item.amount, currency)}
                        </span>
                      </div>
                    ))}
                    {pnl.operatingByCategory.map((item) => (
                      <div key={`op-${item.label}`} className="py-2.5 flex justify-between gap-4">
                        <span className="text-slate-700">
                          Operating · {item.label}
                        </span>
                        <span className="font-mono tabular-nums text-slate-900">
                          {formatCurrency(item.amount, currency)}
                        </span>
                      </div>
                    ))}
                  </>
                )}
                <div className="py-3 flex justify-between font-bold text-slate-900 bg-slate-50/70 px-2 rounded">
                  <span>Total Expenses</span>
                  <span className="font-mono tabular-nums">
                    ({formatCurrency(pnl.totalExpenses, currency)})
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Line */}
            <div className="pt-3 border-t-2 border-slate-900 flex items-center justify-between gap-4">
              <div>
                <div className="text-base font-bold text-slate-900">
                  Net Profit / (Loss)
                </div>
                <div className="text-xs text-slate-500">
                  Net margin {pnl.netMarginPct.toFixed(1)}% of total revenue
                </div>
              </div>
              <div
                className={`text-xl font-bold font-mono tabular-nums ${
                  pnl.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {formatCurrency(pnl.netProfit, currency)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CASH FLOW STATEMENT */}
      {statementType === 'cash_flow' && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ledger Book — Cash Flow Statement
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Direct Method · {periodLabel}
              </p>
            </div>
            <div className="text-xs text-slate-500 font-mono tabular-nums">
              Ending Funds {formatCurrency(cashFlow.endingCashBalance, currency)}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Operating Activities */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 pb-2 border-b border-slate-200">
                Cash Flows from Operating Activities
              </h3>
              <div className="divide-y divide-slate-100 text-sm">
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-700">Cash receipts from customer sales</span>
                  <span className="font-mono tabular-nums text-emerald-700">
                    +{formatCurrency(cashFlow.cashFromSales, currency)}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-700">Cash paid for inventory purchases</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    ({formatCurrency(cashFlow.cashPaidPurchases, currency)})
                  </span>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-700">Cash paid for petty cash expenses</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    ({formatCurrency(cashFlow.cashPaidPettyCash, currency)})
                  </span>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-700">Cash paid for operating expenses</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    ({formatCurrency(cashFlow.cashPaidOperating, currency)})
                  </span>
                </div>
                <div className="py-3 flex justify-between font-bold text-slate-900 bg-slate-50/70 px-2 rounded">
                  <span>Net Cash Provided by Operating Activities</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(cashFlow.netOperatingCashFlow, currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Investing Activities */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 pb-2 border-b border-slate-200">
                Cash Flows from Investing Activities
              </h3>
              <div className="divide-y divide-slate-100 text-sm">
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-700">Cash paid for capital expenditures (Fixed Assets)</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    ({formatCurrency(cashFlow.cashPaidCapitalExpenditure, currency)})
                  </span>
                </div>
                <div className="py-3 flex justify-between font-bold text-slate-900 bg-slate-50/70 px-2 rounded">
                  <span>Net Cash Used in Investing Activities</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(cashFlow.netInvestingCashFlow, currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Financing Activities */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 pb-2 border-b border-slate-200">
                Cash Flows from Financing Activities
              </h3>
              <div className="divide-y divide-slate-100 text-sm">
                {!startDate && (
                  <div className="py-2.5 flex justify-between gap-4">
                    <span className="text-slate-700">Opening capital / fund balance</span>
                    <span className="font-mono tabular-nums text-emerald-700">
                      +{formatCurrency(cashFlow.openingFundCapital, currency)}
                    </span>
                  </div>
                )}
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-700">Fund deposits &amp; capital injections</span>
                  <span className="font-mono tabular-nums text-emerald-700">
                    +{formatCurrency(cashFlow.fundDepositsInPeriod, currency)}
                  </span>
                </div>
                <div className="py-3 flex justify-between font-bold text-slate-900 bg-slate-50/70 px-2 rounded">
                  <span>Net Cash Provided by Financing Activities</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(cashFlow.netFinancingCashFlow, currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cash Summary Reconciliation */}
            <div className="pt-4 border-t-2 border-slate-900 space-y-2 text-sm">
              <div className="flex justify-between text-slate-700">
                <span>Cash &amp; Funds at Beginning of Period</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(cashFlow.openingCashBalance, currency)}
                </span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Net Increase / (Decrease) in Funds During Period</span>
                <span className="font-mono tabular-nums font-semibold">
                  {formatCurrency(cashFlow.netChangeInCash, currency)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-base font-bold text-slate-900">
                <span>Ending Total Funds Available</span>
                <span
                  className={`text-xl font-mono tabular-nums ${
                    cashFlow.endingCashBalance >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {formatCurrency(cashFlow.endingCashBalance, currency)}
                </span>
              </div>
              <div className="pt-1 flex justify-between text-xs text-slate-500">
                <span>Memo: Petty Cash Drawer Balance Remaining</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(cashFlow.pettyCashDrawerBalance, currency)}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* BALANCE SHEET */}
      {statementType === 'balance_sheet' && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ledger Book — Balance Sheet
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Statement of Financial Position ·{' '}
                {endDate ? `As of ${endDate}` : 'As of Current Date'}
              </p>
            </div>
            <div
              className={`text-xs font-semibold ${
                balanceSheet.isBalanced ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {balanceSheet.isBalanced
                ? 'Balanced: Assets = Liabilities + Equity'
                : 'Out of Balance'}
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Assets Column */}
            <div className="space-y-5">
              <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-200">
                Assets
              </h3>

              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1">
                  Current Assets
                </div>
                <div className="divide-y divide-slate-100 text-sm">
                  <div className="py-2.5 flex justify-between gap-4">
                    <span className="text-slate-700">Cash &amp; Total Funds Available</span>
                    <span className="font-mono tabular-nums text-slate-900">
                      {formatCurrency(balanceSheet.cashAndFundsAsset, currency)}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <span className="text-slate-700">Inventory on Hand (at Cost)</span>
                    <span className="font-mono tabular-nums text-slate-900">
                      {formatCurrency(balanceSheet.inventoryAssetValue, currency)}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between font-semibold text-slate-900 bg-slate-50/70 px-2 rounded">
                    <span>Total Current Assets</span>
                    <span className="font-mono tabular-nums">
                      {formatCurrency(balanceSheet.totalCurrentAssets, currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1">
                  Non-Current Assets (Capital Expenditure)
                </div>
                <div className="divide-y divide-slate-100 text-sm">
                  {balanceSheet.capitalExpenditureByCategory.length === 0 ? (
                    <div className="py-2.5 flex justify-between gap-4">
                      <span className="text-slate-700">
                        Capital Expenditure (Property &amp; Equipment)
                      </span>
                      <span className="font-mono tabular-nums text-slate-900">
                        {formatCurrency(balanceSheet.capitalExpenditureAsset, currency)}
                      </span>
                    </div>
                  ) : (
                    balanceSheet.capitalExpenditureByCategory.map((item) => (
                      <div key={`capex-${item.label}`} className="py-2.5 flex justify-between gap-4">
                        <span className="text-slate-700">
                          Capital Expenditure · {item.label}
                        </span>
                        <span className="font-mono tabular-nums text-slate-900">
                          {formatCurrency(item.amount, currency)}
                        </span>
                      </div>
                    ))
                  )}
                  <div className="py-2.5 flex justify-between font-semibold text-slate-900 bg-slate-50/70 px-2 rounded">
                    <span>Total Capital Expenditure Assets</span>
                    <span className="font-mono tabular-nums">
                      {formatCurrency(balanceSheet.capitalExpenditureAsset, currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-slate-900 flex justify-between items-center font-bold text-slate-900">
                <span>Total Assets</span>
                <span className="text-lg font-mono tabular-nums">
                  {formatCurrency(balanceSheet.totalAssets, currency)}
                </span>
              </div>
            </div>

            {/* Liabilities & Equity Column */}
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-200">
                  Liabilities &amp; Owner&apos;s Equity
                </h3>

                <div className="mt-3">
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    Current Liabilities
                  </div>
                  <div className="divide-y divide-slate-100 text-sm">
                    <div className="py-2.5 flex justify-between gap-4">
                      <span className="text-slate-700">Fund Overdraft / Deficit</span>
                      <span className="font-mono tabular-nums text-slate-900">
                        {formatCurrency(balanceSheet.cashOverdraftLiability, currency)}
                      </span>
                    </div>
                    <div className="py-2.5 flex justify-between gap-4">
                      <span className="text-slate-700">Accounts Payable</span>
                      <span className="font-mono tabular-nums text-slate-900">
                        {formatCurrency(balanceSheet.accountsPayableLiability, currency)}
                      </span>
                    </div>
                    <div className="py-2.5 flex justify-between font-semibold text-slate-900 bg-slate-50/70 px-2 rounded">
                      <span>Total Liabilities</span>
                      <span className="font-mono tabular-nums">
                        {formatCurrency(balanceSheet.totalLiabilities, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    Owner&apos;s Equity
                  </div>
                  <div className="divide-y divide-slate-100 text-sm">
                    <div className="py-2.5 flex justify-between gap-4">
                      <span className="text-slate-700">Paid-In Capital &amp; Fund Deposits</span>
                      <span className="font-mono tabular-nums text-slate-900">
                        {formatCurrency(balanceSheet.paidInCapital, currency)}
                      </span>
                    </div>
                    <div className="py-2.5 flex justify-between gap-4">
                      <span className="text-slate-700">Retained Earnings (Net Profit)</span>
                      <span
                        className={`font-mono tabular-nums ${
                          balanceSheet.retainedEarnings >= 0
                            ? 'text-emerald-700'
                            : 'text-red-700'
                        }`}
                      >
                        {formatCurrency(balanceSheet.retainedEarnings, currency)}
                      </span>
                    </div>
                    {balanceSheet.inventoryCapitalAdjustment !== 0 && (
                      <div className="py-2.5 flex justify-between gap-4">
                        <span className="text-slate-700">
                          Contributed Stock &amp; Valuation Basis
                        </span>
                        <span className="font-mono tabular-nums text-slate-900">
                          {formatCurrency(balanceSheet.inventoryCapitalAdjustment, currency)}
                        </span>
                      </div>
                    )}
                    <div className="py-2.5 flex justify-between font-semibold text-slate-900 bg-slate-50/70 px-2 rounded">
                      <span>Total Owner&apos;s Equity</span>
                      <span className="font-mono tabular-nums">
                        {formatCurrency(balanceSheet.totalEquity, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-slate-900 flex justify-between items-center font-bold text-slate-900">
                <span>Total Liabilities &amp; Equity</span>
                <span className="text-lg font-mono tabular-nums">
                  {formatCurrency(balanceSheet.totalLiabilitiesAndEquity, currency)}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
