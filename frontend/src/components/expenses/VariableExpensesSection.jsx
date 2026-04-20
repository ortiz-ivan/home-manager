import { CATEGORY_LABELS } from "../../constants/inventory.js";
import { formatGuarani } from "./utils.js";

export function VariableExpensesSection({ variableExpenses, onEdit, onDelete }) {
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
                <p>{CATEGORY_LABELS[expense.category] || expense.category}</p>
                <small>{expense.date} {expense.description ? `| ${expense.description}` : ""}</small>
              </div>
              <div className="row-actions">
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