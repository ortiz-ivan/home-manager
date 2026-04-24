import { formatGuarani, formatMonthYear } from "./utils.js";

const BUDGET_BUCKET_META = [
  { key: "needs", label: "Necesidades", targetLabel: "50%" },
  { key: "wants", label: "Deseos", targetLabel: "30%" },
  { key: "savings", label: "Ahorro", targetLabel: "20%" },
];

function getBucketStatus(bucketKey, actual, target) {
  if (target <= 0) {
    return {
      tone: "neutral",
      label: "Sin objetivo",
      percentage: 0,
      width: 0,
    };
  }

  const percentage = (actual / target) * 100;

  if (bucketKey === "savings") {
    if (percentage >= 100) {
      return { tone: "success", label: "En objetivo", percentage, width: 100 };
    }

    if (percentage >= 75) {
      return { tone: "warning", label: "Cerca", percentage, width: percentage };
    }

    return { tone: "danger", label: "Bajo objetivo", percentage, width: percentage };
  }

  if (percentage > 100) {
    return { tone: "danger", label: "Excedido", percentage, width: 100 };
  }

  if (percentage >= 85) {
    return { tone: "warning", label: "Cerca", percentage, width: percentage };
  }

  return { tone: "success", label: "En objetivo", percentage, width: percentage };
}

function formatVariance(value, invert = false) {
  const normalized = invert ? value * -1 : value;
  const sign = normalized > 0 ? "+" : "";
  return `${sign}${formatGuarani(normalized)}`;
}

export function FinanceSummaryCards({ summary }) {
  const budgetRule = summary.rule_50_30_20;

  return (
    <div className="kpi-grid finance-kpi-grid">
      <article className="kpi-card">
        <p>Ingresos del mes</p>
        <h3>{formatGuarani(summary.total_income)}</h3>
        <small>{formatMonthYear(summary.month, summary.year)}</small>
      </article>

      <article className="kpi-card">
        <p>Gasto mensual total</p>
        <h3>{formatGuarani(summary.estimated_expenses)}</h3>
        <small>
          Hogar: {formatGuarani(summary.home_estimated_expenses || 0)} | Fijos: {formatGuarani(summary.fixed_estimated_expenses || 0)} | Variables del mes: {formatGuarani(summary.variable_expenses || 0)}
        </small>
      </article>

      <article className="kpi-card">
        <p>Porcentaje de gasto sobre ingreso</p>
        <h3>{summary.expense_percentage === null ? "Sin ingresos" : `${summary.expense_percentage}%`}</h3>
        <small>Saldo restante: {formatGuarani(summary.remaining_balance)}</small>
      </article>

      <article className="kpi-card">
        <p>Regla 50-30-20</p>
        <h3>{summary.total_income > 0 ? "Seguimiento activo" : "Sin base"}</h3>
        {budgetRule ? (
          <div className="budget-rule-list">
            {BUDGET_BUCKET_META.map((bucket) => {
              const actual = budgetRule.actuals[bucket.key] || 0;
              const target = budgetRule.targets[bucket.key] || 0;
              const variance = budgetRule.variance[bucket.key] || 0;
              const status = getBucketStatus(bucket.key, actual, target);
              const isSavings = bucket.key === "savings";

              return (
                <div className="budget-rule-row" key={bucket.key}>
                  <div className="budget-rule-head">
                    <div>
                      <strong>{bucket.label}</strong>
                      <span>{bucket.targetLabel} del ingreso</span>
                    </div>
                    <span className={`budget-rule-status ${status.tone}`}>{status.label}</span>
                  </div>

                  <div className="budget-rule-track" aria-hidden="true">
                    <div
                      className={`budget-rule-fill ${status.tone}`}
                      style={{ width: `${Math.max(0, Math.min(status.width, 100))}%` }}
                    />
                  </div>

                  <div className="budget-rule-values">
                    <small>
                      {formatGuarani(actual)} de {formatGuarani(target)}
                    </small>
                    <small className={`budget-rule-delta ${status.tone}`}>
                      {isSavings ? "Brecha" : "Diferencia"}: {formatVariance(variance, isSavings)}
                    </small>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <small>Sin datos para calcular la distribucion mensual.</small>
        )}
      </article>
    </div>
  );
}