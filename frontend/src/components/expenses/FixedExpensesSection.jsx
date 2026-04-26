import { getBudgetBucketLabels, getCategoryLabel } from "../../constants/inventory.js";
import { formatGuarani } from "./utils.js";

export function FixedExpensesSection({
  expenseProducts,
  fixedExpenseMessage,
  isFixedExpenseError,
  payingExpenseId,
  onOpenDetail,
  onEdit,
  onPay,
}) {
  const budgetBucketLabels = getBudgetBucketLabels();

  return (
    <article className="panel">
      <div className="panel-title">
        <h3>Servicios y pagos fijos</h3>
      </div>

      {expenseProducts.length === 0 ? (
        <p>No hay servicios ni pagos registrados.</p>
      ) : (
        <div className="income-list">
          {expenseProducts.map((item) => (
            <div className="income-row fixed-expense-row" key={item.id}>
              <div className="fixed-expense-details">
                <strong>{item.name}</strong>
                <p>
                  {getCategoryLabel(item.category)}
                </p>
                <small>{budgetBucketLabels[item.budget_bucket] || item.budget_bucket}</small>
                <small>Proximo vencimiento: {item.next_due_date || "sin fecha"}</small>
                <div className="fixed-expense-status">
                  <span className={`status-chip ${item.monthly_payment_status === "paid" ? "paid" : "pending"}`}>
                    {item.monthly_payment_status === "paid" ? "Pagado" : "Por pagar"}
                  </span>
                  {item.monthly_payment_date && <small>Pago del mes: {item.monthly_payment_date}</small>}
                </div>
              </div>
              <div className="fixed-expense-side">
                <strong>{formatGuarani(item.monthly_amount)}</strong>
                <button className="btn btn-outline" type="button" onClick={() => onOpenDetail(item)}>
                  Ver historial
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => onEdit(item)}>
                  Editar
                </button>
                <button
                  className={item.monthly_payment_status === "paid" ? "btn btn-outline" : "btn btn-success"}
                  type="button"
                  disabled={item.monthly_payment_status === "paid" || payingExpenseId === item.id}
                  onClick={() => onPay(item)}
                >
                  {payingExpenseId === item.id
                    ? "Guardando..."
                    : item.monthly_payment_status === "paid"
                      ? "Pagado"
                      : "Marcar pagado"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {fixedExpenseMessage && (
        <p className={`message ${isFixedExpenseError ? "error" : ""}`}>{fixedExpenseMessage}</p>
      )}
    </article>
  );
}