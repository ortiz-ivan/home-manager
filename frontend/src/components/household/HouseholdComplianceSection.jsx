function getComplianceTone(point) {
  if (point.completion_rate >= 80) {
    return "alto";
  }
  if (point.completion_rate >= 50) {
    return "medio";
  }
  return "bajo";
}

export function HouseholdComplianceSection({ weeklyCompletion }) {
  return (
    <article className="panel">
      <div className="panel-title">
        <div>
          <h3>Cumplimiento por semana</h3>
          <p>Sirve para ver si las rutinas se sostienen o se degradan con el tiempo.</p>
        </div>
      </div>

      {weeklyCompletion.length === 0 ? (
        <p>No hay suficientes datos semanales para calcular cumplimiento.</p>
      ) : (
        <div className="summary-list">
          {weeklyCompletion.map((point) => (
            <div className="summary-row" key={point.week_start}>
              <div>
                <strong>{point.week_start} al {point.week_end}</strong>
                <p>{point.completed} hechas de {point.total_due} programadas</p>
                <small>Saltadas: {point.skipped} | Atrasadas abiertas: {point.overdue_open}</small>
              </div>
              <div className={`stock-chip ${getComplianceTone(point)}`}>
                {point.completion_rate}%
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}