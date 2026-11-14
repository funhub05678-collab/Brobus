import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { formatCurrency, formatInteger } from '../lib/accounting';
import { InventoryItem } from '../types/accounting';

interface InventoryViewProps {
  onOpenNewItem: () => void;
  onEditItem: (item: InventoryItem) => void;
  onRestockItem: () => void;
}

type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export function InventoryView({
  onOpenNewItem,
  onEditItem,
  onRestockItem,
}: InventoryViewProps) {
  const {
    inventory,
    inventorySummary,
    budgetConfig,
    isAdmin,
    deleteInventoryItem,
  } = useLedger();

  const [filter, setFilter] = useState<StockFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currency = budgetConfig.currencySymbol || 'Rs ';

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return inventory.filter((item) => {
      if (filter === 'out_of_stock' && item.stockRemaining > 0) return false;
      if (
        filter === 'low_stock' &&
        (item.stockRemaining <= 0 || item.stockRemaining > item.reorderLevel)
      ) {
        return false;
      }
      if (filter === 'in_stock' && item.stockRemaining <= item.reorderLevel) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [inventory, filter, searchQuery]);

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    setDeletingId(id);
    try {
      await deleteInventoryItem(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Inventory Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? 'Monitor total stocked levels, remaining quantities, unit margins, and reorder alerts.'
              : 'View-only access to stocked levels, remaining quantities, unit margins, and reorder alerts.'}
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onRestockItem}
              className="h-10 px-3.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Log Stock Purchase
            </button>
            <button
              type="button"
              onClick={onOpenNewItem}
              className="h-10 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add SKU
            </button>
          </div>
        )}
      </div>

      {/* Inventory KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Total Stock Levels</div>
          <div className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-1">
            {formatInteger(inventorySummary.totalStockLevels)} units
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Across {inventorySummary.totalSkus} catalog SKUs
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Stocks Remaining</div>
          <div className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-1">
            {formatInteger(inventorySummary.stocksRemaining)} units
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {inventorySummary.stockUtilizationPct.toFixed(1)}% of capacity remaining
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Stock Cost Value</div>
          <div className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-1">
            {formatCurrency(inventorySummary.inventoryCostValue, currency)}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            Retail value {formatCurrency(inventorySummary.potentialRetailValue, currency)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Restock Alerts</div>
          <div
            className={`text-lg font-bold font-mono tabular-nums mt-1 ${
              inventorySummary.lowStockCount + inventorySummary.outOfStockCount > 0
                ? 'text-amber-700'
                : 'text-emerald-700'
            }`}
          >
            {inventorySummary.lowStockCount + inventorySummary.outOfStockCount} items
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {inventorySummary.outOfStockCount} out of stock · {inventorySummary.lowStockCount} low
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: 'All SKUs' },
                { id: 'in_stock', label: 'In Stock' },
                { id: 'low_stock', label: 'Low Stock' },
                { id: 'out_of_stock', label: 'Out of Stock' },
              ] as { id: StockFilter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filter === tab.id
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
              placeholder="Search SKU, name, category..."
              className="w-full h-10 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-600"
            />
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-500">No inventory items match this view.</p>
            {isAdmin && (
              <button
                type="button"
                onClick={onOpenNewItem}
                className="mt-3 h-10 px-4 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
              >
                Add Inventory Item
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Item &amp; Category</th>
                    <th className="py-3 px-4">Stock Level</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Unit Cost</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-right">Margin</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredItems.map((item) => {
                    const ratio =
                      item.totalStockLevel > 0
                        ? Math.min(100, (item.stockRemaining / item.totalStockLevel) * 100)
                        : 0;
                    const unitMargin =
                      item.unitPrice > 0
                        ? ((item.unitPrice - item.unitCost) / item.unitPrice) * 100
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

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono text-xs font-medium text-slate-700 whitespace-nowrap">
                          {item.sku}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.category}</div>
                        </td>
                        <td className="py-3 px-4 min-w-[160px]">
                          <div className="text-xs font-mono tabular-nums font-semibold text-slate-900">
                            {formatInteger(item.stockRemaining)} /{' '}
                            {formatInteger(item.totalStockLevel)} {item.unitLabel}
                          </div>
                          <div className="mt-1.5 h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.stockRemaining <= 0
                                  ? 'bg-red-600'
                                  : item.stockRemaining <= item.reorderLevel
                                    ? 'bg-amber-500'
                                    : 'bg-teal-600'
                              }`}
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                        </td>
                        <td className={`py-3 px-4 text-xs font-semibold whitespace-nowrap ${statusColor}`}>
                          {statusLabel}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {formatCurrency(item.unitCost, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                          {formatCurrency(item.unitPrice, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold text-emerald-700 whitespace-nowrap">
                          {unitMargin.toFixed(1)}%
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onEditItem(item)}
                                aria-label={`Edit ${item.name}`}
                                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === item.id}
                                onClick={() => handleDelete(item.id)}
                                aria-label={`Delete ${item.name}`}
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
              {filteredItems.map((item) => {
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

                return (
                  <div key={item.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          <span className="font-mono">{item.sku}</span> · {item.category}
                        </div>
                      </div>
                      <span className={`text-xs font-semibold shrink-0 ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-slate-500 block">Remaining</span>
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {formatInteger(item.stockRemaining)} / {formatInteger(item.totalStockLevel)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Cost</span>
                        <span className="font-mono font-semibold text-slate-700 tabular-nums">
                          {formatCurrency(item.unitCost, currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Price</span>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(item.unitPrice, currency)}
                        </span>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onEditItem(item)}
                          className="h-9 px-3 text-xs font-medium text-slate-700 border border-slate-200 rounded-md"
                        >
                          Edit SKU
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={() => handleDelete(item.id)}
                          className="h-9 px-3 text-xs font-medium text-red-700 border border-red-200 rounded-md"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
