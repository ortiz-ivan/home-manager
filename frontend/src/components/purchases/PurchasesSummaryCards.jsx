import { formatCurrency } from "../../constants/inventory.js";

export function PurchasesSummaryCards({ itemCount, urgentCount, totalEstimated, activeCategoryCount }) {
  return (
    <div className="kpi-grid purchases-kpi-grid">
      <article className="kpi-card">
        <p>Items para reponer</p>
        <h3>{itemCount}</h3>
        <small>{urgentCount} con prioridad urgente.</small>
      </article>
      <article className="kpi-card">
        <p>Costo estimado</p>
        <h3>{formatCurrency(totalEstimated)}</h3>
        <small>Basado en precio unitario y cantidad sugerida.</small>
      </article>
      <article className="kpi-card">
        <p>Categorias activas</p>
        <h3>{activeCategoryCount}</h3>
        <small>Compra organizada por frente operativo.</small>
      </article>
    </div>
  );
}