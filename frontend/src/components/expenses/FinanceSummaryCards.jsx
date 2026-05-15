import { formatGuarani, formatMonthYear } from "./utils.js";

export function FinanceSummaryCards({ summary }) {
  return (
    <div className="kpi-grid finance-kpi-grid">
      <article className="kpi-card">
        <p>Ingresos del mes</p>
        <h3>{formatGuarani(summary.total_income)}</h3>
        <small>{formatMonthYear(summary.month, summary.year)}</small>
      </article>

      <article className="kpi-card">
        <p>Pagado este mes</p>
        <h3>{formatGuarani(summary.paid_expenses ?? summary.fixed_estimated_expenses ?? 0)}</h3>
        <small>
          Fijos: {formatGuarani(summary.fixed_estimated_expenses || 0)} | Variables: {formatGuarani(summary.paid_variable_expenses || 0)}
        </small>
      </article>

      <article className="kpi-card">
        <p>Comprometido (por pagar)</p>
        <h3>{formatGuarani(summary.committed_expenses ?? 0)}</h3>
        <small>
          Fijos pendientes: {formatGuarani(summary.committed_fixed_expenses || 0)} | Variables: {formatGuarani(summary.committed_variable_expenses || 0)}
        </small>
      </article>

      <article className="kpi-card">
        <p>Porcentaje de gasto sobre ingreso</p>
        <h3>{summary.expense_percentage === null ? "Sin ingresos" : `${summary.expense_percentage}%`}</h3>
        <small>Saldo restante: {formatGuarani(summary.remaining_balance)}</small>
      </article>
    </div>
  );
}