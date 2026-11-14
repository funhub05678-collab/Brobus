import {
  AllocationSlice,
  BudgetConfig,
  CategoryBreakdownRow,
  FinancialSummary,
  InventoryItem,
  InventorySummary,
  TransactionRecord,
} from '../types/accounting';

export function computeFinancialSummary(
  transactions: TransactionRecord[],
  budgetConfig: Pick<BudgetConfig, 'pettyCashOpeningFloat' | 'openingFundBalance'>
): FinancialSummary {
  let totalSales = 0;
  let salesCount = 0;
  let totalPurchases = 0;
  let totalCOGS = 0;
  let pettyCashExpenses = 0;
  let operatingExpenses = 0;
  let pettyCashTopups = 0;
  let fundDeposits = 0;

  for (const tx of transactions) {
    switch (tx.type) {
      case 'sale':
        totalSales += tx.amount;
        totalCOGS += tx.costAmount || 0;
        salesCount += 1;
        break;
      case 'purchase':
        totalPurchases += tx.amount;
        break;
      case 'petty_cash_expense':
        pettyCashExpenses += tx.amount;
        break;
      case 'operating_expense':
        operatingExpenses += tx.amount;
        break;
      case 'petty_cash_topup':
        pettyCashTopups += tx.amount;
        break;
      case 'fund_deposit':
        fundDeposits += tx.amount;
        break;
    }
  }

  // Cost basis: use tracked COGS for inventory-linked sales, plus unlinked purchase costs if COGS is lower
  const effectiveCostOfSales = totalCOGS > 0 ? totalCOGS : totalPurchases;
  const grossProfit = totalSales - effectiveCostOfSales;
  const grossMarginPct = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

  const totalExpenses = pettyCashExpenses + operatingExpenses;
  const netProfit = grossProfit - totalExpenses;
  const netMarginPct = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  const pettyCashBalance =
    (budgetConfig.pettyCashOpeningFloat || 0) + pettyCashTopups - pettyCashExpenses;

  const openingFunds = budgetConfig.openingFundBalance || 0;
  const totalFundsInflow = openingFunds + fundDeposits + totalSales;
  const totalFundsOutflow = totalPurchases + pettyCashExpenses + operatingExpenses;
  const totalFundsAvailable = totalFundsInflow - totalFundsOutflow;

  return {
    totalSales,
    salesCount,
    totalPurchases,
    totalCOGS: effectiveCostOfSales,
    grossProfit,
    grossMarginPct,
    pettyCashExpenses,
    operatingExpenses,
    totalExpenses,
    netProfit,
    netMarginPct,
    pettyCashTopups,
    pettyCashBalance,
    fundDeposits,
    totalFundsInflow,
    totalFundsOutflow,
    totalFundsAvailable,
  };
}

export function computeInventorySummary(items: InventoryItem[]): InventorySummary {
  let totalStockLevels = 0;
  let stocksRemaining = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let inventoryCostValue = 0;
  let potentialRetailValue = 0;

  for (const item of items) {
    totalStockLevels += item.totalStockLevel;
    stocksRemaining += item.stockRemaining;
    inventoryCostValue += item.stockRemaining * item.unitCost;
    potentialRetailValue += item.stockRemaining * item.unitPrice;

    if (item.stockRemaining <= 0) {
      outOfStockCount += 1;
    } else if (item.stockRemaining <= item.reorderLevel) {
      lowStockCount += 1;
    }
  }

  const stockUtilizationPct =
    totalStockLevels > 0 ? (stocksRemaining / totalStockLevels) * 100 : 0;

  return {
    totalSkus: items.length,
    totalStockLevels,
    stocksRemaining,
    stockUtilizationPct,
    lowStockCount,
    outOfStockCount,
    inventoryCostValue,
    potentialRetailValue,
  };
}

export function computeCategoryBreakdown(
  items: InventoryItem[],
  transactions: TransactionRecord[]
): CategoryBreakdownRow[] {
  const itemById = new Map<string, InventoryItem>();
  const map = new Map<string, CategoryBreakdownRow>();

  const ensureCategory = (catName: string): CategoryBreakdownRow => {
    const key = catName.trim() || 'Uncategorized';
    const existing = map.get(key);
    if (existing) return existing;
    const row: CategoryBreakdownRow = {
      category: key,
      skuCount: 0,
      totalStockLevel: 0,
      stockRemaining: 0,
      lowOrOutCount: 0,
      totalSales: 0,
      salesCount: 0,
      unitsSold: 0,
      costOfGoods: 0,
      grossProfit: 0,
      profitMarginPct: 0,
    };
    map.set(key, row);
    return row;
  };

  for (const item of items) {
    itemById.set(item.id, item);
    const row = ensureCategory(item.category);
    row.skuCount += 1;
    row.totalStockLevel += item.totalStockLevel;
    row.stockRemaining += item.stockRemaining;
    if (item.stockRemaining <= item.reorderLevel) {
      row.lowOrOutCount += 1;
    }
  }

  for (const tx of transactions) {
    if (tx.type !== 'sale') continue;
    const linked = tx.inventoryItemId ? itemById.get(tx.inventoryItemId) : undefined;
    const cat = linked ? linked.category : tx.category || 'Direct Sales';
    const row = ensureCategory(cat);
    row.totalSales += tx.amount;
    row.salesCount += 1;
    row.unitsSold += tx.quantity || 0;
    row.costOfGoods += tx.costAmount || 0;
  }

  const rows = Array.from(map.values()).map((row) => {
    const grossProfit = row.totalSales - row.costOfGoods;
    const profitMarginPct = row.totalSales > 0 ? (grossProfit / row.totalSales) * 100 : 0;
    return {
      ...row,
      grossProfit,
      profitMarginPct,
    };
  });

  rows.sort((a, b) => a.category.localeCompare(b.category));
  return rows;
}

export function computeNetIncomeAllocations(
  netProfit: number,
  config: Pick<
    BudgetConfig,
    'advertisingPct' | 'brandingPct' | 'reinvestmentPct' | 'savingsPct'
  >
): AllocationSlice[] {
  const allocatableIncome = Math.max(0, netProfit);

  return [
    {
      id: 'advertising',
      label: 'Advertising',
      subtitle: 'Paid acquisition, campaigns & outreach',
      percentage: config.advertisingPct,
      amount: (allocatableIncome * config.advertisingPct) / 100,
      color: '#2563EB', // Cobalt Blue
    },
    {
      id: 'branding',
      label: 'Branding',
      subtitle: 'Packaging, custom labels & print identity',
      percentage: config.brandingPct,
      amount: (allocatableIncome * config.brandingPct) / 100,
      color: '#D97706', // Warm Amber
    },
    {
      id: 'reinvestment',
      label: 'Reinvestment',
      subtitle: 'Inventory expansion, tooling & operations',
      percentage: config.reinvestmentPct,
      amount: (allocatableIncome * config.reinvestmentPct) / 100,
      color: '#0D9488', // Deep Teal
    },
    {
      id: 'savings',
      label: 'Savings Reserve',
      subtitle: 'Retained earnings & emergency buffer',
      percentage: config.savingsPct,
      amount: (allocatableIncome * config.savingsPct) / 100,
      color: '#0F172A', // Slate Ink
    },
  ];
}

export function computeRevenueDistributionSlices(
  summary: FinancialSummary
): AllocationSlice[] {
  const totalOutflowsAndProfit =
    summary.totalCOGS +
    summary.pettyCashExpenses +
    summary.operatingExpenses +
    Math.max(0, summary.netProfit);

  const safeDenom = totalOutflowsAndProfit > 0 ? totalOutflowsAndProfit : 1;

  return [
    {
      id: 'cogs',
      label: 'Cost of Goods / Purchases',
      subtitle: 'Direct unit cost & inventory supply',
      percentage: (summary.totalCOGS / safeDenom) * 100,
      amount: summary.totalCOGS,
      color: '#475569',
    },
    {
      id: 'petty_cash',
      label: 'Petty Cash Expenses',
      subtitle: 'Small daily disbursements & supplies',
      percentage: (summary.pettyCashExpenses / safeDenom) * 100,
      amount: summary.pettyCashExpenses,
      color: '#D97706',
    },
    {
      id: 'operating',
      label: 'Operating Expenses',
      subtitle: 'Overhead, utilities & recurring bills',
      percentage: (summary.operatingExpenses / safeDenom) * 100,
      amount: summary.operatingExpenses,
      color: '#DC2626',
    },
    {
      id: 'net_profit',
      label: 'Net Income Retained',
      subtitle: 'Bottom-line profit available to allocate',
      percentage: (Math.max(0, summary.netProfit) / safeDenom) * 100,
      amount: Math.max(0, summary.netProfit),
      color: '#059669',
    },
  ];
}

export interface PeriodSalesStockPoint {
  key: string;
  label: string;
  salesRevenue: number;
  totalStockLevels: number;
  salesCount: number;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function extractYearMonthFromTimestamp(ts: unknown, fallback: string): string {
  if (ts && typeof ts === 'object') {
    const maybeToDate = (ts as { toDate?: () => Date }).toDate;
    if (typeof maybeToDate === 'function') {
      const d = maybeToDate.call(ts);
      if (d instanceof Date && !Number.isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
    }
    const seconds = (ts as { seconds?: number }).seconds;
    if (typeof seconds === 'number') {
      const d = new Date(seconds * 1000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }
  return fallback;
}

export function getAvailableChartYears(
  transactions: TransactionRecord[],
  inventory: InventoryItem[],
  fallbackYear = new Date().getFullYear()
): number[] {
  const yearSet = new Set<number>([fallbackYear]);
  const fallbackYm = `${fallbackYear}-01`;

  for (const tx of transactions) {
    if (tx.type === 'sale' || tx.type === 'purchase') {
      const y = Number(tx.transactionDate.slice(0, 4));
      if (Number.isFinite(y) && y >= 1970 && y <= 2100) {
        yearSet.add(y);
      }
    }
  }
  for (const item of inventory) {
    const ym = extractYearMonthFromTimestamp(item.createdAt, fallbackYm);
    const y = Number(ym.slice(0, 4));
    if (Number.isFinite(y) && y >= 1970 && y <= 2100) {
      yearSet.add(y);
    }
  }

  return Array.from(yearSet).sort((a, b) => b - a);
}

function buildStockAdditionsByYearMonth(
  transactions: TransactionRecord[],
  inventory: InventoryItem[],
  currentYearMonth: string
): Map<string, number> {
  const additions = new Map<string, number>();

  // Track linked purchase quantities per inventory item so we don't double-count restocks
  const linkedPurchasesByItem = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type === 'purchase' && tx.inventoryItemId && tx.quantity > 0) {
      linkedPurchasesByItem.set(
        tx.inventoryItemId,
        (linkedPurchasesByItem.get(tx.inventoryItemId) || 0) + tx.quantity
      );
      const ym = tx.transactionDate.slice(0, 7);
      additions.set(ym, (additions.get(ym) || 0) + tx.quantity);
    }
  }

  for (const item of inventory) {
    const ym = extractYearMonthFromTimestamp(item.createdAt, currentYearMonth);
    const linkedQty = linkedPurchasesByItem.get(item.id) || 0;
    const initialLevel = Math.max(0, item.totalStockLevel - linkedQty);
    if (initialLevel > 0) {
      additions.set(ym, (additions.get(ym) || 0) + initialLevel);
    }
  }

  return additions;
}

export function computeMonthlySalesAndStockLevels(
  transactions: TransactionRecord[],
  inventory: InventoryItem[],
  year: number,
  now = new Date()
): PeriodSalesStockPoint[] {
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const additions = buildStockAdditionsByYearMonth(transactions, inventory, currentYm);

  // Sum stock added prior to the selected year as baseline
  let runningStockLevel = 0;
  for (const [ym, qty] of additions.entries()) {
    const y = Number(ym.slice(0, 4));
    if (y < year) {
      runningStockLevel += qty;
    }
  }

  const points: PeriodSalesStockPoint[] = MONTH_NAMES.map((label, idx) => {
    const ym = `${year}-${String(idx + 1).padStart(2, '0')}`;
    runningStockLevel += additions.get(ym) || 0;
    const isFutureMonth = ym > currentYm;
    return {
      key: ym,
      label,
      salesRevenue: 0,
      totalStockLevels: isFutureMonth ? 0 : runningStockLevel,
      salesCount: 0,
    };
  });

  for (const tx of transactions) {
    if (tx.type !== 'sale') continue;
    const txYear = Number(tx.transactionDate.slice(0, 4));
    const txMonth = Number(tx.transactionDate.slice(5, 7));
    if (txYear !== year || txMonth < 1 || txMonth > 12) continue;

    const bucket = points[txMonth - 1];
    bucket.salesRevenue += tx.amount;
    bucket.salesCount += 1;
  }

  return points;
}

export function computeYearlySalesAndStockLevels(
  transactions: TransactionRecord[],
  inventory: InventoryItem[],
  now = new Date()
): PeriodSalesStockPoint[] {
  const currentYear = now.getFullYear();
  const currentYm = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const years = getAvailableChartYears(transactions, inventory, currentYear).sort(
    (a, b) => a - b
  );
  const additions = buildStockAdditionsByYearMonth(transactions, inventory, currentYm);

  const additionsByYear = new Map<number, number>();
  for (const [ym, qty] of additions.entries()) {
    const y = Number(ym.slice(0, 4));
    additionsByYear.set(y, (additionsByYear.get(y) || 0) + qty);
  }

  let runningStockLevel = 0;
  const map = new Map<number, PeriodSalesStockPoint>();

  for (const y of years) {
    runningStockLevel += additionsByYear.get(y) || 0;
    map.set(y, {
      key: String(y),
      label: String(y),
      salesRevenue: 0,
      totalStockLevels: y > currentYear ? 0 : runningStockLevel,
      salesCount: 0,
    });
  }

  for (const tx of transactions) {
    if (tx.type !== 'sale') continue;
    const txYear = Number(tx.transactionDate.slice(0, 4));
    const bucket = map.get(txYear);
    if (!bucket) continue;
    bucket.salesRevenue += tx.amount;
    bucket.salesCount += 1;
  }

  return Array.from(map.values());
}

export function formatCurrency(value: number, symbol = 'Rs '): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const formattedPrefix = symbol.endsWith(' ') || symbol === '$' ? symbol : `${symbol} `;
  return `${sign}${formattedPrefix}${abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatInteger(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

export function generateDocId(prefix: string): string {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${randomPart}`;
}
