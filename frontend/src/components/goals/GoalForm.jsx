import { MoneyInput } from "../MoneyInput.jsx";

const GOAL_TYPE_OPTIONS = [
  { value: "savings", label: "Ahorro" },
  { value: "debt", label: "Deuda" },
  { value: "big_purchase", label: "Compra grande" },
];

export function GoalForm({ formData, editingGoal, message, isError, isActing, onChange, onSubmit, onCancel, onClose }) {
  return (
    <section className="panel modal-form-panel compact">
      <div className="modal-form-header">
        <h2>{editingGoal ? "Editar meta" : "Nueva meta"}</h2>
        <button className="btn btn-outline" type="button" onClick={onClose}>
          Cerrar
        </button>
      </div>

      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          Nombre
          <input
            name="name"
            type="text"
            required
            maxLength="120"
            value={formData.name}
            onChange={onChange}
          />
        </label>

        <label>
          Tipo
          <select name="goal_type" value={formData.goal_type} onChange={onChange}>
            {GOAL_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Monto objetivo
          <MoneyInput
            name="target_amount"
            required
            value={formData.target_amount}
            onChange={onChange}
          />
        </label>

        <label>
          Monto actual (saldo inicial)
          <MoneyInput
            name="current_amount"
            value={formData.current_amount}
            onChange={onChange}
          />
        </label>

        <label>
          Fecha objetivo
          <input
            name="target_date"
            type="date"
            value={formData.target_date}
            onChange={onChange}
          />
        </label>

        <label>
          Notas
          <input
            name="notes"
            type="text"
            maxLength="255"
            value={formData.notes}
            onChange={onChange}
            placeholder="Descripcion o contexto opcional"
          />
        </label>

        <label style={{ flexDirection: "row", alignItems: "center", gap: "8px" }}>
          <input
            name="is_active"
            type="checkbox"
            checked={formData.is_active}
            onChange={onChange}
          />
          Meta activa
        </label>

        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn btn-primary" type="submit" disabled={isActing}>
            {editingGoal ? "Guardar cambios" : "Crear meta"}
          </button>
          {editingGoal && (
            <button className="btn btn-outline" type="button" onClick={onCancel} disabled={isActing}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {message && <p className={`message ${isError ? "error" : ""}`}>{message}</p>}
    </section>
  );
}
