import { HouseholdFiltersBar } from "./HouseholdFiltersBar.jsx";
import { HouseholdComplianceSection } from "./HouseholdComplianceSection.jsx";
import { HouseholdInsightsCards } from "./HouseholdInsightsCards.jsx";
import { HouseholdRiskSection } from "./HouseholdRiskSection.jsx";
import { RecurringTaskForm } from "./RecurringTaskForm.jsx";
import { RecurringTaskTemplatesSection } from "./RecurringTaskTemplatesSection.jsx";
import { HouseholdSummaryCards } from "./HouseholdSummaryCards.jsx";
import { TaskAgendaSection } from "./TaskAgendaSection.jsx";
import { useHouseholdViewController } from "./useHouseholdViewController.js";

export function HouseholdView() {
  const {
    recurringTasks,
    insights,
    filters,
    categoryOptions,
    areaOptions,
    priorityOptions,
    integrationOptions,
    fixedExpenseOptions,
    productOptions,
    todayOccurrences,
    upcomingOccurrences,
    overdueOccurrences,
    resolvedOccurrences,
    loading,
    isActing,
    formData,
    message,
    isError,
    today,
    handleChange,
    handleFilterChange,
    handleResetFilters,
    handleSubmit,
    handleOccurrenceAction,
  } = useHouseholdViewController();

  return (
    <section className="module-content fade-in">
      <div className="section-header">
        <h2>Rutinas del hogar</h2>
        <p>Crea tareas semanales o mensuales y visualizalas en una agenda operativa basica.</p>
      </div>

      {loading ? (
        <article className="panel">
          <p>Cargando tareas recurrentes...</p>
        </article>
      ) : (
        <>
          <HouseholdSummaryCards
            overdueCount={overdueOccurrences.length}
            todayCount={todayOccurrences.length}
            upcomingCount={upcomingOccurrences.length}
          />

          <HouseholdInsightsCards
            weeklyEstimatedMinutes={insights.weekly_estimated_minutes}
            overdueTasksCount={insights.overdue_tasks_count}
            latestCompletionRate={insights.weekly_completion.at(-1)?.completion_rate || 0}
          />

          <HouseholdFiltersBar
            filters={filters}
            categoryOptions={categoryOptions}
            areaOptions={areaOptions}
            priorityOptions={priorityOptions}
            onChange={handleFilterChange}
            onReset={handleResetFilters}
          />

          <div className="finance-grid">
            <RecurringTaskForm
              formData={formData}
              message={message}
              isError={isError}
              categoryOptions={categoryOptions}
              areaOptions={areaOptions}
              priorityOptions={priorityOptions}
              integrationOptions={integrationOptions}
              fixedExpenseOptions={fixedExpenseOptions}
              productOptions={productOptions}
              onChange={handleChange}
              onSubmit={handleSubmit}
            />
            <RecurringTaskTemplatesSection recurringTasks={recurringTasks} />
            <HouseholdComplianceSection weeklyCompletion={insights.weekly_completion} />
            <HouseholdRiskSection
              mostPostponedTasks={insights.most_postponed_tasks}
              recurringOverdueTasks={insights.recurring_overdue_tasks}
            />
            <TaskAgendaSection
              title="Atrasadas"
              description="Lo pendiente con vencimiento previo a hoy debe salir primero."
              occurrences={overdueOccurrences}
              emptyMessage="No hay tareas atrasadas."
              isActing={isActing}
              onComplete={(id) => handleOccurrenceAction(id, "complete")}
              onSkip={(id) => handleOccurrenceAction(id, "skip")}
            />
            <TaskAgendaSection
              title="Hoy"
              description={`Tareas con vencimiento para ${today}.`}
              occurrences={todayOccurrences}
              emptyMessage="No hay tareas previstas para hoy."
              isActing={isActing}
              onComplete={(id) => handleOccurrenceAction(id, "complete")}
              onSkip={(id) => handleOccurrenceAction(id, "skip")}
            />
            <TaskAgendaSection
              title="Proximos 7 dias"
              description="Rutinas semanales o mensuales que ya conviene anticipar."
              occurrences={upcomingOccurrences}
              emptyMessage="No hay pendientes para la proxima semana."
              isActing={isActing}
              onComplete={(id) => handleOccurrenceAction(id, "complete")}
              onSkip={(id) => handleOccurrenceAction(id, "skip")}
            />
            <TaskAgendaSection
              title="Actividad reciente"
              description="Desde aqui puedes reabrir tareas hechas u omitidas por error."
              occurrences={resolvedOccurrences}
              emptyMessage="Aun no hay actividad reciente para mostrar."
              actionMode="resolved"
              isActing={isActing}
              onReopen={(id) => handleOccurrenceAction(id, "reopen")}
            />
          </div>
        </>
      )}
    </section>
  );
}