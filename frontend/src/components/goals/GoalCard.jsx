import { formatCurrency } from "../../constants/inventory.js";

const TYPE_LABELS = {
  savings: "Ahorro",
  debt: "Deuda",
  big_purchase: "Compra grande",
};

const TYPE_CHIP_CLASS = {
  savings: "alto",
  debt: "bajo",
  big_purchase: "medio",
};

function progressFillClass(pct) {
  if (pct >= 100) return "success";
  if (pct >= 60) return "neutral";
  if (pct >= 30) return "warning";
  return "danger";
}

export function GoalCard({ goal, onContribute, onEdit, onDelete, isActing }) {
  const chipClass = TYPE_CHIP_CLASS[goal.goal_type] || "medio";
  const fillClass = progressFillClass(goal.progress_pct);

  return (
    <article className="panel">
      <div className="panel-title" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>{goal.name}</h3>
          <span className={`stock-chip ${chipClass}`}>{TYPE_LABELS[goal.goal_type] || goal.goal_type}</span>
          {goal.is_completed && <span className="stock-chip alto">Completada</span>}
          {!goal.is_active && <span className="stock-chip bajo">Inactiva</span>}
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button className="btn btn-outline" type="button" onClick={() => onEdit(goal)} disabled={isActing}>
            Editar
          </button>
          <button className="btn btn-outline" type="button" onClick={() => onDelete(goal.id)} disabled={isActing}>
            Eliminar
          </button>
        </div>
      </div>

      <div className="budget-rule-track" style={{ marginBottom: "8px" }}>
        <div
          className={`budget-rule-fill ${fillClass}`}
          style={{ width: `${Math.min(goal.progress_pct, 100)}%` }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "8px" }}>
        <span>
          <strong>{formatCurrency(goal.current_amount)}</strong> ahorrado
        </span>
        <span>
          Meta: <strong>{formatCurrency(goal.target_amount)}</strong>
        </span>
      </div>

      {Number(goal.remaining) > 0 && (
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 8px" }}>
          Faltan {formatCurrency(goal.remaining)} — {goal.progress_pct}% completado
        </p>
      )}

      {goal.target_date && (
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 4px" }}>
          Fecha objetivo: {goal.target_date}
          {goal.days_left !== null && (
            <span> ({goal.days_left >= 0 ? `${goal.days_left} dias restantes` : `vencida hace ${Math.abs(goal.days_left)} dias`})</span>
          )}
        </p>
      )}

      {goal.daily_required != null && (
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 8px" }}>
          Para llegar a tiempo: <strong>{formatCurrency(goal.daily_required)}/día</strong>{" "}
          o <strong>{formatCurrency(goal.monthly_required)}/mes</strong>
        </p>
      )}

      {goal.notes && (
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 12px" }}>{goal.notes}</p>
      )}

      {!goal.is_completed && goal.is_active && (
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => onContribute(goal.id)}
          disabled={isActing}
          style={{ marginTop: "4px" }}
        >
          Registrar aporte
        </button>
      )}
    </article>
  );
}
