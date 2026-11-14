import React, { useEffect, useState } from 'react';
import { RotateCcw, Check } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import {
  computeNetIncomeAllocations,
  computeRevenueDistributionSlices,
  formatCurrency,
} from '../lib/accounting';
import { InteractivePieChart } from './InteractivePieChart';
import { SalesVsStockChart } from './SalesVsStockChart';

export function BudgetAllocationView() {
  const {
    transactions,
    inventory,
    budgetConfig,
    financialSummary,
    isAdmin,
    updateBudgetConfig,
  } = useLedger();

  const [advertisingPct, setAdvertisingPct] = useState(
    String(budgetConfig.advertisingPct)
  );
  const [brandingPct, setBrandingPct] = useState(String(budgetConfig.brandingPct));
  const [reinvestmentPct, setReinvestmentPct] = useState(
    String(budgetConfig.reinvestmentPct)
  );
  const [savingsPct, setSavingsPct] = useState(String(budgetConfig.savingsPct));
  const [pettyCashOpeningFloat, setPettyCashOpeningFloat] = useState(
    String(budgetConfig.pettyCashOpeningFloat)
  );
  const [openingFundBalance, setOpeningFundBalance] = useState(
    String(budgetConfig.openingFundBalance ?? 0)
  );
  const [currencySymbol, setCurrencySymbol] = useState(
    budgetConfig.currencySymbol || 'Rs '
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAdvertisingPct(String(budgetConfig.advertisingPct));
    setBrandingPct(String(budgetConfig.brandingPct));
    setReinvestmentPct(String(budgetConfig.reinvestmentPct));
    setSavingsPct(String(budgetConfig.savingsPct));
    setPettyCashOpeningFloat(String(budgetConfig.pettyCashOpeningFloat));
    setOpeningFundBalance(String(budgetConfig.openingFundBalance ?? 0));
    setCurrencySymbol(budgetConfig.currencySymbol || 'Rs ');
  }, [budgetConfig]);

  const draftAdv = Math.max(0, Number(advertisingPct) || 0);
  const draftBrand = Math.max(0, Number(brandingPct) || 0);
  const draftReinv = Math.max(0, Number(reinvestmentPct) || 0);
  const draftSav = Math.max(0, Number(savingsPct) || 0);
  const totalPct = draftAdv + draftBrand + draftReinv + draftSav;

  const liveAllocations = computeNetIncomeAllocations(financialSummary.netProfit, {
    advertisingPct: draftAdv,
    brandingPct: draftBrand,
    reinvestmentPct: draftReinv,
    savingsPct: draftSav,
  });

  const revenueSlices = computeRevenueDistributionSlices(financialSummary);
  const currency = currencySymbol.trim() || 'Rs ';

  const handleResetDefault = () => {
    setAdvertisingPct('10');
    setBrandingPct('5');
    setReinvestmentPct('50');
    setSavingsPct('35');
    setError(null);
    setFeedback(null);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);

    if (Math.round(totalPct * 100) / 100 !== 100) {
      setError(`Percentages currently total ${totalPct}%. They must equal exactly 100%.`);
      return;
    }

    setSaving(true);
    try {
      await updateBudgetConfig({
        advertisingPct: draftAdv,
        brandingPct: draftBrand,
        reinvestmentPct: draftReinv,
        savingsPct: draftSav,
        pettyCashOpeningFloat: Math.max(0, Number(pettyCashOpeningFloat) || 0),
        openingFundBalance: Math.max(0, Number(openingFundBalance) || 0),
        currencySymbol: currency,
      });
      setFeedback('Budget allocation rules saved to Firestore.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save budget settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Net Income Budget Allocation &amp; Profit Analytics
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Interactive visualization of net income distribution across advertising, branding (packaging &amp; labels), reinvestment, and savings.
        </p>
      </div>

      {/* Dual Interactive Pie Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900">
              Net Income Allocation Breakdown
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click or hover any segment to inspect allocated funds from{' '}
              <span className="font-mono font-semibold text-slate-800">
                {formatCurrency(Math.max(0, financialSummary.netProfit), currency)}
              </span>{' '}
              net income.
            </p>
          </div>

          <InteractivePieChart
            slices={liveAllocations}
            totalAmount={Math.max(0, financialSummary.netProfit)}
            centerLabel="Net Income"
            currencySymbol={currency}
            emptyMessage="Net profit is currently zero or negative. Add profitable sales to allocate funds."
          />
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900">
              Revenue &amp; Expense Structure
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              How total sales revenue distributes across COGS, petty cash expenses, operating overhead, and net profit.
            </p>
          </div>

          <InteractivePieChart
            slices={revenueSlices}
            totalAmount={
              financialSummary.totalCOGS +
              financialSummary.totalExpenses +
              Math.max(0, financialSummary.netProfit)
            }
            centerLabel="Gross Volume"
            currencySymbol={currency}
            emptyMessage="Record sales and expenses to inspect cost-to-profit structure."
          />
        </section>
      </div>

      <SalesVsStockChart
        transactions={transactions}
        inventory={inventory}
        currencySymbol={currency}
      />

      {/* Allocation Rules & Petty Cash Float Config */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Allocation Rule Configuration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin
                ? 'Adjust percentage splits (must equal 100%) and petty cash opening float.'
                : 'Viewing active company allocation rules. Only Admin can save changes.'}
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={handleResetDefault}
              className="h-9 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset 10 / 5 / 50 / 35 Default
            </button>
          )}
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Advertising (%)
              </label>
              <p className="text-xs text-slate-500 mb-2.5">Marketing &amp; outreach</p>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                disabled={!isAdmin}
                value={advertisingPct}
                onChange={(e) => setAdvertisingPct(e.target.value)}
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Branding (%)
              </label>
              <p className="text-xs text-slate-500 mb-2.5">Packaging &amp; labels</p>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                disabled={!isAdmin}
                value={brandingPct}
                onChange={(e) => setBrandingPct(e.target.value)}
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reinvestment (%)
              </label>
              <p className="text-xs text-slate-500 mb-2.5">Stock &amp; expansion</p>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                disabled={!isAdmin}
                value={reinvestmentPct}
                onChange={(e) => setReinvestmentPct(e.target.value)}
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Savings Reserve (%)
              </label>
              <p className="text-xs text-slate-500 mb-2.5">Retained cash buffer</p>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                disabled={!isAdmin}
                value={savingsPct}
                onChange={(e) => setSavingsPct(e.target.value)}
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Opening Fund Balance ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="1"
                disabled={!isAdmin}
                value={openingFundBalance}
                onChange={(e) => setOpeningFundBalance(e.target.value)}
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Petty Cash Opening Float ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="1"
                disabled={!isAdmin}
                value={pettyCashOpeningFloat}
                onChange={(e) => setPettyCashOpeningFloat(e.target.value)}
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Currency Symbol
              </label>
              <input
                type="text"
                maxLength={4}
                disabled={!isAdmin}
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>
            <div className="flex flex-col justify-end">
              <div className="text-xs text-slate-500 mb-1">Allocation Total</div>
              <div
                className={`h-10 px-3 rounded-lg border flex items-center justify-between text-sm font-mono font-bold tabular-nums ${
                  Math.round(totalPct * 100) / 100 === 100
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                <span>Sum</span>
                <span>{totalPct}%</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {feedback && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {isAdmin && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || Math.round(totalPct * 100) / 100 !== 100}
                className="h-11 px-5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg"
              >
                {saving ? 'Saving...' : 'Save Allocation Rules'}
              </button>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
