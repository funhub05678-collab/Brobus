import React, { useMemo, useState } from 'react';
import { Download, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { formatCurrency } from '../lib/accounting';
import { TransactionRecord, TransactionType } from '../types/accounting';

interface TransactionsViewProps {
  onOpenNewTransaction: (type?: TransactionType) => void;
  onEditTransaction: (tx: TransactionRecord) => void;
}

const FILTER_TABS: { id: 'all' | TransactionType; label: string }[] = [
  { id: 'all', label: 'All Entries' },
  { id: 'fund_deposit', label: 'Fund Deposits' },
  { id: 'sale', label: 'Sales' },
  { id: 'purchase', label: 'Purchases' },
  { id: 'petty_cash_expense', label: 'Petty Cash' },
  { id: 'operating_expense', label: 'Operating' },
];

const TYPE_DISPLAY: Record<TransactionType, string> = {
  sale: 'Sale Revenue',
  purchase: 'Purchase',
  petty_cash_expense: 'Petty Cash Expense',
  operating_expense: 'Operating Expense',
  petty_cash_topup: 'Petty Cash Top-Up',
  fund_deposit: 'Fund Deposit',
};

export function TransactionsView({
  onOpenNewTransaction,
  onEditTransaction,
}: TransactionsViewProps) {
  const {
    transactions,
    inventory,
    budgetConfig,
    financialSummary,
    isAdmin,
    deleteTransaction,
    clearAllRecords,
  } = useLedger();

  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const currency = budgetConfig.currencySymbol || 'Rs ';

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (!q) return true;
      return (
        tx.title.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        tx.notes.toLowerCase().includes(q) ||
        tx.transactionDate.includes(q)
      );
    });
  }, [transactions, filterType, searchQuery]);

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    setDeletingId(id);
    try {
      await deleteTransaction(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!isAdmin) return;
    setClearingAll(true);
    try {
      await clearAllRecords();
      setConfirmClearOpen(false);
    } finally {
      setClearingAll(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Date',
      'Type',
      'Title',
      'Category',
      'PaymentMethod',
      'Amount',
      'CostBasis',
      'Quantity',
      'RecordedBy',
      'Notes',
    ];
    const rows = filteredTransactions.map((tx) =>
      [
        tx.transactionDate,
        TYPE_DISPLAY[tx.type],
        `"${tx.title.replace(/"/g, '""')}"`,
        `"${tx.category.replace(/"/g, '""')}"`,
        tx.paymentMethod,
        tx.amount.toFixed(2),
        tx.costAmount.toFixed(2),
        tx.quantity,
        tx.createdByUsername,
        `"${(tx.notes || '').replace(/"/g, '""')}"`,
      ].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meridian-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Transactions &amp; Petty Cash Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? 'Record sales, purchases, petty cash disbursements, operating expenses, and net profit calculations.'
              : 'View-only access to all recorded sales, purchases, petty cash disbursements, and operating expenses.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredTransactions.length === 0}
            className="h-10 px-3.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          {isAdmin && (
            <>
              {(transactions.length > 0 || inventory.length > 0) && (
                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(true)}
                  className="h-10 px-3.5 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 whitespace-nowrap shrink-0"
                >
                  Delete All Records
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenNewTransaction('petty_cash_expense')}
                className="h-10 px-3.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                Log Petty Cash
              </button>
              <button
                type="button"
                onClick={() => onOpenNewTransaction('sale')}
                className="h-10 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                New Transaction
              </button>
            </>
          )}
        </div>
      </div>

      {/* Funds & Profit Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Total Funds Available</div>
          <div
            className={`text-lg font-bold font-mono tabular-nums mt-1 ${
              financialSummary.totalFundsAvailable >= 0 ? 'text-slate-900' : 'text-red-700'
            }`}
          >
            {formatCurrency(financialSummary.totalFundsAvailable, currency)}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            In {formatCurrency(financialSummary.totalFundsInflow, currency)} · Out {formatCurrency(financialSummary.totalFundsOutflow, currency)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Petty Cash Balance</div>
          <div className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-1">
            {formatCurrency(financialSummary.pettyCashBalance, currency)}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            Float {formatCurrency(budgetConfig.pettyCashOpeningFloat + financialSummary.pettyCashTopups, currency)} · Spent {formatCurrency(financialSummary.pettyCashExpenses, currency)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Total Purchases</div>
          <div className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-1">
            {formatCurrency(financialSummary.totalPurchases, currency)}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            COGS basis {formatCurrency(financialSummary.totalCOGS, currency)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Net Profit</div>
          <div
            className={`text-lg font-bold font-mono tabular-nums mt-1 ${
              financialSummary.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {formatCurrency(financialSummary.netProfit, currency)}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {financialSummary.netMarginPct.toFixed(1)}% net margin
          </div>
        </div>
      </div>

      {/* Filter Tabs + Search */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filterType === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, category, date..."
              className="w-full h-10 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-600"
            />
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-500">
              No transactions recorded yet.
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={() => onOpenNewTransaction('sale')}
                className="mt-3 h-10 px-4 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
              >
                Add Transaction
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Profit Impact</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredTransactions.map((tx) => {
                    const isInflow =
                      tx.type === 'sale' ||
                      tx.type === 'petty_cash_topup' ||
                      tx.type === 'fund_deposit';
                    const profitImpact =
                      tx.type === 'sale'
                        ? tx.amount - tx.costAmount
                        : tx.type === 'petty_cash_expense' || tx.type === 'operating_expense'
                          ? -tx.amount
                          : 0;

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 text-xs font-mono tabular-nums text-slate-600 whitespace-nowrap">
                          {tx.transactionDate}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-semibold text-slate-900 truncate">
                            {tx.title}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {tx.category}
                            {tx.notes ? ` · ${tx.notes}` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                          {TYPE_DISPLAY[tx.type]}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 capitalize whitespace-nowrap">
                          {tx.paymentMethod.replace('_', ' ')}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                            isInflow ? 'text-emerald-700' : 'text-slate-900'
                          }`}
                        >
                          {isInflow ? '+' : '-'}
                          {formatCurrency(tx.amount, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                          {profitImpact === 0
                            ? '—'
                            : `${profitImpact > 0 ? '+' : ''}${formatCurrency(profitImpact, currency)}`}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onEditTransaction(tx)}
                                aria-label={`Edit ${tx.title}`}
                                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === tx.id}
                                onClick={() => handleDelete(tx.id)}
                                aria-label={`Delete ${tx.title}`}
                                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-40"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredTransactions.map((tx) => {
                const isInflow =
                  tx.type === 'sale' ||
                  tx.type === 'petty_cash_topup' ||
                  tx.type === 'fund_deposit';
                return (
                  <div key={tx.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">
                          {tx.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {TYPE_DISPLAY[tx.type]} · {tx.category}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-bold font-mono tabular-nums shrink-0 ${
                          isInflow ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {isInflow ? '+' : '-'}
                        {formatCurrency(tx.amount, currency)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span className="font-mono tabular-nums">
                        {tx.transactionDate} · {tx.paymentMethod.replace('_', ' ')}
                      </span>
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onEditTransaction(tx)}
                            className="h-9 px-2.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === tx.id}
                            onClick={() => handleDelete(tx.id)}
                            className="h-9 px-2.5 text-xs font-medium text-red-700 border border-red-200 rounded-md"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Confirm Clear All Modal */}
      {confirmClearOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-lg">
            <h2 className="text-base font-bold text-slate-900">
              Delete All Records &amp; Transactions?
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              This will permanently remove all transactions and inventory records from Firestore. Budget allocation percentages will be preserved.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="h-10 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={clearingAll}
                onClick={handleClearAll}
                className="h-10 px-4 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg"
              >
                {clearingAll ? 'Deleting...' : 'Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
