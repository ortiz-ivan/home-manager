import {
  getHouseholdTaskAreaLabel,
  getHouseholdTaskCategoryLabel,
  getHouseholdTaskPriorityLabel,
} from "../../constants/inventory.js";
import { getHouseholdIntegrationLabel, getHouseholdIntegrationToneClass } from "./integration.js";

function formatTemplateSchedule(task) {
  if (task.frequency_type === "daily") {
    return task.interval > 1 ? `Cada ${task.interval} dias` : "Diaria";
  }

  if (task.frequency_type === "weekly") {
    return task.interval > 1 ? `Cada ${task.interval} semanas` : "Semanal";
  }

  const dayLabel = task.day_of_month ? `dia ${task.day_of_month}` : "mensual";
  return task.interval > 1 ? `Cada ${task.interval} meses, ${dayLabel}` : `Mensual, ${dayLabel}`;
}

export function RecurringTaskTemplatesSection({ recurringTasks }) {
  return (
    <article className="panel">
      <div className="panel-title">
        <h3>Plantillas activas</h3>
      </div>

      {recurringTasks.length === 0 ? (
        <p>Aun no hay tareas recurrentes creadas.</p>
      ) : (
        <div className="summary-list">
          {recurringTasks.map((task) => (
            <div className="summary-row" key={task.id}>
              <div>
                <strong>{task.title}</strong>
                <p>{getHouseholdTaskCategoryLabel(task.category)}</p>
                <small>{getHouseholdTaskAreaLabel(task.area)} | {getHouseholdTaskPriorityLabel(task.priority)}</small>
                <br />
                <small>{formatTemplateSchedule(task)}</small>
                {task.linked_context ? (
                  <div className="integration-context">
                    <span className={`integration-chip ${getHouseholdIntegrationToneClass(task.linked_context.tone)}`}>
                      {getHouseholdIntegrationLabel(task.integration_kind)}
                    </span>
                    <small>{task.linked_context.entity_name}: {task.linked_context.summary}</small>
                    <small>{task.linked_context.detail}</small>
                  </div>
                ) : null}
              </div>
              <div>
                <small>{task.is_active ? "Activa" : "Inactiva"}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}