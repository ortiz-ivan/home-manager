import { FixedExpenseForm } from "./FixedExpenseForm.jsx";
import { FixedExpenseDetailModal } from "./FixedExpenseDetailModal.jsx";
import { IncomeModal } from "./IncomeModal.jsx";
import { VariableExpenseModal } from "./VariableExpenseModal.jsx";

export function ExpensesModals({ income, variable, fixed, onDataChanged }) {
  return (
    <>
      {fixed.isExpenseModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Agregar gasto fijo"
          onClick={fixed.closeExpenseModal}
        >
          <div className="modal-content compact" onClick={(event) => event.stopPropagation()}>
            <FixedExpenseForm compact onFixedExpenseSaved={onDataChanged} onClose={fixed.closeExpenseModal} />
          </div>
        </div>
      )}

      <FixedExpenseDetailModal
        expense={fixed.selectedFixedExpense}
        isOpen={Boolean(fixed.selectedFixedExpense)}
        onClose={fixed.closeFixedExpenseDetail}
      />

      <IncomeModal
        isOpen={income.isIncomeModalOpen}
        title="Registrar ingreso"
        ariaLabel="Agregar ingreso"
        formData={income.formData}
        onChange={income.handleChange}
        onSubmit={income.handleSubmit}
        onClose={income.closeIncomeModal}
        message={income.message}
        isError={income.isError}
        submitLabel="Guardar ingreso"
        requireChangeReason={false}
      />

      <VariableExpenseModal
        isOpen={variable.isVariableModalOpen}
        title="Registrar gasto variable"
        ariaLabel="Agregar gasto variable"
        formData={variable.variableForm}
        onChange={variable.handleVariableChange}
        onSubmit={variable.handleVariableSubmit}
        onClose={variable.closeVariableModal}
        message={variable.variableMessage}
        isError={variable.isVariableError}
        submitLabel="Guardar gasto"
        requireChangeReason={false}
      />

      <IncomeModal
        isOpen={income.isEditIncomeModalOpen}
        title="Editar ingreso"
        ariaLabel="Editar ingreso"
        formData={income.editIncomeForm}
        onChange={income.handleEditIncomeChange}
        onSubmit={income.handleEditIncomeSubmit}
        onClose={income.closeEditIncomeModal}
        message={income.editIncomeMessage}
        isError={income.isEditIncomeError}
        submitLabel="Guardar cambios"
        requireChangeReason
      />

      <VariableExpenseModal
        isOpen={variable.isEditVariableModalOpen}
        title="Editar gasto variable"
        ariaLabel="Editar gasto variable"
        formData={variable.editVariableForm}
        onChange={variable.handleEditVariableChange}
        onSubmit={variable.handleEditVariableSubmit}
        onClose={variable.closeEditVariableModal}
        message={variable.editVariableMessage}
        isError={variable.isEditVariableError}
        submitLabel="Guardar cambios"
        requireChangeReason
      />

      {fixed.isEditFixedExpenseModalOpen && fixed.editFixedExpenseForm && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Editar gasto fijo"
          onClick={fixed.closeEditFixedExpenseModal}
        >
          <div className="modal-content compact" onClick={(event) => event.stopPropagation()}>
            <FixedExpenseForm
              compact
              fixedExpenseId={fixed.editingFixedExpenseId}
              initialData={fixed.editFixedExpenseForm}
              title="Editar gasto fijo"
              submitLabel="Guardar cambios"
              onFixedExpenseSaved={async () => {
                await onDataChanged();
                fixed.closeEditFixedExpenseModal();
              }}
              onClose={fixed.closeEditFixedExpenseModal}
            />
          </div>
        </div>
      )}
    </>
  );
}