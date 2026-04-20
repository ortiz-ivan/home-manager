import { useMemo, useState } from "react";
import {
  createIncome,
  createVariableExpense,
  deleteIncome,
  deleteVariableExpense,
  payProduct,
  updateIncome,
  updateVariableExpense,
} from "../api.js";
import { ExpenseProductForm } from "./ExpenseProductForm.jsx";
import { FinanceSummaryCards } from "./expenses/FinanceSummaryCards.jsx";
import { FixedExpensesSection } from "./expenses/FixedExpensesSection.jsx";
import { IncomeModal } from "./expenses/IncomeModal.jsx";
import { IncomeSection } from "./expenses/IncomeSection.jsx";
import { VariableExpenseModal } from "./expenses/VariableExpenseModal.jsx";
import { VariableExpensesSection } from "./expenses/VariableExpensesSection.jsx";
import {
  createIncomeFormState,
  createVariableExpenseFormState,
  formatGuarani,
  toInputDate,
} from "./expenses/utils.js";

export function ExpensesPanel({ incomes, summary, expenseProducts, variableExpenses, onDataChanged }) {
  const today = useMemo(() => new Date(), []);
  const todayInputDate = useMemo(() => toInputDate(today), [today]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isEditIncomeModalOpen, setIsEditIncomeModalOpen] = useState(false);
  const [isVariableModalOpen, setIsVariableModalOpen] = useState(false);
  const [isEditVariableModalOpen, setIsEditVariableModalOpen] = useState(false);
  const [formData, setFormData] = useState(() => createIncomeFormState(todayInputDate));
  const [variableForm, setVariableForm] = useState(() => createVariableExpenseFormState(todayInputDate));
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [variableMessage, setVariableMessage] = useState("");
  const [isVariableError, setIsVariableError] = useState(false);
  const [fixedExpenseMessage, setFixedExpenseMessage] = useState("");
  const [isFixedExpenseError, setIsFixedExpenseError] = useState(false);
  const [payingExpenseId, setPayingExpenseId] = useState(null);
  const [editingIncomeId, setEditingIncomeId] = useState(null);
  const [editIncomeForm, setEditIncomeForm] = useState(() => createIncomeFormState(todayInputDate));
  const [editIncomeMessage, setEditIncomeMessage] = useState("");
  const [isEditIncomeError, setIsEditIncomeError] = useState(false);
  const [editingVariableExpenseId, setEditingVariableExpenseId] = useState(null);
  const [editVariableForm, setEditVariableForm] = useState(() => createVariableExpenseFormState(todayInputDate));
  const [editVariableMessage, setEditVariableMessage] = useState("");
  const [isEditVariableError, setIsEditVariableError] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVariableChange = (event) => {
    const { name, value } = event.target;
    setVariableForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditIncomeChange = (event) => {
    const { name, value } = event.target;
    setEditIncomeForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditVariableChange = (event) => {
    const { name, value } = event.target;
    setEditVariableForm((prev) => ({ ...prev, [name]: value }));
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

      setFormData(createIncomeFormState(todayInputDate));
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

    setMessage("");
    setIsError(false);

    try {
      await deleteIncome(income.id);
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
      setVariableForm(createVariableExpenseFormState(todayInputDate));
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
      description: expense.description || "",
      notes: expense.notes || "",
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
    setFormData(createIncomeFormState(todayInputDate));
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
    setVariableForm(createVariableExpenseFormState(todayInputDate));
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

  const handleDeleteVariableExpense = async (expense) => {
    const ok = window.confirm(`Eliminar gasto de ${formatGuarani(expense.amount)}?`);
    if (!ok) {
      return;
    }

    setVariableMessage("");
    setIsVariableError(false);

    try {
      await deleteVariableExpense(expense.id);
      await onDataChanged();
    } catch (error) {
      setVariableMessage(error.message);
      setIsVariableError(true);
    }
  };

  const handlePayFixedExpense = async (expense) => {
    setFixedExpenseMessage("");
    setIsFixedExpenseError(false);
    setPayingExpenseId(expense.id);

    try {
      await payProduct(expense.id);
      setFixedExpenseMessage(`Pago registrado para ${expense.name}`);
      await onDataChanged();
    } catch (error) {
      setFixedExpenseMessage(error.message);
      setIsFixedExpenseError(true);
    } finally {
      setPayingExpenseId(null);
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
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => setIsExpenseModalOpen(true)}
          >
            Agregar gasto fijo
          </button>
          <button
            className="btn btn-success"
            type="button"
            onClick={openIncomeModal}
          >
            Agregar ingreso
          </button>
          <button
            className="btn btn-warning"
            type="button"
            onClick={openVariableModal}
          >
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
          onPay={handlePayFixedExpense}
        />

        <IncomeSection incomes={incomes} onEdit={handleEditIncome} onDelete={handleDelete} />

        <VariableExpensesSection
          variableExpenses={variableExpenses}
          onEdit={handleEditVariableExpense}
          onDelete={handleDeleteVariableExpense}
        />
      </div>

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

      <IncomeModal
        isOpen={isIncomeModalOpen}
        title="Nuevo ingreso"
        ariaLabel="Agregar ingreso"
        formData={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onClose={closeIncomeModal}
        message={message}
        isError={isError}
        submitLabel="Guardar ingreso"
      />

      <VariableExpenseModal
        isOpen={isVariableModalOpen}
        title="Nuevo gasto variable"
        ariaLabel="Agregar gasto variable"
        formData={variableForm}
        onChange={handleVariableChange}
        onSubmit={handleVariableSubmit}
        onClose={closeVariableModal}
        message={variableMessage}
        isError={isVariableError}
        submitLabel="Guardar gasto"
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
      />
    </section>
  );
}
