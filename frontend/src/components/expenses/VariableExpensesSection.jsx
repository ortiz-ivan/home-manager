import { getBudgetBucketLabels, getCategoryLabel } from "../../constants/inventory.js";
import { formatGuarani } from "./utils.js";

const STATUS_LABELS = {
  paid: "Pagado",
  committed: "Comprometido",
};

export function VariableExpensesSection({ variableExpenses, onEdit, onDelete }) {
  const budgetBucketLabels = getBudgetBucketLabels();

  return (
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
                <p>{getCategoryLabel(expense.category)}</p>
                <small>{budgetBucketLabels[expense.budget_bucket] || expense.budget_bucket}</small>
                <small>{expense.date} {expense.description ? `| ${expense.description}` : ""}</small>
              </div>
              <div className="row-actions">
                <span className={`status-chip ${expense.status === "committed" ? "committed" : "paid"}`}>
                  {STATUS_LABELS[expense.status] || expense.status}
                </span>
                <button className="btn btn-secondary" type="button" onClick={() => onEdit(expense)}>
                  Editar
                </button>
                <button className="btn btn-outline" type="button" onClick={() => onDelete(expense)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}