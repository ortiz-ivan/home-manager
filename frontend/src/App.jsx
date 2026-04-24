import { useState, useEffect } from "react";
import "./App.css";
import { ProductForm } from "./components/ProductForm.jsx";
import { ProductList } from "./components/ProductList.jsx";
import { ExpensesPanel } from "./components/ExpensesPanel.jsx";
import { getMonthlyFinanceSummary, listIncomes, listProducts, listVariableExpenses } from "./api.js";
import {
  CATEGORY_LABELS,
  FIXED_EXPENSE_CATEGORY_VALUES,
  HOME_INVENTORY_CATEGORY_VALUES,
  isHomeInventoryCategory,
} from "./constants/inventory.js";

const MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "inventory", label: "Inventario" },
  { key: "purchases", label: "Compras" },
  { key: "expenses", label: "Gastos" },
  { key: "settings", label: "Categorias y Configuracion" },
];

const CATEGORY_UNIT_COST = {
  food: 4.8,
  cleaning: 6.2,
  hygiene: 5.1,
  home: 7.4,
  mobility: 8.1,
  maintenance: 10.5,
  subscription: 9.5,
  services: 12,
  assets: 11.6,
  leisure: 7.9,
};

const CATEGORY_COLOR_MAP = {
  food: "#3f8efc",
  cleaning: "#38b67a",
  hygiene: "#f5a524",
  home: "#ef5f6c",
  mobility: "#6f6cf5",
  maintenance: "#00a39a",
  subscription: "#f06f9b",
  services: "#2f9bd8",
  assets: "#c9861e",
  leisure: "#8673f2",
};

const FREQUENCY_WEIGHT = {
  high: 1.5,
  medium: 1,
  low: 0.65,
};

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

function formatGuarani(value) {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    maximumFractionDigits: 0,
  }).format(value || 0);
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
  categoryDistribution,
}) {
  const categoryTotal = Object.values(categoryDistribution).reduce((acc, value) => acc + value, 0);
  const pieStops = Object.keys(categoryDistribution).reduce(
    (acc, key) => {
      const value = categoryDistribution[key] || 0;
      const ratio = categoryTotal > 0 ? (value / categoryTotal) * 100 : 0;
      const nextStop = acc.stop + ratio;
      acc.segments.push(`${acc.colorMap[key] || "#b4bfd1"} ${acc.stop}% ${nextStop}%`);
      acc.stop = nextStop;
      return acc;
    },
    {
      stop: 0,
      segments: [],
      colorMap: CATEGORY_COLOR_MAP,
    }
  );

  const pieBackground =
    pieStops.segments.length > 0
      ? `conic-gradient(${pieStops.segments.join(",")})`
      : "conic-gradient(#dce4f3 0 100%)";

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
            Detectados con fecha de vencimiento dentro de 14 dias.
          </p>
        </article>

        <article className="alert-card alert-critical">
          <header>
            <span className="alert-icon">#</span>
            <h3>Items criticos</h3>
          </header>
          <strong>{criticalItems.length} items</strong>
          <p>Stock por debajo del minimo en productos de alta frecuencia.</p>
        </article>
      </div>

      <div className="kpi-grid">
        <article className="kpi-card">
          <p>Gasto mensual estimado</p>
          <h3>{formatGuarani(monthlySpendEstimate)}</h3>
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
          <small>Saldo: {formatGuarani(financeSummary.remaining_balance)}</small>
        </article>
      </div>

      <div className="charts-grid">
        <article className="panel chart-panel">
          <div className="panel-title">
            <h3>Consumo por categoria</h3>
          </div>
          <div className="bars-list">
            {Object.entries(categoryDistribution).map(([category, value]) => {
              const max = Math.max(...Object.values(categoryDistribution), 1);
              const width = `${(value / max) * 100}%`;
              return (
                <div key={category} className="bar-row">
                  <span>{CATEGORY_LABELS[category]}</span>
                  <div className="bar-track">
                    <div className="bar-value" style={{ width }} />
                  </div>
                  <strong>{value}</strong>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel chart-panel">
          <div className="panel-title">
            <h3>Distribucion del inventario</h3>
          </div>
          <div className="pie-wrap">
            <div className="pie-chart" style={{ background: pieBackground }} />
            <div className="pie-legend">
              {Object.entries(categoryDistribution).map(([category, value]) => (
                <p key={category}>
                  <span className={`legend-dot ${category}`} />
                  {CATEGORY_LABELS[category]}: {value}
                </p>
              ))}
            </div>
          </div>
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
                  <p>{CATEGORY_LABELS[product.category] || product.category}</p>
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
  const [incomes, setIncomes] = useState([]);
  const [variableExpenses, setVariableExpenses] = useState([]);
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const navigateTo = (moduleKey) => {
    setRoute(moduleKey);
    setIsModalOpen(false);
  };

  const loadProducts = async () => {
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
  };

  const loadFinanceData = async () => {
    try {
      const [incomeData, variableExpenseData, summaryData] = await Promise.all([
        listIncomes(),
        listVariableExpenses(),
        getMonthlyFinanceSummary(),
      ]);

      setIncomes(incomeData || []);
      setVariableExpenses(variableExpenseData || []);
      if (summaryData) {
        setFinanceSummary(summaryData);
      }
    } catch (error) {
      console.error("Error loading finance data:", error);
      setIncomes([]);
      setVariableExpenses([]);
    }
  };

  const refreshAllData = async () => {
    await Promise.all([loadProducts(), loadFinanceData()]);
  };

  useEffect(() => {
    refreshAllData();
  }, []);

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

  const homeProducts = products.filter((product) => isHomeInventoryCategory(product.category));
  const expenseProducts = products.filter((product) => !isHomeInventoryCategory(product.category));
  const fixedExpenseProducts = expenseProducts.filter((product) =>
    FIXED_EXPENSE_CATEGORY_VALUES.includes(product.category)
  );

  const filteredHomeProducts = homeProducts.filter((product) => {
    const category = CATEGORY_LABELS[product.category] || product.category;
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return (
      product.name.toLowerCase().includes(query) ||
      String(category).toLowerCase().includes(query)
    );
  });

  const lowStockProducts = homeProducts.filter((product) => product.stock <= product.stock_min);
  const criticalItems = homeProducts.filter(
    (product) => product.stock <= product.stock_min && product.usage_frequency === "high"
  );
  const expiringSoon = homeProducts.filter((product) => {
    const remaining = daysBetween(product.next_due_date);
    return remaining !== null && remaining >= 0 && remaining <= 14;
  });

  const totalStockUnits = homeProducts.reduce((acc, product) => acc + Number(product.stock || 0), 0);
  const monthlySpendEstimate = homeProducts.reduce((acc, product) => {
    const fallbackCost = CATEGORY_UNIT_COST[product.category] || 4;
    const explicitPrice = Number(product.price);
    const baseCost = Number.isNaN(explicitPrice) || explicitPrice <= 0 ? fallbackCost : explicitPrice;
    const frequency = FREQUENCY_WEIGHT[product.usage_frequency] || 1;
    const projectedUnits = product.type === "consumable" ? Number(product.stock_min || 1) : 1;
    return acc + projectedUnits * baseCost * frequency;
  }, 0);

  const categoryDistribution = homeProducts.reduce(
    (acc, product) => {
      if (acc[product.category] !== undefined) {
        acc[product.category] += Number(product.stock || 0);
      }
      return acc;
    },
    HOME_INVENTORY_CATEGORY_VALUES.reduce((seed, category) => {
      seed[category] = 0;
      return seed;
    }, {})
  );

  const currentModuleLabel = MODULES.find((module) => module.key === route)?.label || "Dashboard";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <h1>Home Manager</h1>
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
            <input
              type="search"
              placeholder="Buscar por nombre o categoria"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Buscar en inventario"
            />

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
            categoryDistribution={categoryDistribution}
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
          <PlaceholderModule
            title="Compras"
            description="Planifica reposiciones y centraliza ordenes recurrentes del hogar."
          />
        )}

        {route === "expenses" && (
          <ExpensesPanel
            incomes={incomes}
            summary={financeSummary}
            expenseProducts={fixedExpenseProducts}
            variableExpenses={variableExpenses}
            onDataChanged={refreshAllData}
          />
        )}

        {route === "settings" && (
          <PlaceholderModule
            title="Categorias y Configuracion"
            description="Ajusta categorias, limites minimos y reglas operativas."
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
