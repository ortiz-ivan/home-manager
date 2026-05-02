export function HouseholdInsightsCards({ weeklyEstimatedMinutes, overdueTasksCount, latestCompletionRate }) {
  return (
    <div className="kpi-grid">
      <article className="kpi-card">
        <p>Cumplimiento semanal</p>
        <h3>{latestCompletionRate}%</h3>
        <small>Porcentaje completado en la semana mas reciente.</small>
      </article>

      <article className="kpi-card">
        <p>Tiempo comprometido por semana</p>
        <h3>{weeklyEstimatedMinutes} min</h3>
        <small>Carga semanal promedio planificada.</small>
      </article>

      <article className="kpi-card">
        <p>Rutinas con atraso</p>
        <h3>{overdueTasksCount}</h3>
        <small>Tareas con al menos un atraso en la ventana analizada.</small>
      </article>
    </div>
  );
}