import { MoneyInput } from "../MoneyInput.jsx";

function IncomeFormFields({ formData, onChange, submitLabel, requireChangeReason = false }) {
  return (
    <>
      <label>
        Monto
        <MoneyInput
          name="amount"
          required
          value={formData.amount}
          onChange={onChange}
        />
      </label>

      <label>
        Fuente
        <input
          name="source"
          type="text"
          maxLength="120"
          value={formData.source}
          onChange={onChange}
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
          placeholder={requireChangeReason ? "Explica por que editas este ingreso" : "Alta inicial, ajuste, correccion..."}
        />
      </label>

      <button className="btn btn-primary" type="submit">
        {submitLabel}
      </button>
    </>
  );
}

export function IncomeModal({
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
            <IncomeFormFields
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