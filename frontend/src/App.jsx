import { useCallback, useEffect, useState } from "react";
import "./App.css";
import { PurchasesView } from "./components/PurchasesView.jsx";
import { ExpensesPanel } from "./components/ExpensesPanel.jsx";
import { ReportsView } from "./components/ReportsView.jsx";
import { ProductForm, ProductList } from "./components/inventory/index.js";
import { SettingsView } from "./components/settings/index.js";
import {
  getInventorySettings,
  getMonthlyFinanceSummary,
  listFinancialEvents,
  listFixedExpenses,
  listIncomes,
  listMonthlyCloses,
  listProducts,
  listVariableExpenses,
  updateInventorySettings,
} from "./api.js";
import {
  formatCurrency,
  getCategoryFallbackUnitCost,
  getCategoryLabel,
  getUsageFrequencyWeight,
  isHomeInventoryCategory,
  normalizeInventorySettings,
  setCurrentInventorySettings,
} from "./constants/inventory.js";

const MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "reports", label: "Reportes" },
  { key: "inventory", label: "Inventario" },
  { key: "purchases", label: "Compras" },
  { key: "expenses", label: "Gastos" },
  { key: "settings", label: "Categorias y Configuracion" },
];

function daysBetween(dateString) {
  if (!dateString) {
    return null;
  }

  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatPeriodInputValue(month, year) {
  return `${String(year)}-${String(month).padStart(2, "0")}`;
}

function getDefaultFinancePeriodValue(summary) {
  if (summary?.month && summary?.year) {
    return formatPeriodInputValue(summary.month, summary.year);
  }

  const now = new Date();
  return formatPeriodInputValue(now.getMonth() + 1, now.getFullYear());
}

function parsePeriodInputValue(value) {
  const [year, month] = String(value || "").split("-");
  return {
    month: Number(month),
    year: Number(year),
  };
}

function DashboardView({
  products,
  filteredProducts,
  lowStockProducts,
  criticalItems,
  expiringSoon,
  monthlySpendEstimate,
  financeSummary,
  totalStockUnits,
  inventorySettings,
}) {
  return (
    <section className="module-content fade-in">
      <div className="section-header">
        <h2>Control operativo del hogar</h2>
        <p>Monitorea riesgos, consumo y gasto estimado desde una sola vista.</p>
      </div>

      <div className="alerts-grid">
        <article className="alert-card alert-danger">
          <header>
            <span className="alert-icon">!</span>
            <h3>Stock bajo</h3>
          </header>
          <strong>{lowStockProducts.length} productos</strong>
          <p>Prioriza reposicion de productos criticos para evitar faltantes.</p>
        </article>

        <article className="alert-card alert-warning">
          <header>
            <span className="alert-icon">~</span>
            <h3>Proximos a vencer</h3>
          </header>
          <strong>{expiringSoon.length} productos</strong>
          <p>
            Detectados con fecha de vencimiento dentro de {inventorySettings.alerts.expiring_soon_days} dias.
          </p>
        </article>

        <article className="alert-card alert-critical">
          <header>
            <span className="alert-icon">#</span>
            <h3>Items criticos</h3>
          </header>
          <strong>{criticalItems.length} items</strong>
          <p>Stock critico en productos con frecuencia marcada como sensible.</p>
        </article>
      </div>

      <div className="kpi-grid">
        <article className="kpi-card">
          <p>Gasto mensual estimado</p>
          <h3>{formatCurrency(monthlySpendEstimate)}</h3>
          <small>Estimacion basada en categoria y frecuencia de uso.</small>
        </article>

        <article className="kpi-card">
          <p>Total de productos en stock</p>
          <h3>{totalStockUnits}</h3>
          <small>Unidades totales disponibles en inventario.</small>
        </article>

        <article className="kpi-card">
          <p>Productos gestionados</p>
          <h3>{products.length}</h3>
          <small>{filteredProducts.length} visibles con filtros activos.</small>
        </article>

        <article className="kpi-card">
          <p>Gasto sobre ingreso mensual</p>
          <h3>
            {financeSummary.expense_percentage === null
              ? "Sin ingresos"
              : `${financeSummary.expense_percentage}%`}
          </h3>
          <small>Saldo: {formatCurrency(financeSummary.remaining_balance)}</small>
        </article>
      </div>

      <article className="panel recent-panel">
        <div className="panel-title">
          <h3>Resumen de inventario</h3>
        </div>
        <div className="summary-list">
          {filteredProducts.slice(0, 6).map((product) => {
            const isLow = product.stock <= product.stock_min;
            const status = isLow ? "Bajo" : product.stock <= product.stock_min * 2 ? "Medio" : "Alto";
            return (
              <div className="summary-row" key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <p>{getCategoryLabel(product.category)}</p>
                </div>
                <div className={`stock-chip ${status.toLowerCase()}`}>{status}</div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && <p>No hay productos para mostrar.</p>}
        </div>
      </article>
    </section>
  );
}

function PlaceholderModule({ title, description }) {
  return (
    <section className="module-content fade-in">
      <div className="section-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <article className="panel placeholder">
        <p>Este modulo queda listo para conectar con datos reales del backend.</p>
      </article>
    </section>
  );
}

function App() {
  const [route, setRoute] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [variableExpenses, setVariableExpenses] = useState([]);
  const [financialEvents, setFinancialEvents] = useState([]);
  const [monthlyCloses, setMonthlyCloses] = useState([]);
  const [inventorySettings, setInventorySettings] = useState(() => normalizeInventorySettings());
  const [financeSummary, setFinanceSummary] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    total_income: 0,
    home_estimated_expenses: 0,
    fixed_estimated_expenses: 0,
    variable_expenses: 0,
    estimated_expenses: 0,
    expense_percentage: null,
    remaining_balance: 0,
    rule_50_30_20: {
      targets: { needs: 0, wants: 0, savings: 0 },
      actuals: { needs: 0, wants: 0, savings: 0 },
      variance: { needs: 0, wants: 0, savings: 0 },
    },
  });
  const [loading, setLoading] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFinancePeriod, setSelectedFinancePeriod] = useState(null);

  const navigateTo = (moduleKey) => {
    setRoute(moduleKey);
    setIsModalOpen(false);
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProducts();
      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFinanceData = useCallback(async () => {
    const selectedMonth = selectedFinancePeriod?.month;
    const selectedYear = selectedFinancePeriod?.year;

    try {
      const [fixedExpenseData, incomeData, variableExpenseData, summaryData, financialEventData, monthlyCloseData] = await Promise.all([
        listFixedExpenses(selectedMonth, selectedYear),
        listIncomes(selectedMonth, selectedYear),
        listVariableExpenses(selectedMonth, selectedYear),
        getMonthlyFinanceSummary(selectedMonth, selectedYear),
        listFinancialEvents(selectedMonth, selectedYear),
        listMonthlyCloses(),
      ]);

      setFixedExpenses(fixedExpenseData || []);
      setIncomes(incomeData || []);
      setVariableExpenses(variableExpenseData || []);
      setFinancialEvents(financialEventData || []);
      setMonthlyCloses(monthlyCloseData || []);
      if (summaryData) {
        setFinanceSummary(summaryData);
      }
    } catch (error) {
      console.error("Error loading finance data:", error);
      setFixedExpenses([]);
      setIncomes([]);
      setVariableExpenses([]);
      setFinancialEvents([]);
      setMonthlyCloses([]);
    }
  }, [selectedFinancePeriod]);

  const loadInventoryConfig = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const data = await getInventorySettings();
      const nextSettings = normalizeInventorySettings(data);
      setInventorySettings(nextSettings);
      setCurrentInventorySettings(nextSettings);
    } catch (error) {
      console.error("Error loading inventory settings:", error);
      const fallbackSettings = normalizeInventorySettings();
      setInventorySettings(fallbackSettings);
      setCurrentInventorySettings(fallbackSettings);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    await Promise.all([loadProducts(), loadFinanceData()]);
  }, [loadFinanceData, loadProducts]);

  useEffect(() => {
    loadInventoryConfig();
  }, [loadInventoryConfig]);

  useEffect(() => {
    if (!loadingSettings) {
      refreshAllData();
    }
  }, [loadingSettings, refreshAllData]);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener("keydown", handleEsc);
    }

    return () => document.removeEventListener("keydown", handleEsc);
  }, [isModalOpen]);

  const homeProducts = products.filter((product) => isHomeInventoryCategory(product.category, inventorySettings));

  const filteredHomeProducts = homeProducts.filter((product) => {
    const category = getCategoryLabel(product.category, inventorySettings);
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return (
      product.name.toLowerCase().includes(query) ||
      String(category).toLowerCase().includes(query)
    );
  });

  const lowStockProducts = homeProducts.filter(
    (product) => product.stock <= Number(product.stock_min || 0) * Number(inventorySettings.thresholds.low_stock_ratio || 1)
  );
  const criticalItems = homeProducts.filter(
    (product) => (
      product.stock <= Number(product.stock_min || 0) * Number(inventorySettings.thresholds.critical_stock_ratio || 1) &&
      inventorySettings.alerts.critical_frequencies.includes(product.usage_frequency)
    )
  );
  const expiringSoon = homeProducts.filter((product) => {
    const remaining = daysBetween(product.next_due_date);
    return remaining !== null && remaining >= 0 && remaining <= Number(inventorySettings.alerts.expiring_soon_days || 14);
  });

  const totalStockUnits = homeProducts.reduce((acc, product) => acc + Number(product.stock || 0), 0);
  const monthlySpendEstimate = homeProducts.reduce((acc, product) => {
    const fallbackCost = getCategoryFallbackUnitCost(product.category, inventorySettings);
    const explicitPrice = Number(product.price);
    const baseCost = Number.isNaN(explicitPrice) || explicitPrice <= 0 ? fallbackCost : explicitPrice;
    const frequency = getUsageFrequencyWeight(product.usage_frequency, inventorySettings);
    const projectedUnits = product.type === "consumable" ? Number(product.stock_min || 1) : 1;
    return acc + projectedUnits * baseCost * frequency;
  }, 0);

  const currentModuleLabel = MODULES.find((module) => module.key === route)?.label || "Dashboard";
  const showSearch = route === "dashboard" || route === "inventory";
  const showFinancePeriodSelector = route === "dashboard" || route === "reports" || route === "expenses";
  const financePeriodValue = selectedFinancePeriod
    ? formatPeriodInputValue(selectedFinancePeriod.month, selectedFinancePeriod.year)
    : getDefaultFinancePeriodValue(financeSummary);

  const handleFinancePeriodChange = (event) => {
    const nextValue = event.target.value;

    if (!nextValue) {
      setSelectedFinancePeriod(null);
      return;
    }

    setSelectedFinancePeriod(parsePeriodInputValue(nextValue));
  };

  const handleResetFinancePeriod = () => {
    setSelectedFinancePeriod(null);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <h1>DomusOps</h1>
          <p>Control domestico inteligente</p>
        </div>

        <nav className="sidebar-nav" aria-label="Modulos principales">
          {MODULES.map((module) => (
            <button
              key={module.key}
              className={`nav-item ${route === module.key ? "active" : ""}`}
              type="button"
              onClick={() => navigateTo(module.key)}
            >
              {module.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <h2>{currentModuleLabel}</h2>
            <p>Estado actualizado del hogar en tiempo real</p>
          </div>

          <div className="topbar-actions">
            {showFinancePeriodSelector && (
              <div className="period-control">
                <label className="period-control-label" htmlFor="finance-period-input">
                  Periodo financiero
                </label>
                <div className="period-control-fields">
                  <input
                    id="finance-period-input"
                    type="month"
                    value={financePeriodValue}
                    onChange={handleFinancePeriodChange}
                    aria-label="Seleccionar periodo financiero"
                  />
                  <button className="btn btn-outline" type="button" onClick={handleResetFinancePeriod}>
                    Periodo activo
                  </button>
                </div>
              </div>
            )}

            {showSearch && (
              <input
                type="search"
                placeholder="Buscar por nombre o categoria"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label="Buscar en inventario"
              />
            )}

            {route === "inventory" && (
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => setIsModalOpen(true)}
              >
                Agregar producto de hogar
              </button>
            )}
          </div>
        </header>

        {route === "dashboard" && (
          <DashboardView
            products={homeProducts}
            filteredProducts={filteredHomeProducts}
            lowStockProducts={lowStockProducts}
            criticalItems={criticalItems}
            expiringSoon={expiringSoon}
            monthlySpendEstimate={monthlySpendEstimate}
            financeSummary={financeSummary}
            totalStockUnits={totalStockUnits}
            inventorySettings={inventorySettings}
          />
        )}

        {route === "reports" && (
          <ReportsView
            products={homeProducts}
            incomes={incomes}
            variableExpenses={variableExpenses}
            financeSummary={financeSummary}
            fixedExpenses={fixedExpenses}
            onSelectPeriod={setSelectedFinancePeriod}
            onResetPeriod={handleResetFinancePeriod}
          />
        )}

        {route === "inventory" && (
          <section className="module-content fade-in">
            <div className="section-header">
              <h2>Inventario activo</h2>
              <p>
                Gestion de productos con buscador, filtros y acciones rapidas.
              </p>
            </div>
            <ProductList
              products={filteredHomeProducts}
              loading={loading}
              onUpdate={refreshAllData}
              onDelete={refreshAllData}
            />
          </section>
        )}

        {route === "purchases" && (
          <PurchasesView
            products={homeProducts}
            onDataChanged={refreshAllData}
          />
        )}

        {route === "expenses" && (
          <ExpensesPanel
            incomes={incomes}
            summary={financeSummary}
            fixedExpenses={fixedExpenses}
            variableExpenses={variableExpenses}
            financialEvents={financialEvents}
            monthlyCloses={monthlyCloses}
            selectedPeriod={selectedFinancePeriod}
            onDataChanged={refreshAllData}
          />
        )}

        {route === "settings" && (
          <SettingsView
            settings={inventorySettings}
            loading={loadingSettings}
            onSave={async (nextSettings) => {
              const response = await updateInventorySettings(nextSettings);
              const updatedSettings = normalizeInventorySettings(response);
              setInventorySettings(updatedSettings);
              setCurrentInventorySettings(updatedSettings);
              await refreshAllData();
            }}
          />
        )}
      </section>

      {isModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Agregar nuevo producto"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="modal-content compact" onClick={(event) => event.stopPropagation()}>
            <ProductForm
              compact
              onProductCreated={refreshAllData}
              onClose={() => setIsModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
