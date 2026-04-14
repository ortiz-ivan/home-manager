import { useMemo, useState } from "react";
import {
  createIncome,
  createVariableExpense,
  deleteIncome,
  deleteVariableExpense,
} from "../api.js";
import {
  CATEGORY_LABELS,
  TYPE_LABELS,
  VARIABLE_EXPENSE_CATEGORY_OPTIONS,
} from "../constants/inventory.js";
import { ExpenseProductForm } from "./ExpenseProductForm.jsx";

function formatGuarani(value) {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatMonthYear(month, year) {
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("es-PY", { month: "long", year: "numeric" }).format(date);
}

function toInputDate(date) {
  return date.toISOString().slice(0, 10);
}

export function ExpensesPanel({ incomes, summary, expenseProducts, variableExpenses, onDataChanged }) {
  const today = useMemo(() => new Date(), []);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    source: "",
    notes: "",
    date: toInputDate(today),
  });
  const [variableForm, setVariableForm] = useState({
    amount: "",
    category: "mobility",
    description: "",
    notes: "",
    date: toInputDate(today),
  });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [variableMessage, setVariableMessage] = useState("");
  const [isVariableError, setIsVariableError] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVariableChange = (event) => {
    const { name, value } = event.target;
    setVariableForm((prev) => ({ ...prev, [name]: value }));
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

      setFormData((prev) => ({
        ...prev,
        amount: "",
        notes: "",
      }));
      setMessage("Ingreso registrado");
      await onDataChanged();
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
      setVariableForm((prev) => ({
        ...prev,
        amount: "",
        description: "",
        notes: "",
      }));
      setVariableMessage("Gasto variable registrado");
      await onDataChanged();
    } catch (error) {
      setVariableMessage(error.message);
      setIsVariableError(true);
    }
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

  return (
    <section className="module-content fade-in">
      <div className="section-header">
        <h2>Gastos vs ingresos</h2>
        <p>Registra tus ingresos y revisa que porcentaje de tus gastos mensuales ocupan.</p>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => setIsExpenseModalOpen(true)}
        >
          Agregar gasto fijo
        </button>
      </div>

      <div className="kpi-grid finance-kpi-grid">
        <article className="kpi-card">
          <p>Ingresos del mes</p>
          <h3>{formatGuarani(summary.total_income)}</h3>
          <small>{formatMonthYear(summary.month, summary.year)}</small>
        </article>

        <article className="kpi-card">
          <p>Gasto mensual total</p>
          <h3>{formatGuarani(summary.estimated_expenses)}</h3>
          <small>
            Hogar: {formatGuarani(summary.home_estimated_expenses || 0)} | Fijos: {formatGuarani(summary.fixed_estimated_expenses || 0)} | Variables del mes: {formatGuarani(summary.variable_expenses || 0)}
          </small>
        </article>

        <article className="kpi-card">
          <p>Porcentaje de gasto sobre ingreso</p>
          <h3>{summary.expense_percentage === null ? "Sin ingresos" : `${summary.expense_percentage}%`}</h3>
          <small>Saldo restante: {formatGuarani(summary.remaining_balance)}</small>
        </article>
      </div>

      <div className="finance-grid">
        <article className="panel">
          <div className="panel-title">
            <h3>Servicios y pagos fijos</h3>
          </div>

          {expenseProducts.length === 0 ? (
            <p>No hay servicios ni pagos registrados.</p>
          ) : (
            <div className="income-list">
              {expenseProducts.map((item) => (
                <div className="income-row" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <p>
                      {CATEGORY_LABELS[item.category] || item.category} | {TYPE_LABELS[item.type] || item.type}
                    </p>
                    <small>Proximo vencimiento: {item.next_due_date || "sin fecha"}</small>
                  </div>
                  <strong>{formatGuarani(item.price)}</strong>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-title">
            <h3>Registrar ingreso</h3>
          </div>

          <form onSubmit={handleSubmit} className="form-grid">
            <label>
              Monto
              <input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.amount}
                onChange={handleChange}
              />
            </label>

            <label>
              Fuente
              <input
                name="source"
                type="text"
                maxLength="120"
                value={formData.source}
                onChange={handleChange}
                placeholder="Salario, freelance, etc."
              />
            </label>

            <label>
              Fecha
              <input
                name="date"
                type="date"
                required
                value={formData.date}
                onChange={handleChange}
              />
            </label>

            <label>
              Nota
              <input
                name="notes"
                type="text"
                maxLength="255"
                value={formData.notes}
                onChange={handleChange}
              />
            </label>

            <button className="btn btn-primary" type="submit">
              Guardar ingreso
            </button>
          </form>

          {message && <p className={`message ${isError ? "error" : ""}`}>{message}</p>}
        </article>

        <article className="panel">
          <div className="panel-title">
            <h3>Registrar gasto variable</h3>
          </div>

          <form onSubmit={handleVariableSubmit} className="form-grid">
            <label>
              Monto
              <input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
                value={variableForm.amount}
                onChange={handleVariableChange}
              />
            </label>

            <label>
              Categoria
              <select
                name="category"
                required
                value={variableForm.category}
                onChange={handleVariableChange}
              >
                {VARIABLE_EXPENSE_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Descripcion
              <input
                name="description"
                type="text"
                maxLength="120"
                value={variableForm.description}
                onChange={handleVariableChange}
                placeholder="Combustible, taller, etc."
              />
            </label>

            <label>
              Fecha
              <input
                name="date"
                type="date"
                required
                value={variableForm.date}
                onChange={handleVariableChange}
              />
            </label>

            <label>
              Nota
              <input
                name="notes"
                type="text"
                maxLength="255"
                value={variableForm.notes}
                onChange={handleVariableChange}
              />
            </label>

            <button className="btn btn-primary" type="submit">
              Guardar gasto
            </button>
          </form>

          {variableMessage && <p className={`message ${isVariableError ? "error" : ""}`}>{variableMessage}</p>}
        </article>

        <article className="panel">
          <div className="panel-title">
            <h3>Ingresos registrados</h3>
          </div>

          {incomes.length === 0 ? (
            <p>No hay ingresos cargados en este momento.</p>
          ) : (
            <div className="income-list">
              {incomes.map((income) => (
                <div className="income-row" key={income.id}>
                  <div>
                    <strong>{formatGuarani(income.amount)}</strong>
                    <p>{income.source || "Sin fuente"}</p>
                    <small>{income.date}</small>
                  </div>
                  <button className="btn btn-outline" type="button" onClick={() => handleDelete(income)}>
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-title">
            <h3>Gastos variables del mes</h3>
          </div>

          {variableExpenses.length === 0 ? (
            <p>No hay gastos variables cargados.</p>
          ) : (
            <div className="income-list">
              {variableExpenses.map((expense) => (
                <div className="income-row" key={expense.id}>
                  <div>
                    <strong>{formatGuarani(expense.amount)}</strong>
                    <p>{CATEGORY_LABELS[expense.category] || expense.category}</p>
                    <small>{expense.date} {expense.description ? `| ${expense.description}` : ""}</small>
                  </div>
                  <button
                    className="btn btn-outline"
                    type="button"
                    onClick={() => handleDeleteVariableExpense(expense)}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>
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
    </section>
  );
}
