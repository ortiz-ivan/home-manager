function IncomeFormFields({ formData, onChange, submitLabel }) {
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
            <IncomeFormFields formData={formData} onChange={onChange} submitLabel={submitLabel} />
          </form>

          {message && <p className={`message ${isError ? "error" : ""}`}>{message}</p>}
        </section>
      </div>
    </div>
  );
}