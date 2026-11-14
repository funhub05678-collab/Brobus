import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  InventoryItem,
  PaymentMethod,
  SCHEMA_LIMITS,
  TransactionRecord,
  TransactionType,
} from '../types/accounting';
import { TransactionInput } from '../context/LedgerContext';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  currencySymbol: string;
  totalFundsAvailable: number;
  initialType?: TransactionType;
  editingTransaction?: TransactionRecord | null;
  isAdmin: boolean;
  onSave: (input: TransactionInput, editId?: string) => Promise<void>;
}

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'sale', label: 'Sale Revenue' },
  { value: 'purchase', label: 'Inventory Purchase (from Funds)' },
  { value: 'petty_cash_expense', label: 'Petty Cash Expense (from Funds)' },
  { value: 'operating_expense', label: 'Operating Expense (from Funds)' },
  { value: 'fund_deposit', label: 'Fund Deposit / Add Capital' },
  { value: 'petty_cash_topup', label: 'Petty Cash Top-Up' },
];

const DEFAULT_CATEGORIES: Record<TransactionType, string> = {
  sale: 'Product Sales',
  purchase: 'Inventory Restock',
  petty_cash_expense: 'Office Supplies',
  operating_expense: 'Utilities & Rent',
  fund_deposit: 'Capital Deposit',
  petty_cash_topup: 'Petty Cash Replenishment',
};

export function TransactionModal({
  isOpen,
  onClose,
  inventory,
  currencySymbol,
  totalFundsAvailable,
  initialType = 'sale',
  editingTransaction = null,
  isAdmin,
  onSave,
}: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>(initialType);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[initialType]);
  const [inventoryItemId, setInventoryItemId] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [amount, setAmount] = useState('');
  const [costAmount, setCostAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingTransaction) {
      setType(editingTransaction.type);
      setTitle(editingTransaction.title);
      setCategory(editingTransaction.category);
      setInventoryItemId(editingTransaction.inventoryItemId || '');
      setQuantity(String(editingTransaction.quantity || 0));
      setAmount(String(editingTransaction.amount));
      setCostAmount(String(editingTransaction.costAmount || 0));
      setPaymentMethod(editingTransaction.paymentMethod);
      setTransactionDate(editingTransaction.transactionDate);
      setNotes(editingTransaction.notes || '');
    } else {
      setType(initialType);
      setTitle('');
      setCategory(DEFAULT_CATEGORIES[initialType]);
      setInventoryItemId('');
      setQuantity('0');
      setAmount('');
      setCostAmount('0');
      setPaymentMethod(initialType === 'petty_cash_expense' ? 'petty_cash' : 'bank');
      setTransactionDate(new Date().toISOString().slice(0, 10));
      setNotes('');
    }
  }, [isOpen, initialType, editingTransaction]);

  if (!isOpen) return null;

  const isNotesOnlyEdit = Boolean(editingTransaction && !isAdmin);
  const selectedItem = inventory.find((item) => item.id === inventoryItemId) || null;
  const showInventoryFields = type === 'sale' || type === 'purchase';

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    setCategory(DEFAULT_CATEGORIES[nextType]);
    if (nextType === 'petty_cash_expense') {
      setPaymentMethod('petty_cash');
    } else if (paymentMethod === 'petty_cash') {
      setPaymentMethod('bank');
    }
    if (nextType !== 'sale' && nextType !== 'purchase') {
      setInventoryItemId('');
      setQuantity('0');
      setCostAmount('0');
    }
  };

  const handleItemOrQtyChange = (nextItemId: string, nextQtyStr: string) => {
    setInventoryItemId(nextItemId);
    setQuantity(nextQtyStr);
    const item = inventory.find((i) => i.id === nextItemId);
    const qty = Math.max(0, Number(nextQtyStr) || 0);
    if (item && qty > 0) {
      if (type === 'sale') {
        setAmount((item.unitPrice * qty).toFixed(2));
        setCostAmount((item.unitCost * qty).toFixed(2));
        if (!title.trim()) {
          setTitle(`Sale: ${item.name} (${qty} ${item.unitLabel})`);
        }
      } else if (type === 'purchase') {
        setAmount((item.unitCost * qty).toFixed(2));
        setCostAmount('0');
        if (!title.trim()) {
          setTitle(`Restock: ${item.name} (${qty} ${item.unitLabel})`);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    const parsedQty = Math.max(0, Number(quantity) || 0);
    const parsedCost = Math.max(0, Number(costAmount) || 0);

    if (!isNotesOnlyEdit) {
      if (!title.trim()) {
        setError('Please enter a transaction description.');
        return;
      }
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        setError('Amount must be greater than zero.');
        return;
      }
      if (!SCHEMA_LIMITS.DATE_REGEX.test(transactionDate)) {
        setError('Please select a valid date.');
        return;
      }
      if (
        !editingTransaction &&
        type === 'sale' &&
        selectedItem &&
        parsedQty > selectedItem.stockRemaining
      ) {
        setError(
          `Only ${selectedItem.stockRemaining} ${selectedItem.unitLabel} remaining for ${selectedItem.name}.`
        );
        return;
      }
    }

    setSaving(true);
    try {
      await onSave(
        {
          type,
          title: title.trim(),
          category: category.trim() || DEFAULT_CATEGORIES[type],
          amount: parsedAmount,
          costAmount: parsedCost,
          quantity: parsedQty,
          inventoryItemId,
          paymentMethod,
          notes: notes.trim(),
          transactionDate,
        },
        editingTransaction?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div className="w-full sm:max-w-lg bg-white border border-slate-200 rounded-t-2xl sm:rounded-xl shadow-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 id="tx-modal-title" className="text-base font-bold text-slate-900">
            {editingTransaction ? 'Edit Transaction' : 'Record Transaction'}
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
          {!isNotesOnlyEdit && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Transaction Type
                </label>
                <select
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value as TransactionType)}
                  disabled={Boolean(editingTransaction)}
                  className="w-full h-11 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 disabled:bg-slate-50"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {showInventoryFields && !editingTransaction && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Link Inventory Item (optional)
                    </label>
                    <select
                      value={inventoryItemId}
                      onChange={(e) => handleItemOrQtyChange(e.target.value, quantity)}
                      className="w-full h-10 px-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-600"
                    >
                      <option value="">None (Direct Entry)</option>
                      {inventory.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.sku} · {item.name} ({item.stockRemaining} left)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={quantity}
                      onChange={(e) => handleItemOrQtyChange(inventoryItemId, e.target.value)}
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Title / Description
                </label>
                <input
                  type="text"
                  maxLength={SCHEMA_LIMITS.TITLE_MAX}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Retail order #104 or Courier fee"
                  required
                  className="w-full h-11 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                />
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
                    Date
                  </label>
                  <input
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    required
                    className="w-full h-11 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Amount ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full h-11 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums font-mono focus:outline-none focus:border-teal-600"
                  />
                </div>

                {type === 'sale' ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Cost Basis / COGS ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={costAmount}
                      onChange={(e) => setCostAmount(e.target.value)}
                      className="w-full h-11 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums font-mono focus:outline-none focus:border-teal-600"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Payment Source
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full h-11 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-600"
                    >
                      <option value="petty_cash">Petty Cash Fund</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="card">Business Card</option>
                      <option value="cash">Cash Register</option>
                    </select>
                  </div>
                )}
              </div>

              {type === 'sale' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full h-11 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-600"
                  >
                    <option value="bank">Bank Transfer</option>
                    <option value="card">Card Payment</option>
                    <option value="cash">Cash</option>
                    <option value="petty_cash">Petty Cash</option>
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Notes / Reference {isNotesOnlyEdit ? '(Standard users can update notes)' : '(optional)'}
            </label>
            <textarea
              rows={2}
              maxLength={SCHEMA_LIMITS.NOTES_MAX}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Receipt number, vendor, or invoice details"
              className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-600"
            />
          </div>

          {!editingTransaction &&
            (type === 'purchase' ||
              type === 'petty_cash_expense' ||
              type === 'operating_expense' ||
              type === 'fund_deposit' ||
              type === 'sale') && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-3">
                <span className="text-slate-600">
                  {type === 'fund_deposit' || type === 'sale'
                    ? 'Funds Available After Entry'
                    : 'Funds Remaining After Draw'}
                </span>
                {(() => {
                  const amt = Math.max(0, Number(amount) || 0);
                  const delta =
                    type === 'fund_deposit' || type === 'sale' ? amt : -amt;
                  const projected = totalFundsAvailable + delta;
                  return (
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        projected >= 0 ? 'text-slate-900' : 'text-red-700'
                      }`}
                    >
                      {currencySymbol}
                      {projected.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      {projected < 0 ? ' (Exceeds Balance)' : ''}
                    </span>
                  );
                })()}
              </div>
            )}

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
              {saving ? 'Saving...' : editingTransaction ? 'Save Changes' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
