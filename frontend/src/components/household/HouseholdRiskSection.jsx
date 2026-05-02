import {
  getHouseholdTaskAreaLabel,
  getHouseholdTaskCategoryLabel,
  getHouseholdTaskPriorityLabel,
} from "../../constants/inventory.js";
import { getHouseholdIntegrationLabel, getHouseholdIntegrationToneClass } from "./integration.js";

function RiskList({ title, description, items, emptyMessage }) {
  return (
    <article className="panel">
      <div className="panel-title">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <div className="income-list">
          {items.map((item) => (
            <div className="income-row" key={`${title}-${item.recurring_task_id}`}>
              <div>
                <strong>{item.title}</strong>
                <p>{getHouseholdTaskCategoryLabel(item.category)}</p>
                <small>{getHouseholdTaskAreaLabel(item.area)} | {getHouseholdTaskPriorityLabel(item.priority)}</small>
                {item.linked_context ? (
                  <div className="integration-context">
                    <span className={`integration-chip ${getHouseholdIntegrationToneClass(item.linked_context.tone)}`}>
                      {getHouseholdIntegrationLabel(item.integration_kind)}
                    </span>
                    <small>{item.linked_context.entity_name}: {item.linked_context.summary}</small>
                  </div>
                ) : null}
              </div>
              <div className="fixed-expense-side">
                <strong>{item.postponement_score}</strong>
                <small>Atrasos: {item.overdue_count} | Saltos: {item.skipped_count}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export function HouseholdRiskSection({ mostPostponedTasks, recurringOverdueTasks }) {
  return (
    <>
      <RiskList
        title="Tareas mas postergadas"
        description="Combina atrasos, saltos y cierres tardios para detectar donde se acumula friccion." 
        items={mostPostponedTasks}
        emptyMessage="No hay postergaciones registradas en la ventana actual."
      />
      <RiskList
        title="Rutinas con atraso recurrente"
        description="Aqui aparecen las rutinas que se estan incumpliendo de forma sistematica."
        items={recurringOverdueTasks}
        emptyMessage="No hay rutinas con atraso recurrente detectadas."
      />
    </>
  );
}