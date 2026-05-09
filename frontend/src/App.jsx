import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BarChart2,
  CalendarClock,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  Home,
  LayoutDashboard,
  Package,
  PiggyBank,
  Plus,
  Settings,
  ShoppingCart,
  Wallet,
  Zap,
} from "lucide-react";
import "./App.css";
import { PurchasesView } from "./components/PurchasesView.jsx";
import { ExpensesPanel } from "./components/ExpensesPanel.jsx";
import { ReportsView } from "./components/ReportsView.jsx";
import {
  addDays,
  formatDateInput,
  getHouseholdAgendaBuckets,
  getHouseholdReminderSummary,
  HouseholdDashboardSection,
  HouseholdView,
} from "./components/household/index.js";
import { GoalsView } from "./components/goals/index.js";
import { ProductForm, ProductList } from "./components/inventory/index.js";
import { SettingsView } from "./components/settings/index.js";
import {
  getInventorySettings,
  getMonthlyFinanceSummary,
  listTaskOccurrences,
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
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={15} /> },
  { key: "household", label: "Rutinas", icon: <Home size={15} /> },
  { key: "goals", label: "Metas", icon: <PiggyBank size={15} /> },
  { key: "reports", label: "Reportes", icon: <BarChart2 size={15} /> },
  { key: "inventory", label: "Inventario", icon: <Package size={15} /> },
  { key: "purchases", label: "Compras", icon: <ShoppingCart size={15} /> },
  { key: "expenses", label: "Gastos", icon: <Wallet size={15} /> },
  { key: "settings", label: "Categorias y Configuracion", icon: <Settings size={15} /> },
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
  householdAgendaSummary,
  householdReminderSummary,
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
            <span className="alert-icon"><AlertTriangle size={14} /></span>
            <h3>Stock bajo</h3>
          </header>
          <strong>{lowStockProducts.length} productos</strong>
          <p>Prioriza reposicion de productos criticos para evitar faltantes.</p>
        </article>

        <article className="alert-card alert-warning">
          <header>
            <span className="alert-icon"><CalendarClock size={14} /></span>
            <h3>Proximos a vencer</h3>
          </header>
          <strong>{expiringSoon.length} productos</strong>
          <p>
            Detectados con fecha de vencimiento dentro de {inventorySettings.alerts.expiring_soon_days} dias.
          </p>
        </article>

        <article className="alert-card alert-critical">
          <header>
            <span className="alert-icon"><Zap size={14} /></span>
            <h3>Items criticos</h3>
          </header>
          <strong>{criticalItems.length} items</strong>
          <p>Stock critico en productos con frecuencia marcada como sensible.</p>
        </article>

        <article className="alert-card alert-danger">
          <header>
            <span className="alert-icon"><AlertCircle size={14} /></span>
            <h3>Tareas atrasadas</h3>
          </header>
          <strong>{householdReminderSummary.overdue.length} rutinas</strong>
          <p>Lo vencido debe resolverse primero para que no se acumule friccion operativa.</p>
        </article>

        <article className="alert-card alert-warning">
          <header>
            <span className="alert-icon"><CalendarDays size={14} /></span>
            <h3>Vence manana</h3>
          </header>
          <strong>{householdReminderSummary.tomorrow.length} tareas</strong>
          <p>Te ayuda a preparar compras, limpieza o pagos antes del siguiente dia.</p>
        </article>

        <article className="alert-card alert-critical">
          <header>
            <span className="alert-icon"><CalendarDays size={14} /></span>
            <h3>Esta semana</h3>
          </header>
          <strong>{householdReminderSummary.weekUpcoming.length} pendientes</strong>
          <p>Visibilidad rapida de lo que aun no vence hoy pero ya conviene anticipar.</p>
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

      <HouseholdDashboardSection summary={householdAgendaSummary} />
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [products, setProducts] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [variableExpenses, setVariableExpenses] = useState([]);
  const [financialEvents, setFinancialEvents] = useState([]);
  const [monthlyCloses, setMonthlyCloses] = useState([]);
  const [householdOccurrences, setHouseholdOccurrences] = useState([]);
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

  const loadHouseholdAgenda = useCallback(async () => {
    const dateFrom = formatDateInput(addDays(new Date(), -30));
    const dateTo = formatDateInput(addDays(new Date(), 7));

    try {
      const occurrenceData = await listTaskOccurrences(dateFrom, dateTo);
      setHouseholdOccurrences(occurrenceData || []);
    } catch (error) {
      console.error("Error loading household agenda:", error);
      setHouseholdOccurrences([]);
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    await Promise.all([loadProducts(), loadFinanceData(), loadHouseholdAgenda()]);
  }, [loadFinanceData, loadHouseholdAgenda, loadProducts]);

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
  const householdAgendaSummary = getHouseholdAgendaBuckets(householdOccurrences);
  const householdReminderSummary = getHouseholdReminderSummary(householdOccurrences);
  const reminderHeadline = householdReminderSummary.overdue.length > 0
    ? `${householdReminderSummary.overdue.length} tarea(s) atrasadas requieren atencion inmediata.`
    : householdReminderSummary.today.length > 0
      ? `${householdReminderSummary.today.length} tarea(s) vencen hoy.`
      : householdReminderSummary.tomorrow.length > 0
        ? `${householdReminderSummary.tomorrow.length} tarea(s) vencen manana.`
        : householdReminderSummary.weekUpcoming.length > 0
          ? `${householdReminderSummary.weekUpcoming.length} tarea(s) quedan pendientes esta semana.`
          : "No hay recordatorios urgentes del hogar ahora mismo.";

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
    <div className={`app-shell ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-block">
            <h1>DomusOps</h1>
            <p>Control domestico inteligente</p>
          </div>

          <button
            className="sidebar-toggle"
            type="button"
            onClick={() => setIsSidebarCollapsed((currentValue) => !currentValue)}
            aria-label={isSidebarCollapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
            aria-pressed={isSidebarCollapsed}
          >
            {isSidebarCollapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Modulos principales">
          {MODULES.map((module) => (
            <button
              key={module.key}
              className={`nav-item ${route === module.key ? "active" : ""}`}
              type="button"
              onClick={() => navigateTo(module.key)}
              aria-label={module.label}
              title={isSidebarCollapsed ? module.label : undefined}
            >
              <span className="nav-item-icon" aria-hidden="true">{module.icon}</span>
              <span className="nav-item-label">{module.label}</span>
              {module.key === "household" && householdReminderSummary.urgentCount > 0 && (
                <span className="nav-badge" aria-label={`${householdReminderSummary.urgentCount} recordatorios urgentes`}>
                  {householdReminderSummary.urgentCount}
                </span>
              )}
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
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Plus size={14} />
                Agregar producto de hogar
              </button>
            )}
          </div>
        </header>

        <section className={`reminder-strip ${householdReminderSummary.overdue.length > 0 ? "is-danger" : householdReminderSummary.today.length > 0 ? "is-warning" : ""}`}>
          <div>
            <strong>Recordatorios del hogar</strong>
            <p>{reminderHeadline}</p>
          </div>
          <div className="reminder-strip-badges">
            <span className="badge low-stock">Atrasadas: {householdReminderSummary.overdue.length}</span>
            <span className="badge">Hoy: {householdReminderSummary.today.length}</span>
            <span className="badge">Manana: {householdReminderSummary.tomorrow.length}</span>
            <span className="badge">Semana: {householdReminderSummary.weekUpcoming.length}</span>
          </div>
        </section>

        {route === "dashboard" && (
          <DashboardView
            products={homeProducts}
            filteredProducts={filteredHomeProducts}
            householdAgendaSummary={householdAgendaSummary}
            householdReminderSummary={householdReminderSummary}
            lowStockProducts={lowStockProducts}
            criticalItems={criticalItems}
            expiringSoon={expiringSoon}
            monthlySpendEstimate={monthlySpendEstimate}
            financeSummary={financeSummary}
            totalStockUnits={totalStockUnits}
            inventorySettings={inventorySettings}
          />
        )}

        {route === "household" && <HouseholdView />}

        {route === "goals" && <GoalsView />}

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
