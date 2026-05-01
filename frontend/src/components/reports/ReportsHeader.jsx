import { formatCurrency } from "../../constants/inventory.js";

export function ReportsHeader({ financeSummary, incomesCount, variableExpensesCount, projectedSavings }) {
  return (
    <div className="section-header reports-header">
      <div>
        <h2>Centro de reportes</h2>
        <p>Vista exclusiva para leer tendencia financiera, presion operativa y distribucion del inventario.</p>
      </div>
      <div className="reports-header-kpis">
        <article className="kpi-card accent-blue">
          <p>Ingreso del mes</p>
          <h3>{formatCurrency(financeSummary.total_income)}</h3>
          <small>{incomesCount} movimientos registrados.</small>
        </article>
        <article className="kpi-card accent-green">
          <p>Saldo proyectado</p>
          <h3>{formatCurrency(projectedSavings)}</h3>
          <small>{variableExpensesCount} gastos variables activos.</small>
        </article>
      </div>
    </div>
  );
}