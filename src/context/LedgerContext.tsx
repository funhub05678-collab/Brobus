import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  AllowedUsername,
  BudgetConfig,
  CategoryBreakdownRow,
  DEFAULT_BUDGET_CONFIG,
  FinancialSummary,
  InventoryItem,
  InventorySummary,
  PaymentMethod,
  SCHEMA_LIMITS,
  TransactionRecord,
  TransactionType,
  UserProfile,
} from '../types/accounting';
import { auth, db, handleFirestoreError, OperationType, testFirestoreConnection } from '../lib/firebase';
import {
  computeCategoryBreakdown,
  computeFinancialSummary,
  computeInventorySummary,
  generateDocId,
} from '../lib/accounting';

const ACCOUNT_MAP: Record<AllowedUsername, { email: string; password: string; displayName: string; role: 'admin' | 'user' }> = {
  admin: {
    email: 'admin@ledgerflow.local',
    password: 'arlo1234',
    displayName: 'Arlo Admin',
    role: 'admin',
  },
  niraj: {
    email: 'niraj@ledgerflow.local',
    password: 'niraj1234',
    displayName: 'Niraj User',
    role: 'user',
  },
};

export interface TransactionInput {
  type: TransactionType;
  title: string;
  category: string;
  amount: number;
  costAmount?: number;
  quantity?: number;
  inventoryItemId?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  transactionDate: string;
}

export interface InventoryInput {
  sku: string;
  name: string;
  category: string;
  totalStockLevel: number;
  stockRemaining: number;
  reorderLevel: number;
  unitCost: number;
  unitPrice: number;
  unitLabel: string;
}

interface LedgerContextValue {
  authReady: boolean;
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  dataLoading: boolean;
  authError: string | null;
  providerSetupRequired: boolean;
  offlineWarning: boolean;
  transactions: TransactionRecord[];
  inventory: InventoryItem[];
  budgetConfig: BudgetConfig;
  financialSummary: FinancialSummary;
  inventorySummary: InventorySummary;
  categoryBreakdown: CategoryBreakdownRow[];
  loginWithCredentials: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
  addTransaction: (input: TransactionInput) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<TransactionInput>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addInventoryItem: (input: InventoryInput) => Promise<void>;
  updateInventoryItem: (id: string, updates: Partial<InventoryInput>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  updateBudgetConfig: (
    updates: Pick<
      BudgetConfig,
      | 'advertisingPct'
      | 'brandingPct'
      | 'reinvestmentPct'
      | 'savingsPct'
      | 'pettyCashOpeningFloat'
      | 'openingFundBalance'
      | 'currencySymbol'
    >
  ) => Promise<void>;
  clearAllRecords: () => Promise<void>;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

function resolveAccountByEmail(email: string | null | undefined): AllowedUsername | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  if (normalized === ACCOUNT_MAP.admin.email) return 'admin';
  if (normalized === ACCOUNT_MAP.niraj.email) return 'niraj';
  return null;
}

async function purgeAllWorkspaceCollections(): Promise<void> {
  const txSnap = await getDocs(
    query(collection(db, 'transactions'), where('workspaceId', '==', 'primary_ledger'))
  );
  const invSnap = await getDocs(
    query(collection(db, 'inventory'), where('workspaceId', '==', 'primary_ledger'))
  );

  const refs = [...txSnap.docs.map((d) => d.ref), ...invSnap.docs.map((d) => d.ref)];
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    for (const ref of refs.slice(i, i + 400)) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}

export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [providerSetupRequired, setProviderSetupRequired] = useState(false);
  const [offlineWarning, setOfflineWarning] = useState(false);

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [budgetConfig, setBudgetConfig] = useState<BudgetConfig>({
    ...DEFAULT_BUDGET_CONFIG,
    updatedByUid: 'system',
  });

  useEffect(() => {
    testFirestoreConnection().then((ok) => {
      if (!ok) setOfflineWarning(true);
    });
  }, []);

  useEffect(() => {
    let unsubTx: (() => void) | null = null;
    let unsubInv: (() => void) | null = null;
    let unsubBudget: (() => void) | null = null;

    const cleanupListeners = () => {
      if (unsubTx) unsubTx();
      if (unsubInv) unsubInv();
      if (unsubBudget) unsubBudget();
      unsubTx = null;
      unsubInv = null;
      unsubBudget = null;
    };

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      cleanupListeners();

      if (!user) {
        setFirebaseUser(null);
        setUserProfile(null);
        setTransactions([]);
        setInventory([]);
        setBudgetConfig({
          ...DEFAULT_BUDGET_CONFIG,
          updatedByUid: 'system',
        });
        setDataLoading(false);
        setAuthReady(true);
        return;
      }

      const username = resolveAccountByEmail(user.email);
      if (!username) {
        await signOut(auth);
        setFirebaseUser(null);
        setUserProfile(null);
        setAuthError('Access is restricted strictly to authorized accounts.');
        setAuthReady(true);
        return;
      }

      setFirebaseUser(user);
      setDataLoading(true);

      const accountMeta = ACCOUNT_MAP[username];
      const userDocRef = doc(db, 'users', user.uid);

      try {
        if (username === 'admin') {
          const adminDocRef = doc(db, 'admins', user.uid);
          const adminSnap = await getDoc(adminDocRef);
          if (!adminSnap.exists()) {
            await setDoc(adminDocRef, {
              username: 'admin',
              createdAt: serverTimestamp(),
            });
          }
        }

        const userSnap = await getDoc(userDocRef);
        if (!userSnap.exists()) {
          const newProfile: UserProfile = {
            uid: user.uid,
            username,
            displayName: accountMeta.displayName,
            role: accountMeta.role,
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(userDocRef, newProfile);
          setUserProfile({ ...newProfile, role: accountMeta.role });
        } else {
          setUserProfile(userSnap.data() as UserProfile);
        }

        // Only admin writes/migrates budget_config and executes one-time v2 purge
        if (username === 'admin') {
          const budgetDocRef = doc(db, 'budget_config', 'default');
          const budgetSnap = await getDoc(budgetDocRef);
          if (!budgetSnap.exists()) {
            await setDoc(budgetDocRef, {
              ...DEFAULT_BUDGET_CONFIG,
              updatedByUid: user.uid,
              updatedAt: serverTimestamp(),
            });
          } else {
            const existingBudget = budgetSnap.data() as BudgetConfig;
            if ((existingBudget.resetVersion ?? 1) < 2) {
              await purgeAllWorkspaceCollections();
              await setDoc(budgetDocRef, {
                workspaceId: 'primary_ledger',
                advertisingPct: existingBudget.advertisingPct ?? 10,
                brandingPct: existingBudget.brandingPct ?? 5,
                reinvestmentPct: existingBudget.reinvestmentPct ?? 50,
                savingsPct: existingBudget.savingsPct ?? 35,
                pettyCashOpeningFloat: existingBudget.pettyCashOpeningFloat ?? 1500,
                openingFundBalance: existingBudget.openingFundBalance ?? 0,
                currencySymbol: 'Rs ',
                resetVersion: 2,
                updatedByUid: user.uid,
                updatedAt: serverTimestamp(),
              });
            } else if (existingBudget.openingFundBalance === undefined) {
              await setDoc(budgetDocRef, {
                workspaceId: 'primary_ledger',
                advertisingPct: existingBudget.advertisingPct ?? 10,
                brandingPct: existingBudget.brandingPct ?? 5,
                reinvestmentPct: existingBudget.reinvestmentPct ?? 50,
                savingsPct: existingBudget.savingsPct ?? 35,
                pettyCashOpeningFloat: existingBudget.pettyCashOpeningFloat ?? 1500,
                openingFundBalance: 0,
                currencySymbol: existingBudget.currencySymbol || 'Rs ',
                resetVersion: 2,
                updatedByUid: user.uid,
                updatedAt: serverTimestamp(),
              });
            }
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }

      let txLoaded = false;
      let invLoaded = false;
      let budgetLoaded = false;

      const checkReady = () => {
        if (txLoaded && invLoaded && budgetLoaded) {
          setDataLoading(false);
        }
      };

      const txQuery = query(
        collection(db, 'transactions'),
        where('workspaceId', '==', 'primary_ledger')
      );
      unsubTx = onSnapshot(
        txQuery,
        (snapshot) => {
          const rows = snapshot.docs.map((d) => d.data() as TransactionRecord);
          rows.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
          setTransactions(rows);
          txLoaded = true;
          checkReady();
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'transactions')
      );

      const invQuery = query(
        collection(db, 'inventory'),
        where('workspaceId', '==', 'primary_ledger')
      );
      unsubInv = onSnapshot(
        invQuery,
        (snapshot) => {
          const rows = snapshot.docs.map((d) => d.data() as InventoryItem);
          rows.sort((a, b) => a.sku.localeCompare(b.sku));
          setInventory(rows);
          invLoaded = true;
          checkReady();
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'inventory')
      );

      const budgetQuery = query(
        collection(db, 'budget_config'),
        where('workspaceId', '==', 'primary_ledger')
      );
      unsubBudget = onSnapshot(
        budgetQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const loaded = snapshot.docs[0].data() as BudgetConfig;
            setBudgetConfig({
              ...loaded,
              openingFundBalance: loaded.openingFundBalance ?? 0,
              currencySymbol:
                (loaded.resetVersion ?? 1) < 2 && loaded.currencySymbol === '$'
                  ? 'Rs '
                  : loaded.currencySymbol || 'Rs ',
            });
          }
          budgetLoaded = true;
          checkReady();
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'budget_config')
      );

      setAuthReady(true);
    });

    return () => {
      cleanupListeners();
      unsubAuth();
    };
  }, []);

  const loginWithCredentials = async (rawUsername: string, rawPassword: string) => {
    setAuthError(null);
    setProviderSetupRequired(false);

    const normalizedUser = rawUsername.trim().toLowerCase() as AllowedUsername;
    const expected = ACCOUNT_MAP[normalizedUser];

    if (!expected || rawPassword !== expected.password) {
      setAuthError('Invalid username or password. Only authorized admin or niraj credentials are accepted.');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, expected.email, rawPassword);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
        setProviderSetupRequired(true);
        setAuthError(
          'Email/Password sign-in provider must be enabled in your Firebase Authentication console.'
        );
        return;
      }

      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, expected.email, rawPassword);
          return;
        } catch (createError: unknown) {
          const createCode = (createError as { code?: string })?.code || '';
          if (createCode === 'auth/operation-not-allowed') {
            setProviderSetupRequired(true);
            setAuthError(
              'Email/Password sign-in provider must be enabled in your Firebase Authentication console.'
            );
            return;
          }
          if (createCode === 'auth/email-already-in-use') {
            setAuthError('Account exists in Firebase Auth with a different password. Please reset it in Firebase Console.');
            return;
          }
          setAuthError(createError instanceof Error ? createError.message : 'Unable to create Firebase account.');
          return;
        }
      }

      setAuthError(error instanceof Error ? error.message : 'Authentication failed.');
    }
  };

  const logout = async () => {
    setAuthError(null);
    await signOut(auth);
  };

  const clearAuthError = () => {
    setAuthError(null);
    setProviderSetupRequired(false);
  };

  const addTransaction = async (input: TransactionInput) => {
    if (!firebaseUser || !userProfile || userProfile.role !== 'admin') {
      throw new Error('Only admin can record transactions.');
    }

    const txId = generateDocId('tx');
    const cleanTitle = input.title.trim().slice(0, SCHEMA_LIMITS.TITLE_MAX);
    const cleanCategory = input.category.trim().slice(0, SCHEMA_LIMITS.CATEGORY_MAX);
    const cleanNotes = (input.notes || '').trim().slice(0, SCHEMA_LIMITS.NOTES_MAX);
    const cleanItemId = (input.inventoryItemId || '').trim().slice(0, SCHEMA_LIMITS.ID_MAX);
    const qty = Math.max(0, Number(input.quantity || 0));
    const amount = Math.max(0.01, Number(input.amount));

    let costAmount = Math.max(0, Number(input.costAmount || 0));
    const linkedItem = cleanItemId ? inventory.find((item) => item.id === cleanItemId) : undefined;

    if (input.type === 'sale' && linkedItem && qty > 0 && costAmount === 0) {
      costAmount = Number((linkedItem.unitCost * qty).toFixed(2));
    }

    const batch = writeBatch(db);
    const txRef = doc(db, 'transactions', txId);

    batch.set(txRef, {
      id: txId,
      workspaceId: 'primary_ledger',
      type: input.type,
      title: cleanTitle,
      category: cleanCategory,
      amount: Number(amount.toFixed(2)),
      costAmount: Number(costAmount.toFixed(2)),
      quantity: qty,
      inventoryItemId: linkedItem ? linkedItem.id : '',
      paymentMethod: input.paymentMethod,
      notes: cleanNotes,
      transactionDate: input.transactionDate,
      createdByUid: firebaseUser.uid,
      createdByUsername: 'admin',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (linkedItem && qty > 0) {
      const invRef = doc(db, 'inventory', linkedItem.id);
      if (input.type === 'sale') {
        const nextRemaining = Math.max(0, linkedItem.stockRemaining - qty);
        batch.update(invRef, {
          stockRemaining: nextRemaining,
          updatedAt: serverTimestamp(),
        });
      } else if (input.type === 'purchase') {
        batch.update(invRef, {
          totalStockLevel: linkedItem.totalStockLevel + qty,
          stockRemaining: linkedItem.stockRemaining + qty,
          updatedAt: serverTimestamp(),
        });
      }
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `transactions/${txId}`);
    }
  };

  const updateTransaction = async (id: string, updates: Partial<TransactionInput>) => {
    if (!firebaseUser || !userProfile || userProfile.role !== 'admin') {
      throw new Error('Only admin can edit transactions.');
    }
    const txRef = doc(db, 'transactions', id);

    try {
      const payload: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      if (updates.type !== undefined) payload.type = updates.type;
      if (updates.title !== undefined) payload.title = updates.title.trim().slice(0, SCHEMA_LIMITS.TITLE_MAX);
      if (updates.category !== undefined) payload.category = updates.category.trim().slice(0, SCHEMA_LIMITS.CATEGORY_MAX);
      if (updates.amount !== undefined) payload.amount = Math.max(0.01, Number(updates.amount));
      if (updates.costAmount !== undefined) payload.costAmount = Math.max(0, Number(updates.costAmount));
      if (updates.quantity !== undefined) payload.quantity = Math.max(0, Number(updates.quantity));
      if (updates.inventoryItemId !== undefined) payload.inventoryItemId = updates.inventoryItemId.trim();
      if (updates.paymentMethod !== undefined) payload.paymentMethod = updates.paymentMethod;
      if (updates.notes !== undefined) payload.notes = updates.notes.trim().slice(0, SCHEMA_LIMITS.NOTES_MAX);
      if (updates.transactionDate !== undefined) payload.transactionDate = updates.transactionDate;
      await updateDoc(txRef, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${id}`);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!userProfile || userProfile.role !== 'admin') {
      throw new Error('Only admin can delete transactions.');
    }
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
    }
  };

  const addInventoryItem = async (input: InventoryInput) => {
    if (!firebaseUser || !userProfile || userProfile.role !== 'admin') {
      throw new Error('Only admin can add inventory items.');
    }

    const itemId = generateDocId('inv');
    try {
      await setDoc(doc(db, 'inventory', itemId), {
        id: itemId,
        workspaceId: 'primary_ledger',
        sku: input.sku.trim().slice(0, SCHEMA_LIMITS.SKU_MAX),
        name: input.name.trim().slice(0, SCHEMA_LIMITS.ITEM_NAME_MAX),
        category: input.category.trim().slice(0, SCHEMA_LIMITS.CATEGORY_MAX),
        totalStockLevel: Math.max(0, Number(input.totalStockLevel)),
        stockRemaining: Math.max(0, Number(input.stockRemaining)),
        reorderLevel: Math.max(0, Number(input.reorderLevel)),
        unitCost: Math.max(0, Number(input.unitCost)),
        unitPrice: Math.max(0, Number(input.unitPrice)),
        unitLabel: input.unitLabel.trim().slice(0, SCHEMA_LIMITS.UNIT_LABEL_MAX) || 'pcs',
        createdByUid: firebaseUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `inventory/${itemId}`);
    }
  };

  const updateInventoryItem = async (id: string, updates: Partial<InventoryInput>) => {
    if (!userProfile || userProfile.role !== 'admin') {
      throw new Error('Only admin can edit inventory details.');
    }

    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.sku !== undefined) payload.sku = updates.sku.trim().slice(0, SCHEMA_LIMITS.SKU_MAX);
    if (updates.name !== undefined) payload.name = updates.name.trim().slice(0, SCHEMA_LIMITS.ITEM_NAME_MAX);
    if (updates.category !== undefined) payload.category = updates.category.trim().slice(0, SCHEMA_LIMITS.CATEGORY_MAX);
    if (updates.totalStockLevel !== undefined) payload.totalStockLevel = Math.max(0, Number(updates.totalStockLevel));
    if (updates.stockRemaining !== undefined) payload.stockRemaining = Math.max(0, Number(updates.stockRemaining));
    if (updates.reorderLevel !== undefined) payload.reorderLevel = Math.max(0, Number(updates.reorderLevel));
    if (updates.unitCost !== undefined) payload.unitCost = Math.max(0, Number(updates.unitCost));
    if (updates.unitPrice !== undefined) payload.unitPrice = Math.max(0, Number(updates.unitPrice));
    if (updates.unitLabel !== undefined) payload.unitLabel = updates.unitLabel.trim().slice(0, SCHEMA_LIMITS.UNIT_LABEL_MAX);

    try {
      await updateDoc(doc(db, 'inventory', id), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inventory/${id}`);
    }
  };

  const deleteInventoryItem = async (id: string) => {
    if (!userProfile || userProfile.role !== 'admin') {
      throw new Error('Only admin can delete inventory items.');
    }
    try {
      await deleteDoc(doc(db, 'inventory', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `inventory/${id}`);
    }
  };

  const updateBudgetConfig = async (
    updates: Pick<
      BudgetConfig,
      | 'advertisingPct'
      | 'brandingPct'
      | 'reinvestmentPct'
      | 'savingsPct'
      | 'pettyCashOpeningFloat'
      | 'openingFundBalance'
      | 'currencySymbol'
    >
  ) => {
    if (!firebaseUser || !userProfile || userProfile.role !== 'admin') {
      throw new Error('Only admin can update budget allocation rules.');
    }
    const sum =
      Number(updates.advertisingPct) +
      Number(updates.brandingPct) +
      Number(updates.reinvestmentPct) +
      Number(updates.savingsPct);

    if (Math.round(sum) !== 100) {
      throw new Error('Allocation percentages must total exactly 100%.');
    }

    try {
      await setDoc(doc(db, 'budget_config', 'default'), {
        workspaceId: 'primary_ledger',
        advertisingPct: Number(updates.advertisingPct),
        brandingPct: Number(updates.brandingPct),
        reinvestmentPct: Number(updates.reinvestmentPct),
        savingsPct: Number(updates.savingsPct),
        pettyCashOpeningFloat: Math.max(0, Number(updates.pettyCashOpeningFloat)),
        openingFundBalance: Math.max(0, Number(updates.openingFundBalance)),
        currencySymbol: updates.currencySymbol.trim() || 'Rs ',
        resetVersion: 2,
        updatedByUid: firebaseUser.uid,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'budget_config/default');
    }
  };

  const clearAllRecords = async () => {
    if (!firebaseUser || !userProfile || userProfile.role !== 'admin') {
      throw new Error('Only admin can delete all records and transactions.');
    }
    try {
      await purgeAllWorkspaceCollections();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'workspace_records');
    }
  };

  const financialSummary = useMemo(
    () => computeFinancialSummary(transactions, budgetConfig),
    [transactions, budgetConfig]
  );

  const inventorySummary = useMemo(() => computeInventorySummary(inventory), [inventory]);

  const categoryBreakdown = useMemo(
    () => computeCategoryBreakdown(inventory, transactions),
    [inventory, transactions]
  );

  const value: LedgerContextValue = {
    authReady,
    firebaseUser,
    userProfile,
    isAdmin: userProfile?.role === 'admin',
    dataLoading,
    authError,
    providerSetupRequired,
    offlineWarning,
    transactions,
    inventory,
    budgetConfig,
    financialSummary,
    inventorySummary,
    categoryBreakdown,
    loginWithCredentials,
    logout,
    clearAuthError,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    updateBudgetConfig,
    clearAllRecords,
  };

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger() {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error('useLedger must be used inside LedgerProvider');
  return ctx;
}
