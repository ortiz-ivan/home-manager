import { useMemo, useState } from "react";
import { createIncome, deleteIncome } from "../api.js";

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

export function ExpensesPanel({ incomes, summary, onDataChanged }) {
  const today = useMemo(() => new Date(), []);
  const [formData, setFormData] = useState({
    amount: "",
    source: "",
    notes: "",
    date: toInputDate(today),
  });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  return (
    <section className="module-content fade-in">
      <div className="section-header">
        <h2>Gastos vs ingresos</h2>
        <p>Registra tus ingresos y revisa que porcentaje de tus gastos mensuales ocupan.</p>
      </div>

      <div className="kpi-grid finance-kpi-grid">
        <article className="kpi-card">
          <p>Ingresos del mes</p>
          <h3>{formatGuarani(summary.total_income)}</h3>
          <small>{formatMonthYear(summary.month, summary.year)}</small>
        </article>

        <article className="kpi-card">
          <p>Gasto mensual estimado</p>
          <h3>{formatGuarani(summary.estimated_expenses)}</h3>
          <small>Calculado desde precios y frecuencia de inventario.</small>
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
      </div>
    </section>
  );
}
