export function FixedExpensesStatusChart({ fixedExpenses }) {
  const paid = fixedExpenses.filter((item) => item.monthly_payment_status === "paid").length;
  const pending = fixedExpenses.filter((item) => item.monthly_payment_status !== "paid").length;
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
            <span>{fixedExpenses.length}</span>
          </div>
        </div>
      </div>
    </article>
  );
}