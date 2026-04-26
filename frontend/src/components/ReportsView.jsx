import { useEffect, useMemo, useState } from "react";
import { getMonthlyFinanceSummary } from "../api.js";
import { formatCurrency, getCategoryLabel, getCurrentInventorySettings } from "../constants/inventory.js";

const HISTORY_WINDOW = 6;

function formatCompactGuarani(value) {
  const settings = getCurrentInventorySettings();
  return new Intl.NumberFormat(settings.currency.locale, {
    style: "currency",
    currency: settings.currency.code,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function getMonthLabel(month, year) {
  return new Intl.DateTimeFormat("es-PY", {
    month: "short",
    year: "2-digit",
  }).format(new Date(year, month - 1, 1));
}

function getRecentMonths(total) {
  const now = new Date();
  return Array.from({ length: total }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (total - 1 - index), 1);
    return {
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      label: getMonthLabel(date.getMonth() + 1, date.getFullYear()),
    };
  });
}

function buildPoints(values, width, height, padding) {
  if (!values.length) {
    return "";
  }

  const maxValue = Math.max(...values, 1);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  return values
    .map((value, index) => {
      const x = padding + (values.length === 1 ? innerWidth / 2 : (index * innerWidth) / (values.length - 1));
      const y = height - padding - (value / maxValue) * innerHeight;
      return `${x},${y}`;
    })
    .join(" ");
}

function TrendChart({ data }) {
  const width = 640;
  const height = 260;
  const padding = 24;
  const expenseValues = data.map((item) => Number(item.estimated_expenses || 0));
  const incomeValues = data.map((item) => Number(item.total_income || 0));
  const expensePoints = buildPoints(expenseValues, width, height, padding);
  const incomePoints = buildPoints(incomeValues, width, height, padding);

  return (
    <article className="panel reports-panel reports-panel-wide">
      <div className="panel-title">
        <div>
          <h3>Tendencia financiera</h3>
          <p>Ultimos 6 meses de ingresos contra gasto proyectado.</p>
        </div>
      </div>

      <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tendencia de ingresos y gastos">
        {[0.25, 0.5, 0.75, 1].map((tick) => (
          <line
            key={tick}
            x1={padding}
            x2={width - padding}
            y1={height - padding - (height - padding * 2) * tick}
            y2={height - padding - (height - padding * 2) * tick}
            className="trend-grid-line"
          />
        ))}
        {expensePoints && <polyline points={expensePoints} fill="none" stroke="var(--accent)" strokeWidth="3" />}
        {incomePoints && <polyline points={incomePoints} fill="none" stroke="var(--success)" strokeWidth="3" />}
      </svg>

      <div className="trend-axis-labels">
        {data.map((item) => (
          <span key={`${item.year}-${item.month}`}>{item.label}</span>
        ))}
      </div>

      <div className="reports-legend">
        <span><i className="legend-swatch income" />Ingresos</span>
        <span><i className="legend-swatch expenses" />Gasto estimado</span>
      </div>
    </article>
  );
}

function BudgetComparisonChart({ summary }) {
  const rows = [
    { key: "needs", label: "Necesidades" },
    { key: "wants", label: "Deseos" },
    { key: "savings", label: "Ahorro" },
  ];

  return (
    <article className="panel reports-panel">
      <div className="panel-title">
        <div>
          <h3>Regla 50 / 30 / 20</h3>
          <p>Comparacion entre objetivo y ejecucion real.</p>
        </div>
      </div>

      <div className="comparison-list">
        {rows.map((row) => {
          const target = Number(summary.rule_50_30_20?.targets?.[row.key] || 0);
          const actual = Number(summary.rule_50_30_20?.actuals?.[row.key] || 0);
          const max = Math.max(target, actual, 1);
          const delta = Number(summary.rule_50_30_20?.variance?.[row.key] || 0);
          return (
            <div key={row.key} className="comparison-row">
              <div className="comparison-head">
                <strong>{row.label}</strong>
                <span>{delta > 0 ? "Por encima" : delta < 0 ? "Por debajo" : "En objetivo"}</span>
              </div>
              <div className="comparison-bars">
                <div>
                  <small>Meta</small>
                  <div className="comparison-track">
                    <div className="comparison-fill target" style={{ width: `${(target / max) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <small>Actual</small>
                  <div className="comparison-track">
                    <div className={`comparison-fill ${delta > 0 ? "danger" : "success"}`} style={{ width: `${(actual / max) * 100}%` }} />
                  </div>
                </div>
              </div>
              <div className="comparison-values">
                <span>{formatCompactGuarani(target)}</span>
                <span>{formatCompactGuarani(actual)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function ExpenseCompositionChart({ summary }) {
  const segments = [
    { key: "home_estimated_expenses", label: "Inventario", color: "var(--accent)" },
    { key: "fixed_estimated_expenses", label: "Fijos", color: "#ef7d57" },
    { key: "variable_expenses", label: "Variables", color: "var(--success)" },
  ];
  const total = Math.max(Number(summary.estimated_expenses || 0), 1);

  return (
    <article className="panel reports-panel">
      <div className="panel-title">
        <div>
          <h3>Composicion del gasto mensual</h3>
          <p>Distribucion de lo que hoy consume tu presupuesto.</p>
        </div>
      </div>

      <div className="stacked-bar">
        {segments.map((segment) => (
          <span
            key={segment.key}
            style={{ width: `${(Number(summary[segment.key] || 0) / total) * 100}%`, background: segment.color }}
          />
        ))}
      </div>

      <div className="stacked-list">
        {segments.map((segment) => (
          <div key={segment.key} className="stacked-row">
            <div>
              <i className="legend-swatch" style={{ background: segment.color }} />
              <strong>{segment.label}</strong>
            </div>
            <span>{formatCurrency(summary[segment.key])}</span>
          </div>
        ))}
        <div className="stacked-row total">
          <strong>Total estimado</strong>
          <span>{formatCurrency(summary.estimated_expenses)}</span>
        </div>
      </div>
    </article>
  );
}

function InventoryCategoryChart({ products }) {
  const rows = useMemo(() => {
    const distribution = products.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + Number(product.stock || 0);
      return acc;
    }, {});

    return Object.entries(distribution)
      .map(([category, total]) => ({
        category,
        label: getCategoryLabel(category),
        total,
      }))
      .sort((left, right) => right.total - left.total);
  }, [products]);

  const max = Math.max(...rows.map((row) => row.total), 1);

  return (
    <article className="panel reports-panel">
      <div className="panel-title">
        <div>
          <h3>Inventario por categoria</h3>
          <p>Donde se concentra el stock disponible del hogar.</p>
        </div>
      </div>

      <div className="comparison-list">
        {rows.map((row) => (
          <div key={row.category} className="comparison-row compact">
            <div className="comparison-head">
              <strong>{row.label}</strong>
              <span>{row.total} unidades</span>
            </div>
            <div className="comparison-track single">
              <div className="comparison-fill inventory" style={{ width: `${(row.total / max) * 100}%` }} />
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="empty-report">No hay stock suficiente para graficar.</p>}
      </div>
    </article>
  );
}

function IncomeSourcesChart({ incomes }) {
  const rows = useMemo(() => {
    const grouped = incomes.reduce((acc, income) => {
      const source = income.source?.trim() || "Sin etiqueta";
      acc[source] = (acc[source] || 0) + Number(income.amount || 0);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([source, total]) => ({ source, total }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 5);
  }, [incomes]);

  const max = Math.max(...rows.map((row) => row.total), 1);

  return (
    <article className="panel reports-panel">
      <div className="panel-title">
        <div>
          <h3>Ingresos por fuente</h3>
          <p>Entradas del mes actual agrupadas por origen.</p>
        </div>
      </div>

      <div className="comparison-list">
        {rows.map((row) => (
          <div key={row.source} className="comparison-row compact">
            <div className="comparison-head">
              <strong>{row.source}</strong>
              <span>{formatCompactGuarani(row.total)}</span>
            </div>
            <div className="comparison-track single">
              <div className="comparison-fill income" style={{ width: `${(row.total / max) * 100}%` }} />
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="empty-report">Todavia no hay ingresos cargados este mes.</p>}
      </div>
    </article>
  );
}

function FixedExpensesStatusChart({ fixedExpenseProducts }) {
  const paid = fixedExpenseProducts.filter((product) => product.monthly_payment_status === "paid").length;
  const pending = fixedExpenseProducts.filter((product) => product.monthly_payment_status !== "paid").length;
  const total = Math.max(paid + pending, 1);
  const paidAngle = (paid / total) * 360;

  return (
    <article className="panel reports-panel">
      <div className="panel-title">
        <div>
          <h3>Cumplimiento de gastos fijos</h3>
          <p>Seguimiento mensual de pagos recurrentes.</p>
        </div>
      </div>

      <div className="ring-metric-wrap">
        <div
          className="ring-metric"
          style={{ background: `conic-gradient(var(--success) 0deg ${paidAngle}deg, var(--warning) ${paidAngle}deg 360deg)` }}
        >
          <div>
            <strong>{paid}</strong>
            <span>pagados</span>
          </div>
        </div>

        <div className="stacked-list ring-list">
          <div className="stacked-row">
            <div>
              <i className="legend-swatch income" />
              <strong>Pagados</strong>
            </div>
            <span>{paid}</span>
          </div>
          <div className="stacked-row">
            <div>
              <i className="legend-swatch" style={{ background: "var(--warning)" }} />
              <strong>Pendientes</strong>
            </div>
            <span>{pending}</span>
          </div>
          <div className="stacked-row total">
            <strong>Total recurrente</strong>
            <span>{fixedExpenseProducts.length}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ReportsView({ products, incomes, variableExpenses, financeSummary, fixedExpenseProducts }) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const months = useMemo(() => getRecentMonths(HISTORY_WINDOW), []);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      setLoadingHistory(true);
      setHistoryError("");

      try {
        const summaries = await Promise.all(
          months.map(async ({ month, year, label }) => {
            const summary = await getMonthlyFinanceSummary(month, year);
            return {
              ...summary,
              label,
            };
          })
        );

        if (active) {
          setHistory(summaries);
        }
      } catch (error) {
        if (active) {
          setHistoryError(error.message || "No se pudo cargar la tendencia financiera");
          setHistory([]);
        }
      } finally {
        if (active) {
          setLoadingHistory(false);
        }
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, [months]);

  const projectedSavings = Number(financeSummary.total_income || 0) - Number(financeSummary.estimated_expenses || 0);

  return (
    <section className="module-content fade-in reports-view">
      <div className="section-header reports-header">
        <div>
          <h2>Centro de reportes</h2>
          <p>Vista exclusiva para leer tendencia financiera, presion operativa y distribucion del inventario.</p>
        </div>
        <div className="reports-header-kpis">
          <article className="kpi-card accent-blue">
            <p>Ingreso del mes</p>
            <h3>{formatCurrency(financeSummary.total_income)}</h3>
            <small>{incomes.length} movimientos registrados.</small>
          </article>
          <article className="kpi-card accent-green">
            <p>Saldo proyectado</p>
            <h3>{formatCurrency(projectedSavings)}</h3>
            <small>{variableExpenses.length} gastos variables activos.</small>
          </article>
        </div>
      </div>

      <div className="reports-grid">
        {loadingHistory ? (
          <article className="panel reports-panel reports-panel-wide">
            <p className="empty-report">Cargando tendencia financiera...</p>
          </article>
        ) : historyError ? (
          <article className="panel reports-panel reports-panel-wide">
            <p className="empty-report">{historyError}</p>
          </article>
        ) : (
          <TrendChart data={history} />
        )}

        <ExpenseCompositionChart summary={financeSummary} />
        <BudgetComparisonChart summary={financeSummary} />
        <InventoryCategoryChart products={products} />
        <IncomeSourcesChart incomes={incomes} />
        <FixedExpensesStatusChart fixedExpenseProducts={fixedExpenseProducts} />
      </div>
    </section>
  );
}