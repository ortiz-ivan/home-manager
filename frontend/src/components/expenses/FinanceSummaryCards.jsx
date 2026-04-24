import { formatGuarani, formatMonthYear } from "./utils.js";

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
          <small>
            Necesidades: {formatGuarani(budgetRule.actuals.needs)} / {formatGuarani(budgetRule.targets.needs)} | Deseos: {formatGuarani(budgetRule.actuals.wants)} / {formatGuarani(budgetRule.targets.wants)} | Ahorro: {formatGuarani(budgetRule.actuals.savings)} / {formatGuarani(budgetRule.targets.savings)}
          </small>
        ) : (
          <small>Sin datos para calcular la distribucion mensual.</small>
        )}
      </article>
    </div>
  );
}