import { formatCompactGuarani } from "./utils.js";

const BUCKETS = [
  { key: "needs", label: "Necesidades" },
  { key: "wants", label: "Deseos" },
  { key: "savings", label: "Ahorro / Deuda" },
];

export function CategoryBudgetPanel({ summary }) {
  const breakdown = summary.category_breakdown ?? [];
  const targets = summary.rule_50_30_20?.targets ?? {};

  return (
    <article className="panel reports-panel reports-panel-wide">
      <div className="panel-title">
        <div>
          <h3>Gasto real por categoría</h3>
          <p>Gastos variables, pagos fijos y reposiciones del mes agrupados por bucket presupuestario.</p>
        </div>
      </div>

      <div className="category-budget-grid">
        {BUCKETS.map((bucket) => {
          const categories = breakdown.filter((c) => c.budget_bucket === bucket.key);
          const bucketActual = categories.reduce((sum, c) => sum + c.actual, 0);
          const bucketTarget = Number(targets[bucket.key] ?? 0);
          const isOver = bucketActual > bucketTarget && bucketTarget > 0;
          const statusClass = bucketTarget === 0 ? "neutral" : isOver ? "danger" : "success";
          const maxAmount = Math.max(...categories.map((c) => c.actual), 1);

          return (
            <div key={bucket.key} className="category-budget-bucket">
              <div className="category-budget-bucket-header">
                <div className="category-budget-bucket-title">
                  <strong>{bucket.label}</strong>
                  <span className={`budget-rule-status ${statusClass}`}>
                    {bucketTarget === 0 ? "Sin meta" : isOver ? "Excedido" : "En rango"}
                  </span>
                </div>
                <div className="category-budget-amounts">
                  <span>{formatCompactGuarani(bucketActual)}</span>
                  {bucketTarget > 0 && (
                    <small>meta {formatCompactGuarani(bucketTarget)}</small>
                  )}
                </div>
              </div>

              {categories.length === 0 ? (
                <p className="empty-report">Sin gastos registrados este mes.</p>
              ) : (
                <div className="category-budget-rows">
                  {categories.map((cat) => {
                    const barWidth = Math.max(4, (cat.actual / maxAmount) * 100);
                    return (
                      <div key={cat.category} className="category-budget-row">
                        <span className="category-budget-name">{cat.label}</span>
                        <div className="comparison-track single">
                          <div
                            className="comparison-fill inventory"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="category-budget-amount">
                          {formatCompactGuarani(cat.actual)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
