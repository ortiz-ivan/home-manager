import { getBudgetBucketLabels, getCategoryLabel } from "../../constants/inventory.js";
import { formatGuarani } from "./utils.js";

function formatDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function FixedExpenseDetailModal({ expense, isOpen, onClose }) {
  if (!isOpen || !expense) {
    return null;
  }

  const paymentHistory = expense.payment_history || [];
  const budgetBucketLabels = getBudgetBucketLabels();

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Historial de pagos de ${expense.name}`}
      onClick={onClose}
    >
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <section className="panel fixed-expense-detail-panel">
          <div className="modal-form-header fixed-expense-detail-header">
            <div>
              <h2>{expense.name}</h2>
              <p>{getCategoryLabel(expense.category)}</p>
            </div>
            <button className="btn btn-outline" type="button" onClick={onClose}>
              Cerrar
            </button>
          </div>

          <div className="fixed-expense-detail-grid">
            <article className="fixed-expense-detail-card">
              <span>Monto mensual</span>
              <strong>{formatGuarani(expense.monthly_amount)}</strong>
            </article>
            <article className="fixed-expense-detail-card">
              <span>Bolsa 50-30-20</span>
              <strong>{budgetBucketLabels[expense.budget_bucket] || expense.budget_bucket}</strong>
            </article>
            <article className="fixed-expense-detail-card">
              <span>Pagos registrados</span>
              <strong>{expense.payment_count || 0}</strong>
            </article>
            <article className="fixed-expense-detail-card">
              <span>Total pagado</span>
              <strong>{formatGuarani(expense.total_paid_amount)}</strong>
            </article>
          </div>

          <div className="fixed-expense-detail-meta">
            <small>Proximo vencimiento: {expense.next_due_date ? formatDate(expense.next_due_date) : "Sin fecha"}</small>
            <small>Estado del mes: {expense.monthly_payment_status === "paid" ? "Pagado" : "Por pagar"}</small>
            <small>Ultimo pago del mes: {expense.monthly_payment_date ? formatDate(expense.monthly_payment_date) : "Aun no registrado"}</small>
          </div>

          <div className="fixed-expense-history-block">
            <div className="panel-title">
              <h3>Historial de pagos</h3>
            </div>

            {paymentHistory.length === 0 ? (
              <p className="empty-history">Todavia no hay pagos registrados para este gasto fijo.</p>
            ) : (
              <div className="fixed-expense-history-list">
                {paymentHistory.map((payment) => (
                  <div key={payment.id} className="fixed-expense-history-row">
                    <div>
                      <strong>{formatDate(payment.date)}</strong>
                      <small>Pago mensual registrado</small>
                    </div>
                    <strong>{formatGuarani(payment.amount)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}