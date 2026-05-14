import { formatGuarani } from "./utils.js";

function fillClass(projection, totalIncome) {
  if (!projection.projected_month_end || totalIncome <= 0) return "neutral";
  const pct = projection.projected_expense_pct ?? 0;
  if (pct > 100) return "danger";
  if (pct > 90) return "warning";
  return "success";
}

export function ProjectionSection({ summary }) {
  const projection = summary?.projection;
  if (!projection?.is_current_month) return null;

  const {
    days_elapsed,
    days_total,
    actual_spend_so_far,
    daily_rate,
    projected_month_end,
    projected_remaining,
    projected_expense_pct,
    alerts,
  } = projection;

  const dayProgress = Math.min(100, Math.round((days_elapsed / days_total) * 100));
  const barClass = fillClass(projection, summary.total_income);

  return (
    <div className="projection-section">
      {alerts.map((alert, i) => (
        <div key={i} className={`reminder-strip is-${alert.level}`}>
          <p>{alert.message}</p>
        </div>
      ))}

      <div className="projection-header">
        <span className="projection-label">Proyección del mes</span>
        <span className="projection-days">Día {days_elapsed} de {days_total} · {dayProgress}% transcurrido</span>
      </div>

      <div className="budget-rule-track">
        <div className={`budget-rule-fill ${barClass}`} style={{ width: `${dayProgress}%` }} />
      </div>

      <div className="kpi-grid">
        <article className="kpi-card">
          <p>Gasto real hasta hoy</p>
          <h3>{formatGuarani(actual_spend_so_far)}</h3>
          <small>Promedio diario: {formatGuarani(daily_rate ?? 0)}</small>
        </article>

        <article className="kpi-card">
          <p>Proyección fin de mes</p>
          <h3>{projected_month_end != null ? formatGuarani(projected_month_end) : "—"}</h3>
          <small>
            {projected_expense_pct != null
              ? `${projected_expense_pct.toFixed(1)}% de los ingresos`
              : "Sin ingresos registrados"}
          </small>
        </article>

        <article className="kpi-card">
          <p>Saldo proyectado al cierre</p>
          <h3 className={projected_remaining != null && projected_remaining < 0 ? "danger-inline" : ""}>
            {projected_remaining != null ? formatGuarani(projected_remaining) : "—"}
          </h3>
          <small>Estimado al día {days_total}</small>
        </article>
      </div>
    </div>
  );
}
