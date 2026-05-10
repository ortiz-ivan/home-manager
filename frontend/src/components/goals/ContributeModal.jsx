import { MoneyInput } from "../MoneyInput.jsx";

export function ContributeModal({ goals, targetId, amount, message, isError, isActing, onChange, onSubmit, onClose }) {
  if (!targetId) {
    return null;
  }

  const goal = goals.find((g) => g.id === targetId);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Registrar aporte"
      onClick={onClose}
    >
      <div className="modal-content compact" onClick={(event) => event.stopPropagation()}>
        <section className="panel modal-form-panel compact">
          <div className="modal-form-header">
            <h2>Registrar aporte{goal ? `: ${goal.name}` : ""}</h2>
            <button className="btn btn-outline" type="button" onClick={onClose}>
              Cerrar
            </button>
          </div>

          <form onSubmit={onSubmit} className="form-grid">
            <label>
              Monto del aporte
              <MoneyInput
                required
                value={amount}
                onChange={(e) => onChange(e.target.value)}
                autoFocus
              />
            </label>

            <button className="btn btn-primary" type="submit" disabled={isActing}>
              Confirmar aporte
            </button>
          </form>

          {message && <p className={`message ${isError ? "error" : ""}`}>{message}</p>}
        </section>
      </div>
    </div>
  );
}
