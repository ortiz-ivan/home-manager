import {
  getHouseholdTaskAreaLabel,
  getHouseholdTaskCategoryLabel,
  getHouseholdTaskPriorityLabel,
} from "../../constants/inventory.js";
import { formatFrequencyLabel, getOccurrenceUrgency } from "./utils.js";

function getDashboardTitle(summary) {
  if (summary.overdue.length > 0) {
    return "Hay tareas atrasadas que requieren atencion inmediata.";
  }
  if (summary.today.length > 0) {
    return "Estas son las rutinas que vencen hoy.";
  }
  if (summary.upcoming.length > 0) {
    return "Esto se viene en los proximos 7 dias.";
  }
  return "No tienes pendientes domesticos criticos hoy.";
}

export function HouseholdDashboardSection({ summary }) {
  const criticalItems = [...summary.overdue, ...summary.today, ...summary.upcoming].slice(0, 5);

  return (
    <article className="panel recent-panel">
      <div className="panel-title">
        <div>
          <h3>Agenda domestica</h3>
          <p>{getDashboardTitle(summary)}</p>
        </div>
      </div>

      <div className="inventory-stats">
        <span className="badge low-stock">Atrasadas: {summary.overdue.length}</span>
        <span className="badge">Hoy: {summary.today.length}</span>
        <span className="badge">Semana: {summary.upcoming.length}</span>
      </div>

      {criticalItems.length === 0 ? (
        <p>No hay tareas criticas para mostrar.</p>
      ) : (
        <div className="summary-list">
          {criticalItems.map((occurrence) => (
            <div className="summary-row" key={occurrence.id}>
              <div>
                <strong>{occurrence.recurring_task_title}</strong>
                <p>{getHouseholdTaskCategoryLabel(occurrence.recurring_task_category)}</p>
                <small>{getHouseholdTaskAreaLabel(occurrence.recurring_task_area)} | {getHouseholdTaskPriorityLabel(occurrence.recurring_task_priority)}</small>
                <br />
                <small>{formatFrequencyLabel(occurrence)}</small>
              </div>
              <div className={`stock-chip ${getOccurrenceUrgency(occurrence) === "overdue" ? "bajo" : "medio"}`}>
                {occurrence.due_date}
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}