import {
  getHouseholdTaskAreaLabel,
  getHouseholdTaskCategoryLabel,
  getHouseholdTaskPriorityLabel,
} from "../../constants/inventory.js";
import { getHouseholdIntegrationLabel, getHouseholdIntegrationToneClass } from "./integration.js";
import { formatFrequencyLabel, getOccurrenceUrgency } from "./utils.js";

function getStatusLabel(occurrence, urgency) {
  if (occurrence.status === "done") {
    return "Hecha";
  }
  if (occurrence.status === "skipped") {
    return "Omitida";
  }
  if (urgency === "overdue") {
    return "Atrasada";
  }
  if (urgency === "today") {
    return "Hoy";
  }
  return "Pendiente";
}

export function TaskAgendaSection({
  title,
  description,
  occurrences,
  emptyMessage,
  actionMode = "pending",
  isActing = false,
  onComplete,
  onSkip,
  onReopen,
}) {
  return (
    <article className="panel">
      <div className="panel-title">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      {occurrences.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <div className="income-list">
          {occurrences.map((occurrence) => (
            <div className="income-row" key={occurrence.id}>
              <div>
                <strong>{occurrence.recurring_task_title}</strong>
                <p>{getHouseholdTaskCategoryLabel(occurrence.recurring_task_category)}</p>
                <small>{getHouseholdTaskAreaLabel(occurrence.recurring_task_area)} | {getHouseholdTaskPriorityLabel(occurrence.recurring_task_priority)}</small>
                <br />
                <small>{formatFrequencyLabel(occurrence)}</small>
                {occurrence.linked_context ? (
                  <div className="integration-context">
                    <span className={`integration-chip ${getHouseholdIntegrationToneClass(occurrence.linked_context.tone)}`}>
                      {getHouseholdIntegrationLabel(occurrence.integration_kind)}
                    </span>
                    <small>{occurrence.linked_context.entity_name}: {occurrence.linked_context.summary}</small>
                  </div>
                ) : null}
              </div>
              <div className="fixed-expense-side">
                <strong>{occurrence.due_date}</strong>
                <span className={`badge ${getOccurrenceUrgency(occurrence) === "overdue" ? "low-stock" : ""}`}>
                  {getStatusLabel(occurrence, getOccurrenceUrgency(occurrence))}
                </span>
                <div className="actions">
                  {actionMode === "pending" && (
                    <>
                      <button className="btn btn-success" type="button" disabled={isActing} onClick={() => onComplete(occurrence.id)}>
                        Hecha
                      </button>
                      <button className="btn btn-outline" type="button" disabled={isActing} onClick={() => onSkip(occurrence.id)}>
                        Omitir
                      </button>
                    </>
                  )}
                  {actionMode === "resolved" && (
                    <button className="btn btn-secondary" type="button" disabled={isActing} onClick={() => onReopen(occurrence.id)}>
                      Reabrir
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}