import React, { useState } from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  Boxes,
  PieChart,
  LogOut,
  Menu,
  X,
  Plus,
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { DashboardHome } from './DashboardHome';
import { TransactionsView } from './TransactionsView';
import { InventoryView } from './InventoryView';
import { BudgetAllocationView } from './BudgetAllocationView';
import { TransactionModal } from './TransactionModal';
import { InventoryModal } from './InventoryModal';
import {
  InventoryItem,
  TransactionRecord,
  TransactionType,
} from '../types/accounting';

type NavTab = 'home' | 'transactions' | 'inventory' | 'budget';

const NAV_ITEMS: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home', label: 'Overview', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ReceiptText },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'budget', label: 'Budget Allocations', icon: PieChart },
];

const TAB_TITLES: Record<NavTab, string> = {
  home: 'Overview',
  transactions: 'Transactions & Petty Cash',
  inventory: 'Inventory Management',
  budget: 'Budget Allocations',
};

export function WorkspaceShell() {
  const {
    userProfile,
    isAdmin,
    offlineWarning,
    inventory,
    budgetConfig,
    financialSummary,
    logout,
    addTransaction,
    updateTransaction,
    addInventoryItem,
    updateInventoryItem,
  } = useLedger();

  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Transaction modal state
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txInitialType, setTxInitialType] = useState<TransactionType>('sale');
  const [editingTx, setEditingTx] = useState<TransactionRecord | null>(null);

  // Inventory modal state
  const [invModalOpen, setInvModalOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<InventoryItem | null>(null);

  const openNewTransaction = (type: TransactionType = 'sale') => {
    setEditingTx(null);
    setTxInitialType(type);
    setTxModalOpen(true);
  };

  const openEditTransaction = (tx: TransactionRecord) => {
    setEditingTx(tx);
    setTxInitialType(tx.type);
    setTxModalOpen(true);
  };

  const openNewInventory = () => {
    setEditingInv(null);
    setInvModalOpen(true);
  };

  const openEditInventory = (item: InventoryItem) => {
    setEditingInv(item);
    setInvModalOpen(true);
  };

  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-slate-200">
        <div className="h-14 px-5 flex items-center border-b border-slate-200">
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            Meridian Ledger
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full h-11 px-3.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="text-xs">
            <div className="font-semibold text-slate-900 truncate">
              {userProfile?.displayName || userProfile?.username}
            </div>
            <div className="text-slate-500 mt-0.5">
              {userProfile?.username} · {isAdmin ? 'Administrator' : 'Standard User'}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full h-10 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col border-r border-slate-200 z-50">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200">
              <span className="text-base font-bold text-slate-900">
                Meridian Ledger
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full h-11 px-3.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200 space-y-3">
              <div className="text-xs">
                <div className="font-semibold text-slate-900">
                  {userProfile?.displayName || userProfile?.username}
                </div>
                <div className="text-slate-500 mt-0.5">
                  {userProfile?.username} · {isAdmin ? 'Administrator' : 'Standard User'}
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="w-full h-11 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden w-10 h-10 -ml-2 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-slate-500 truncate flex items-center gap-2">
              <span className="hidden sm:inline font-medium text-slate-700">
                Meridian Ledger
              </span>
              <span className="hidden sm:inline text-slate-400">/</span>
              <span className="font-semibold text-slate-900 truncate">
                {TAB_TITLES[activeTab]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => openNewTransaction('sale')}
                className="h-9 px-3.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Entry</span>
              </button>
            ) : (
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                View-only access
              </span>
            )}
          </div>
        </header>

        {offlineWarning && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2.5 text-xs text-amber-900">
            Firestore appears offline. Changes will sync automatically once your connection is restored.
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'home' && (
            <DashboardHome
              onNavigate={setActiveTab}
              onOpenNewTransaction={openNewTransaction}
            />
          )}
          {activeTab === 'transactions' && (
            <TransactionsView
              onOpenNewTransaction={openNewTransaction}
              onEditTransaction={openEditTransaction}
            />
          )}
          {activeTab === 'inventory' && (
            <InventoryView
              onOpenNewItem={openNewInventory}
              onEditItem={openEditInventory}
              onRestockItem={() => openNewTransaction('purchase')}
            />
          )}
          {activeTab === 'budget' && <BudgetAllocationView />}
        </main>
      </div>

      {/* Modals (Admin only) */}
      {isAdmin && (
        <>
          <TransactionModal
            isOpen={txModalOpen}
            onClose={() => setTxModalOpen(false)}
            inventory={inventory}
            currencySymbol={budgetConfig.currencySymbol || 'Rs '}
            totalFundsAvailable={financialSummary.totalFundsAvailable}
            initialType={txInitialType}
            editingTransaction={editingTx}
            isAdmin={isAdmin}
            onSave={async (input, editId) => {
              if (editId) {
                await updateTransaction(editId, input);
              } else {
                await addTransaction(input);
              }
            }}
          />

          <InventoryModal
            isOpen={invModalOpen}
            onClose={() => setInvModalOpen(false)}
            editingItem={editingInv}
            currencySymbol={budgetConfig.currencySymbol || 'Rs '}
            onSave={async (input, editId) => {
              if (editId) {
                await updateInventoryItem(editId, input);
              } else {
                await addInventoryItem(input);
              }
            }}
          />
        </>
      )}
    </div>
  );
}
