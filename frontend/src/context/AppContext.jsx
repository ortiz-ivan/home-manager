import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  getInventorySettings,
  getMonthlyFinanceSummary,
  listFinancialEvents,
  listFixedExpenses,
  listIncomes,
  listMonthlyCloses,
  listProducts,
  listTaskOccurrences,
  listVariableExpenses,
  updateInventorySettings,
} from "../api.js";
import {
  addDays,
  formatDateInput,
} from "../components/household/index.js";
import {
  normalizeInventorySettings,
  setCurrentInventorySettings,
} from "../constants/inventory.js";

const AppContext = createContext(null);

const EMPTY_FINANCE_SUMMARY = {
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  total_income: 0,
  home_estimated_expenses: 0,
  fixed_estimated_expenses: 0,
  variable_expenses: 0,
  paid_expenses: 0,
  committed_expenses: 0,
  committed_fixed_expenses: 0,
  paid_variable_expenses: 0,
  committed_variable_expenses: 0,
  estimated_expenses: 0,
  expense_percentage: null,
  remaining_balance: 0,
  rule_50_30_20: {
    targets: { needs: 0, wants: 0, savings: 0 },
    actuals: { needs: 0, wants: 0, savings: 0 },
    variance: { needs: 0, wants: 0, savings: 0 },
  },
  projection: null,
};

export function AppProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [variableExpenses, setVariableExpenses] = useState([]);
  const [financialEvents, setFinancialEvents] = useState([]);
  const [monthlyCloses, setMonthlyCloses] = useState([]);
  const [householdOccurrences, setHouseholdOccurrences] = useState([]);
  const [inventorySettings, setInventorySettings] = useState(() => normalizeInventorySettings());
  const [financeSummary, setFinanceSummary] = useState(EMPTY_FINANCE_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [selectedFinancePeriod, setSelectedFinancePeriod] = useState(null);
  const [appError, setAppError] = useState(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProducts();
      setProducts(data || []);
    } catch (err) {
      setProducts([]);
      setAppError(err.message || "Error al cargar productos.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFinanceData = useCallback(async () => {
    const selectedMonth = selectedFinancePeriod?.month;
    const selectedYear = selectedFinancePeriod?.year;
    try {
      const [fixed, income, variable, summary, events, closes] = await Promise.all([
        listFixedExpenses(selectedMonth, selectedYear),
        listIncomes(selectedMonth, selectedYear),
        listVariableExpenses(selectedMonth, selectedYear),
        getMonthlyFinanceSummary(selectedMonth, selectedYear),
        listFinancialEvents(selectedMonth, selectedYear),
        listMonthlyCloses(),
      ]);
      setFixedExpenses(fixed || []);
      setIncomes(income || []);
      setVariableExpenses(variable || []);
      setFinancialEvents(events || []);
      setMonthlyCloses(closes || []);
      if (summary) setFinanceSummary(summary);
    } catch (err) {
      setFixedExpenses([]);
      setIncomes([]);
      setVariableExpenses([]);
      setFinancialEvents([]);
      setMonthlyCloses([]);
      setAppError(err.message || "Error al cargar datos financieros.");
    }
  }, [selectedFinancePeriod]);

  const loadInventoryConfig = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const data = await getInventorySettings();
      const next = normalizeInventorySettings(data);
      setInventorySettings(next);
      setCurrentInventorySettings(next);
    } catch (err) {
      const fallback = normalizeInventorySettings();
      setInventorySettings(fallback);
      setCurrentInventorySettings(fallback);
      setAppError(err.message || "Error al cargar configuracion. Usando valores por defecto.");
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const loadHouseholdAgenda = useCallback(async () => {
    const dateFrom = formatDateInput(addDays(new Date(), -30));
    const dateTo = formatDateInput(addDays(new Date(), 7));
    try {
      const data = await listTaskOccurrences(dateFrom, dateTo);
      setHouseholdOccurrences(data || []);
    } catch (err) {
      setHouseholdOccurrences([]);
      setAppError(err.message || "Error al cargar agenda del hogar.");
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    await Promise.all([loadProducts(), loadFinanceData(), loadHouseholdAgenda()]);
  }, [loadProducts, loadFinanceData, loadHouseholdAgenda]);

  const saveSettings = useCallback(async (nextSettings) => {
    try {
      const response = await updateInventorySettings(nextSettings);
      const updated = normalizeInventorySettings(response);
      setInventorySettings(updated);
      setCurrentInventorySettings(updated);
      await refreshAllData();
    } catch (err) {
      setAppError(err.message || "Error al guardar configuracion.");
      throw err;
    }
  }, [refreshAllData]);

  useEffect(() => {
    loadInventoryConfig();
  }, [loadInventoryConfig]);

  useEffect(() => {
    if (!loadingSettings) refreshAllData();
  }, [loadingSettings, refreshAllData]);

  const value = {
    products,
    fixedExpenses,
    incomes,
    variableExpenses,
    financialEvents,
    monthlyCloses,
    householdOccurrences,
    inventorySettings,
    financeSummary,
    loading,
    loadingSettings,
    selectedFinancePeriod,
    setSelectedFinancePeriod,
    refreshAllData,
    saveSettings,
    appError,
    clearAppError: () => setAppError(null),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside AppProvider");
  return ctx;
}

export function useInventorySettings() {
  return useAppContext().inventorySettings;
}
