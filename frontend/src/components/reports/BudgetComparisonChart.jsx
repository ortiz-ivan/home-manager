import { formatCompactGuarani, formatDelta } from "./utils.js";

export function BudgetComparisonChart({ summary }) {
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
          <p>Lectura compacta entre meta y ejecucion real.</p>
        </div>
      </div>

      <div className="budget-bullet-list">
        {rows.map((row) => {
          const target = Number(summary.rule_50_30_20?.targets?.[row.key] || 0);
          const actual = Number(summary.rule_50_30_20?.actuals?.[row.key] || 0);
          const delta = Number(summary.rule_50_30_20?.variance?.[row.key] || 0);
          const max = Math.max(target, actual, 1);
          const actualWidth = Math.max(8, (actual / max) * 100);
          const targetLeft = Math.max(0, Math.min((target / max) * 100, 100));
          return (
            <div key={row.key} className="budget-bullet-row">
              <div className="budget-bullet-head">
                <strong>{row.label}</strong>
                <span>{formatDelta(delta)}</span>
              </div>
              <div className="budget-bullet-track">
                <div className={`budget-bullet-fill ${delta > 0 ? "danger" : "success"}`} style={{ width: `${actualWidth}%` }} />
                <span className="budget-bullet-marker" style={{ left: `${targetLeft}%` }} aria-hidden="true" />
              </div>
              <div className="budget-bullet-values">
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