export type UserRole = 'admin' | 'user';
export type AllowedUsername = 'admin' | 'user';

export type TransactionType =
  | 'sale'
  | 'purchase'
  | 'petty_cash_expense'
  | 'operating_expense'
  | 'petty_cash_topup'
  | 'fund_deposit';

export type PaymentMethod = 'petty_cash' | 'bank' | 'cash' | 'card';

export interface UserProfile {
  uid: string;
  username: AllowedUsername;
  displayName: string;
  role: UserRole;
  status: 'active';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TransactionRecord {
  id: string;
  workspaceId: 'primary_ledger';
  type: TransactionType;
  title: string;
  category: string;
  amount: number;
  costAmount: number;
  quantity: number;
  inventoryItemId: string;
  paymentMethod: PaymentMethod;
  notes: string;
  transactionDate: string;
  createdByUid: string;
  createdByUsername: AllowedUsername;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface InventoryItem {
  id: string;
  workspaceId: 'primary_ledger';
  sku: string;
  name: string;
  category: string;
  totalStockLevel: number;
  stockRemaining: number;
  reorderLevel: number;
  unitCost: number;
  unitPrice: number;
  unitLabel: string;
  createdByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BudgetConfig {
  workspaceId: 'primary_ledger';
  advertisingPct: number;
  brandingPct: number;
  reinvestmentPct: number;
  savingsPct: number;
  pettyCashOpeningFloat: number;
  openingFundBalance: number;
  currencySymbol: string;
  resetVersion?: number;
  updatedByUid: string;
  updatedAt?: unknown;
}

export interface CategoryBreakdownRow {
  category: string;
  skuCount: number;
  totalStockLevel: number;
  stockRemaining: number;
  lowOrOutCount: number;
  totalSales: number;
  salesCount: number;
  unitsSold: number;
  costOfGoods: number;
  grossProfit: number;
  profitMarginPct: number;
}

export interface FinancialSummary {
  totalSales: number;
  salesCount: number;
  totalPurchases: number;
  totalCOGS: number;
  grossProfit: number;
  grossMarginPct: number;
  pettyCashExpenses: number;
  operatingExpenses: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPct: number;
  pettyCashTopups: number;
  pettyCashBalance: number;
  fundDeposits: number;
  totalFundsInflow: number;
  totalFundsOutflow: number;
  totalFundsAvailable: number;
}

export interface InventorySummary {
  totalSkus: number;
  totalStockLevels: number;
  stocksRemaining: number;
  stockUtilizationPct: number;
  lowStockCount: number;
  outOfStockCount: number;
  inventoryCostValue: number;
  potentialRetailValue: number;
}

export interface AllocationSlice {
  id: string;
  label: string;
  subtitle: string;
  percentage: number;
  amount: number;
  color: string;
}

export const SCHEMA_LIMITS = {
  ID_MAX: 128,
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
  DATE_REGEX: /^\d{4}-\d{2}-\d{2}$/,
  TITLE_MAX: 120,
  CATEGORY_MAX: 64,
  NOTES_MAX: 500,
  SKU_MAX: 32,
  ITEM_NAME_MAX: 100,
  UNIT_LABEL_MAX: 20,
  CURRENCY_MAX: 8,
} as const;

export const DEFAULT_BUDGET_CONFIG: Omit<BudgetConfig, 'updatedByUid' | 'updatedAt'> = {
  workspaceId: 'primary_ledger',
  advertisingPct: 10,
  brandingPct: 5,
  reinvestmentPct: 50,
  savingsPct: 35,
  pettyCashOpeningFloat: 1500,
  openingFundBalance: 0,
  currencySymbol: 'Rs ',
  resetVersion: 2,
};
