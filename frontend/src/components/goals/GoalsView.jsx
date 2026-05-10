import { formatCurrency } from "../../constants/inventory.js";
import { ContributeModal } from "./ContributeModal.jsx";
import { GoalCard } from "./GoalCard.jsx";
import { GoalForm } from "./GoalForm.jsx";
import { useGoalsViewController } from "./useGoalsViewController.js";

export function GoalsView() {
  const {
    goals,
    loading,
    isActing,
    isGoalModalOpen,
    formData,
    editingGoal,
    contributeTargetId,
    contributeAmount,
    message,
    isError,
    activeGoals,
    completedGoals,
    totalTarget,
    totalSaved,
    totalRemaining,
    handleChange,
    handleSubmit,
    handleEditGoal,
    handleCancelEdit,
    handleDeleteGoal,
    handleOpenContribute,
    handleCloseContribute,
    setContributeAmount,
    handleContributeSubmit,
    openGoalModal,
    closeGoalModal,
  } = useGoalsViewController();

  return (
    <section className="module-content fade-in">
      <div className="section-header expenses-header">
        <div className="section-header-copy">
          <h2>Metas financieras</h2>
          <p>Seguimiento de ahorro, deudas y compras grandes. Registra aportes y mide tu avance.</p>
        </div>
        <div className="expenses-header-actions">
          <button className="btn btn-primary" type="button" onClick={openGoalModal}>
            Nueva meta
          </button>
        </div>
      </div>

      {isGoalModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={editingGoal ? "Editar meta" : "Nueva meta"}
          onClick={closeGoalModal}
        >
          <div className="modal-content compact" onClick={(event) => event.stopPropagation()}>
            <GoalForm
              formData={formData}
              editingGoal={editingGoal}
              message={!contributeTargetId ? message : ""}
              isError={isError}
              isActing={isActing}
              onChange={handleChange}
              onSubmit={handleSubmit}
              onCancel={handleCancelEdit}
              onClose={closeGoalModal}
            />
          </div>
        </div>
      )}

      {loading ? (
        <article className="panel">
          <p>Cargando metas...</p>
        </article>
      ) : (
        <>
          <div className="kpi-grid">
            <article className="kpi-card">
              <p>Metas activas</p>
              <h3>{activeGoals.length}</h3>
              <small>{completedGoals.length} completada(s)</small>
            </article>

            <article className="kpi-card">
              <p>Total objetivo</p>
              <h3>{formatCurrency(totalTarget)}</h3>
              <small>Suma de todas las metas</small>
            </article>

            <article className="kpi-card">
              <p>Total acumulado</p>
              <h3>{formatCurrency(totalSaved)}</h3>
              <small>Lo que ya tienes ahorrado o pagado</small>
            </article>

            <article className="kpi-card">
              <p>Por alcanzar</p>
              <h3>{formatCurrency(totalRemaining)}</h3>
              <small>Lo que falta para cerrar todas las metas</small>
            </article>
          </div>

          <div className="finance-grid">
            {goals.length === 0 ? (
              <article className="panel">
                <p>No hay metas registradas. Crea la primera usando el formulario.</p>
              </article>
            ) : (
              goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  isActing={isActing}
                  onContribute={handleOpenContribute}
                  onEdit={handleEditGoal}
                  onDelete={handleDeleteGoal}
                />
              ))
            )}
          </div>
        </>
      )}

      <ContributeModal
        goals={goals}
        targetId={contributeTargetId}
        amount={contributeAmount}
        message={contributeTargetId ? message : ""}
        isError={isError}
        isActing={isActing}
        onChange={setContributeAmount}
        onSubmit={handleContributeSubmit}
        onClose={handleCloseContribute}
      />
    </section>
  );
}
