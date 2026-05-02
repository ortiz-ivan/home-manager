export function HouseholdSummaryCards({ overdueCount, todayCount, upcomingCount }) {
  return (
    <div className="kpi-grid">
      <article className="kpi-card">
        <p>Tareas atrasadas</p>
        <h3>{overdueCount}</h3>
        <small>Lo vencido necesita atencion inmediata.</small>
      </article>

      <article className="kpi-card">
        <p>Vencen hoy</p>
        <h3>{todayCount}</h3>
        <small>Rutinas a resolver durante el dia.</small>
      </article>

      <article className="kpi-card">
        <p>Proximos 7 dias</p>
        <h3>{upcomingCount}</h3>
        <small>Te ayuda a anticipar la semana domestica.</small>
      </article>
    </div>
  );
}