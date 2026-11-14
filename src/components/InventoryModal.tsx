import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { InventoryItem, SCHEMA_LIMITS } from '../types/accounting';
import { InventoryInput } from '../context/LedgerContext';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: InventoryItem | null;
  currencySymbol: string;
  onSave: (input: InventoryInput, editId?: string) => Promise<void>;
}

export function InventoryModal({
  isOpen,
  onClose,
  editingItem = null,
  currencySymbol,
  onSave,
}: InventoryModalProps) {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Finished Goods');
  const [totalStockLevel, setTotalStockLevel] = useState('100');
  const [stockRemaining, setStockRemaining] = useState('100');
  const [reorderLevel, setReorderLevel] = useState('20');
  const [unitCost, setUnitCost] = useState('0');
  const [unitPrice, setUnitPrice] = useState('0');
  const [unitLabel, setUnitLabel] = useState('pcs');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingItem) {
      setSku(editingItem.sku);
      setName(editingItem.name);
      setCategory(editingItem.category);
      setTotalStockLevel(String(editingItem.totalStockLevel));
      setStockRemaining(String(editingItem.stockRemaining));
      setReorderLevel(String(editingItem.reorderLevel));
      setUnitCost(String(editingItem.unitCost));
      setUnitPrice(String(editingItem.unitPrice));
      setUnitLabel(editingItem.unitLabel);
    } else {
      setSku(`SKU-${Math.floor(200 + Math.random() * 799)}`);
      setName('');
      setCategory('Finished Goods');
      setTotalStockLevel('100');
      setStockRemaining('100');
      setReorderLevel('20');
      setUnitCost('5.00');
      setUnitPrice('15.00');
      setUnitLabel('pcs');
    }
  }, [isOpen, editingItem]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sku.trim() || !name.trim()) {
      setError('SKU and item name are required.');
      return;
    }

    const parsedTotal = Math.max(0, Number(totalStockLevel) || 0);
    const parsedRem = Math.max(0, Number(stockRemaining) || 0);
    const parsedReorder = Math.max(0, Number(reorderLevel) || 0);
    const parsedCost = Math.max(0, Number(unitCost) || 0);
    const parsedPrice = Math.max(0, Number(unitPrice) || 0);

    setSaving(true);
    try {
      await onSave(
        {
          sku: sku.trim(),
          name: name.trim(),
          category: category.trim() || 'General',
          totalStockLevel: Math.max(parsedTotal, parsedRem),
          stockRemaining: parsedRem,
          reorderLevel: parsedReorder,
          unitCost: parsedCost,
          unitPrice: parsedPrice,
          unitLabel: unitLabel.trim() || 'pcs',
        },
        editingItem?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save inventory item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inv-modal-title"
    >
      <div className="w-full sm:max-w-lg bg-white border border-slate-200 rounded-t-2xl sm:rounded-xl shadow-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 id="inv-modal-title" className="text-base font-bold text-slate-900">
            {editingItem ? 'Edit Inventory SKU' : 'Add Inventory Item'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">SKU</label>
              <input
                type="text"
                maxLength={SCHEMA_LIMITS.SKU_MAX}
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                required
                className="w-full h-11 px-3 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Item Name
              </label>
              <input
                type="text"
                maxLength={SCHEMA_LIMITS.ITEM_NAME_MAX}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Embossed Gift Carton"
                className="w-full h-11 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Category
              </label>
              <input
                type="text"
                maxLength={SCHEMA_LIMITS.CATEGORY_MAX}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full h-11 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Unit Label
              </label>
              <input
                type="text"
                maxLength={SCHEMA_LIMITS.UNIT_LABEL_MAX}
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                placeholder="pcs, boxes, bags"
                required
                className="w-full h-11 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Total Stock Level
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={totalStockLevel}
                onChange={(e) => setTotalStockLevel(e.target.value)}
                required
                className="w-full h-11 px-3 text-sm tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Remaining
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={stockRemaining}
                onChange={(e) => setStockRemaining(e.target.value)}
                required
                className="w-full h-11 px-3 text-sm tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Low Alert At
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                required
                className="w-full h-11 px-3 text-sm tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Unit Cost ({currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                required
                className="w-full h-11 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Selling Price ({currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                required
                className="w-full h-11 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-11 px-5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg"
            >
              {saving ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
