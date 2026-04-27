import {
  getBudgetBucketOptions,
  getCategoryOptions,
} from "../../constants/inventory.js";

function VariableExpenseFormFields({ formData, onChange, submitLabel, requireChangeReason = false }) {
  const variableExpenseCategories = getCategoryOptions("variable_expense");
  const budgetBucketOptions = getBudgetBucketOptions();

  return (
    <>
      <label>
        Monto
        <input
          name="amount"
          type="number"
          min="0"
          step="0.01"
          required
          value={formData.amount}
          onChange={onChange}
        />
      </label>

      <label>
        Categoria
        <select
          name="category"
          required
          value={formData.category}
          onChange={onChange}
        >
          {variableExpenseCategories.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Bolsa 50-30-20
        <select
          name="budget_bucket"
          required
          value={formData.budget_bucket}
          onChange={onChange}
        >
          {budgetBucketOptions.map((option) => (
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
          value={formData.description}
          onChange={onChange}
          placeholder="Combustible, taller, etc."
        />
      </label>

      <label>
        Fecha
        <input
          name="date"
          type="date"
          required
          value={formData.date}
          onChange={onChange}
        />
      </label>

      <label>
        Nota
        <input
          name="notes"
          type="text"
          maxLength="255"
          value={formData.notes}
          onChange={onChange}
        />
      </label>

      <label>
        Motivo del cambio
        <input
          name="change_reason"
          type="text"
          maxLength="255"
          required={requireChangeReason}
          value={formData.change_reason}
          onChange={onChange}
          placeholder={requireChangeReason ? "Explica por que editas este gasto" : "Alta inicial, ajuste, correccion..."}
        />
      </label>

      <button className="btn btn-primary" type="submit">
        {submitLabel}
      </button>
    </>
  );
}

export function VariableExpenseModal({
  isOpen,
  title,
  ariaLabel,
  formData,
  onChange,
  onSubmit,
  onClose,
  message,
  isError,
  submitLabel,
  requireChangeReason,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={onClose}
    >
      <div className="modal-content compact" onClick={(event) => event.stopPropagation()}>
        <section className="panel modal-form-panel compact">
          <div className="modal-form-header">
            <h2>{title}</h2>
            <button className="btn btn-outline" type="button" onClick={onClose}>
              Cerrar
            </button>
          </div>

          <form onSubmit={onSubmit} className="form-grid">
            <VariableExpenseFormFields
              formData={formData}
              onChange={onChange}
              submitLabel={submitLabel}
              requireChangeReason={requireChangeReason}
            />
          </form>

          {message && <p className={`message ${isError ? "error" : ""}`}>{message}</p>}
        </section>
      </div>
    </div>
  );
}