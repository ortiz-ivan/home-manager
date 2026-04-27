import { useMemo, useState } from "react";
import {
  createIncome,
  createMonthlyClose,
  createVariableExpense,
  deleteIncome,
  deleteVariableExpense,
  payFixedExpense,
  updateIncome,
  updateVariableExpense,
} from "../api.js";
import { getBudgetBucketForCategory } from "../constants/inventory.js";
import { ExpenseProductForm } from "./ExpenseProductForm.jsx";
import { FinancialTimelineSection } from "./expenses/FinancialTimelineSection.jsx";
import { FinanceSummaryCards } from "./expenses/FinanceSummaryCards.jsx";
import { FixedExpenseDetailModal } from "./expenses/FixedExpenseDetailModal.jsx";
import { FixedExpensesSection } from "./expenses/FixedExpensesSection.jsx";
import { IncomeModal } from "./expenses/IncomeModal.jsx";
import { IncomeSection } from "./expenses/IncomeSection.jsx";
import {
  createIncomeFormState,
  createVariableExpenseFormState,
  formatGuarani,
  toInputDate,
} from "./expenses/utils.js";
import { VariableExpenseModal } from "./expenses/VariableExpenseModal.jsx";
import { VariableExpensesSection } from "./expenses/VariableExpensesSection.jsx";

export function ExpensesPanel({
  incomes,
  summary,
  expenseProducts,
  variableExpenses,
  financialEvents,
  monthlyCloses,
  onDataChanged,
}) {
  const activePeriodInputDate = useMemo(() => {
    if (summary?.year && summary?.month) {
      return toInputDate(new Date(summary.year, summary.month - 1, 1));
    }

    return toInputDate(new Date());
  }, [summary?.month, summary?.year]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isEditIncomeModalOpen, setIsEditIncomeModalOpen] = useState(false);
  const [isVariableModalOpen, setIsVariableModalOpen] = useState(false);
  const [isEditVariableModalOpen, setIsEditVariableModalOpen] = useState(false);
  const [isEditFixedExpenseModalOpen, setIsEditFixedExpenseModalOpen] = useState(false);
  const [formData, setFormData] = useState(() => createIncomeFormState(activePeriodInputDate));
  const [variableForm, setVariableForm] = useState(() => createVariableExpenseFormState(activePeriodInputDate));
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [variableMessage, setVariableMessage] = useState("");
  const [isVariableError, setIsVariableError] = useState(false);
  const [fixedExpenseMessage, setFixedExpenseMessage] = useState("");
  const [isFixedExpenseError, setIsFixedExpenseError] = useState(false);
  const [payingExpenseId, setPayingExpenseId] = useState(null);
  const [editingIncomeId, setEditingIncomeId] = useState(null);
  const [editIncomeForm, setEditIncomeForm] = useState(() => createIncomeFormState(activePeriodInputDate));
  const [editIncomeMessage, setEditIncomeMessage] = useState("");
  const [isEditIncomeError, setIsEditIncomeError] = useState(false);
  const [editingVariableExpenseId, setEditingVariableExpenseId] = useState(null);
  const [editVariableForm, setEditVariableForm] = useState(() => createVariableExpenseFormState(activePeriodInputDate));
  const [editVariableMessage, setEditVariableMessage] = useState("");
  const [isEditVariableError, setIsEditVariableError] = useState(false);
  const [editingFixedExpenseId, setEditingFixedExpenseId] = useState(null);
  const [editFixedExpenseForm, setEditFixedExpenseForm] = useState(null);
  const [selectedFixedExpense, setSelectedFixedExpense] = useState(null);
  const [closeNotes, setCloseNotes] = useState("");
  const [closeMessage, setCloseMessage] = useState("");
  const [isCloseError, setIsCloseError] = useState(false);
  const [isClosingMonth, setIsClosingMonth] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVariableChange = (event) => {
    const { name, value } = event.target;
    setVariableForm((prev) => ({
      ...prev,
      ...(name === "category" ? { budget_bucket: getBudgetBucketForCategory(value) } : {}),
      [name]: value,
    }));
  };

  const handleEditIncomeChange = (event) => {
    const { name, value } = event.target;
    setEditIncomeForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditVariableChange = (event) => {
    const { name, value } = event.target;
    setEditVariableForm((prev) => ({
      ...prev,
      ...(name === "category" ? { budget_bucket: getBudgetBucketForCategory(value) } : {}),
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    const amount = Number(formData.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setMessage("El ingreso debe ser mayor a 0");
      setIsError(true);
      return;
    }

    try {
      await createIncome({
        ...formData,
        amount,
      });
      setFormData(createIncomeFormState(activePeriodInputDate));
      setMessage("Ingreso registrado");
      await onDataChanged();
      setIsIncomeModalOpen(false);
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    }
  };

  const handleDelete = async (income) => {
    const ok = window.confirm(`Eliminar ingreso de ${formatGuarani(income.amount)}?`);
    if (!ok) {
      return;
    }

    const changeReason = window.prompt("Motivo de la eliminacion", "Movimiento duplicado o cargado por error")?.trim() || "";
    if (!changeReason) {
      setMessage("Debes indicar el motivo de la eliminacion");
      setIsError(true);
      return;
    }

    setMessage("");
    setIsError(false);

    try {
      await deleteIncome(income.id, { change_reason: changeReason });
      await onDataChanged();
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    }
  };

  const handleEditIncome = (income) => {
    setEditingIncomeId(income.id);
    setEditIncomeForm({
      amount: String(income.amount ?? ""),
      source: income.source || "",
      notes: income.notes || "",
      change_reason: "",
      date: income.date,
    });
    setEditIncomeMessage("");
    setIsEditIncomeError(false);
    setIsEditIncomeModalOpen(true);
  };

  const handleEditIncomeSubmit = async (event) => {
    event.preventDefault();
    setEditIncomeMessage("");
    setIsEditIncomeError(false);

    const amount = Number(editIncomeForm.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setEditIncomeMessage("El ingreso debe ser mayor a 0");
      setIsEditIncomeError(true);
      return;
    }

    try {
      await updateIncome(editingIncomeId, {
        ...editIncomeForm,
        amount,
      });
      setEditIncomeMessage("Ingreso actualizado");
      await onDataChanged();
      setIsEditIncomeModalOpen(false);
    } catch (error) {
      setEditIncomeMessage(error.message);
      setIsEditIncomeError(true);
    }
  };

  const handleVariableSubmit = async (event) => {
    event.preventDefault();
    setVariableMessage("");
    setIsVariableError(false);

    const amount = Number(variableForm.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setVariableMessage("El gasto debe ser mayor a 0");
      setIsVariableError(true);
      return;
    }

    try {
      await createVariableExpense({
        ...variableForm,
        amount,
      });
      setVariableForm(createVariableExpenseFormState(activePeriodInputDate));
      setVariableMessage("Gasto variable registrado");
      await onDataChanged();
      setIsVariableModalOpen(false);
    } catch (error) {
      setVariableMessage(error.message);
      setIsVariableError(true);
    }
  };

  const handleEditVariableExpense = (expense) => {
    setEditingVariableExpenseId(expense.id);
    setEditVariableForm({
      amount: String(expense.amount ?? ""),
      category: expense.category,
      budget_bucket: expense.budget_bucket || getBudgetBucketForCategory(expense.category),
      description: expense.description || "",
      notes: expense.notes || "",
      change_reason: "",
      date: expense.date,
    });
    setEditVariableMessage("");
    setIsEditVariableError(false);
    setIsEditVariableModalOpen(true);
  };

  const handleEditVariableSubmit = async (event) => {
    event.preventDefault();
    setEditVariableMessage("");
    setIsEditVariableError(false);

    const amount = Number(editVariableForm.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setEditVariableMessage("El gasto debe ser mayor a 0");
      setIsEditVariableError(true);
      return;
    }

    try {
      await updateVariableExpense(editingVariableExpenseId, {
        ...editVariableForm,
        amount,
      });
      setEditVariableMessage("Gasto variable actualizado");
      await onDataChanged();
      setIsEditVariableModalOpen(false);
    } catch (error) {
      setEditVariableMessage(error.message);
      setIsEditVariableError(true);
    }
  };

  const openIncomeModal = () => {
    setMessage("");
    setIsError(false);
    setFormData(createIncomeFormState(activePeriodInputDate));
    setIsIncomeModalOpen(true);
  };

  const closeIncomeModal = () => {
    setIsIncomeModalOpen(false);
    setMessage("");
    setIsError(false);
  };

  const closeEditIncomeModal = () => {
    setIsEditIncomeModalOpen(false);
    setEditingIncomeId(null);
    setEditIncomeMessage("");
    setIsEditIncomeError(false);
  };

  const openVariableModal = () => {
    setVariableMessage("");
    setIsVariableError(false);
    setVariableForm(createVariableExpenseFormState(activePeriodInputDate));
    setIsVariableModalOpen(true);
  };

  const closeVariableModal = () => {
    setIsVariableModalOpen(false);
    setVariableMessage("");
    setIsVariableError(false);
  };

  const closeEditVariableModal = () => {
    setIsEditVariableModalOpen(false);
    setEditingVariableExpenseId(null);
    setEditVariableMessage("");
    setIsEditVariableError(false);
  };

  const handleEditFixedExpense = (expense) => {
    setEditingFixedExpenseId(expense.id);
    setEditFixedExpenseForm({
      name: expense.name,
      category: expense.category,
      budget_bucket: expense.budget_bucket || getBudgetBucketForCategory(expense.category),
      monthly_amount: expense.monthly_amount ?? "",
      next_due_date: expense.next_due_date || "",
      change_reason: "",
    });
    setIsEditFixedExpenseModalOpen(true);
  };

  const closeEditFixedExpenseModal = () => {
    setIsEditFixedExpenseModalOpen(false);
    setEditingFixedExpenseId(null);
    setEditFixedExpenseForm(null);
  };

  const openFixedExpenseDetail = (expense) => {
    setSelectedFixedExpense(expense);
  };

  const closeFixedExpenseDetail = () => {
    setSelectedFixedExpense(null);
  };

  const handleDeleteVariableExpense = async (expense) => {
    const ok = window.confirm(`Eliminar gasto de ${formatGuarani(expense.amount)}?`);
    if (!ok) {
      return;
    }

    const changeReason = window.prompt("Motivo de la eliminacion", "Movimiento duplicado o cargado por error")?.trim() || "";
    if (!changeReason) {
      setVariableMessage("Debes indicar el motivo de la eliminacion");
      setIsVariableError(true);
      return;
    }

    setVariableMessage("");
    setIsVariableError(false);

    try {
      await deleteVariableExpense(expense.id, { change_reason: changeReason });
      await onDataChanged();
    } catch (error) {
      setVariableMessage(error.message);
      setIsVariableError(true);
    }
  };

  const handlePayFixedExpense = async (expense) => {
    const changeReason = window.prompt("Motivo del pago", "Pago mensual confirmado")?.trim() || "";
    if (!changeReason) {
      setFixedExpenseMessage("Debes indicar el motivo del pago");
      setIsFixedExpenseError(true);
      return;
    }

    setFixedExpenseMessage("");
    setIsFixedExpenseError(false);
    setPayingExpenseId(expense.id);

    try {
      await payFixedExpense(expense.id, { change_reason: changeReason });
      setFixedExpenseMessage(`Pago registrado para ${expense.name}`);
      await onDataChanged();
    } catch (error) {
      setFixedExpenseMessage(error.message);
      setIsFixedExpenseError(true);
    } finally {
      setPayingExpenseId(null);
    }
  };

  const handleCloseNotesChange = (event) => {
    setCloseNotes(event.target.value);
  };

  const handleCloseMonth = async () => {
    setCloseMessage("");
    setIsCloseError(false);
    setIsClosingMonth(true);

    try {
      await createMonthlyClose({
        month: summary.month,
        year: summary.year,
        notes: closeNotes,
      });
      setCloseMessage("Cierre mensual registrado");
      setCloseNotes("");
      await onDataChanged();
    } catch (error) {
      setCloseMessage(error.message);
      setIsCloseError(true);
    } finally {
      setIsClosingMonth(false);
    }
  };

  return (
    <section className="module-content fade-in">
      <div className="section-header expenses-header">
        <div className="section-header-copy">
          <h2>Gastos vs ingresos</h2>
          <p>Registra tus ingresos y revisa que porcentaje de tus gastos mensuales ocupan.</p>
        </div>
        <div className="expenses-header-actions">
          <button className="btn btn-primary" type="button" onClick={() => setIsExpenseModalOpen(true)}>
            Agregar gasto fijo
          </button>
          <button className="btn btn-success" type="button" onClick={openIncomeModal}>
            Agregar ingreso
          </button>
          <button className="btn btn-warning" type="button" onClick={openVariableModal}>
            Agregar gasto variable
          </button>
        </div>
      </div>

      <FinanceSummaryCards summary={summary} />

      <div className="finance-grid">
        <FixedExpensesSection
          expenseProducts={expenseProducts}
          fixedExpenseMessage={fixedExpenseMessage}
          isFixedExpenseError={isFixedExpenseError}
          payingExpenseId={payingExpenseId}
          onOpenDetail={openFixedExpenseDetail}
          onEdit={handleEditFixedExpense}
          onPay={handlePayFixedExpense}
        />

        <IncomeSection incomes={incomes} onEdit={handleEditIncome} onDelete={handleDelete} />

        <VariableExpensesSection
          variableExpenses={variableExpenses}
          onEdit={handleEditVariableExpense}
          onDelete={handleDeleteVariableExpense}
        />
      </div>

      <FinancialTimelineSection
        summary={summary}
        events={financialEvents}
        monthlyCloses={monthlyCloses}
        closeNotes={closeNotes}
        onCloseNotesChange={handleCloseNotesChange}
        onCloseMonth={handleCloseMonth}
        isClosingMonth={isClosingMonth}
        closeMessage={closeMessage}
        isCloseError={isCloseError}
      />

      {isExpenseModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Agregar gasto fijo"
          onClick={() => setIsExpenseModalOpen(false)}
        >
          <div className="modal-content compact" onClick={(event) => event.stopPropagation()}>
            <ExpenseProductForm
              compact
              onExpenseCreated={onDataChanged}
              onClose={() => setIsExpenseModalOpen(false)}
            />
          </div>
        </div>
      )}

      <FixedExpenseDetailModal
        expense={selectedFixedExpense}
        isOpen={Boolean(selectedFixedExpense)}
        onClose={closeFixedExpenseDetail}
      />

      <IncomeModal
        isOpen={isIncomeModalOpen}
        title="Registrar ingreso"
        ariaLabel="Agregar ingreso"
        formData={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onClose={closeIncomeModal}
        message={message}
        isError={isError}
        submitLabel="Guardar ingreso"
        requireChangeReason={false}
      />

      <VariableExpenseModal
        isOpen={isVariableModalOpen}
        title="Registrar gasto variable"
        ariaLabel="Agregar gasto variable"
        formData={variableForm}
        onChange={handleVariableChange}
        onSubmit={handleVariableSubmit}
        onClose={closeVariableModal}
        message={variableMessage}
        isError={isVariableError}
        submitLabel="Guardar gasto"
        requireChangeReason={false}
      />

      <IncomeModal
        isOpen={isEditIncomeModalOpen}
        title="Editar ingreso"
        ariaLabel="Editar ingreso"
        formData={editIncomeForm}
        onChange={handleEditIncomeChange}
        onSubmit={handleEditIncomeSubmit}
        onClose={closeEditIncomeModal}
        message={editIncomeMessage}
        isError={isEditIncomeError}
        submitLabel="Guardar cambios"
        requireChangeReason
      />

      <VariableExpenseModal
        isOpen={isEditVariableModalOpen}
        title="Editar gasto variable"
        ariaLabel="Editar gasto variable"
        formData={editVariableForm}
        onChange={handleEditVariableChange}
        onSubmit={handleEditVariableSubmit}
        onClose={closeEditVariableModal}
        message={editVariableMessage}
        isError={isEditVariableError}
        submitLabel="Guardar cambios"
        requireChangeReason
      />

      {isEditFixedExpenseModalOpen && editFixedExpenseForm && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Editar gasto fijo"
          onClick={closeEditFixedExpenseModal}
        >
          <div className="modal-content compact" onClick={(event) => event.stopPropagation()}>
            <ExpenseProductForm
              compact
              expenseProductId={editingFixedExpenseId}
              initialData={editFixedExpenseForm}
              title="Editar gasto fijo"
              submitLabel="Guardar cambios"
              onExpenseCreated={async () => {
                await onDataChanged();
                closeEditFixedExpenseModal();
              }}
              onClose={closeEditFixedExpenseModal}
            />
          </div>
        </div>
      )}
    </section>
  );
}
