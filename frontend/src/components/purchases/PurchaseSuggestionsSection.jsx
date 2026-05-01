import {
  FREQUENCY_LABELS,
  formatCurrency,
  getCategoryLabel,
} from "../../constants/inventory.js";
import { formatPurchaseDate } from "./usePurchasesViewController.js";

export function PurchaseSuggestionsSection({
  categories,
  categoryFilter,
  onCategoryFilterChange,
  filteredItems,
  groupedItems,
  processingIds,
  onBuy,
  message,
  isError,
}) {
  return (
    <section className="panel purchases-filter-panel">
      <div className="panel-title">
        <h3>Lista de reposicion</h3>
      </div>
      <div className="inventory-controls purchases-controls">
        <button
          type="button"
          className={`btn btn-filter ${categoryFilter === "all" ? "active" : ""}`}
          onClick={() => onCategoryFilterChange("all")}
        >
          Todas
        </button>
        {categories.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`btn btn-filter ${categoryFilter === option.value ? "active" : ""}`}
            onClick={() => onCategoryFilterChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <p className="empty-history">No hay productos que requieran reposicion con los criterios actuales.</p>
      ) : (
        <div className="purchase-groups">
          {Object.entries(groupedItems).map(([category, items]) => (
            <article key={category} className="purchase-group-card">
              <div className="panel-title purchase-group-title">
                <div>
                  <h3>{getCategoryLabel(category)}</h3>
                  <p>{items.length} items sugeridos</p>
                </div>
                <strong>{formatCurrency(items.reduce((sum, item) => sum + item.estimatedCost, 0))}</strong>
              </div>

              <div className="purchase-list">
                {items.map((item) => {
                  const isProcessing = processingIds.includes(item.id);

                  return (
                    <div key={item.id} className="purchase-row">
                      <div className="purchase-row-main">
                        <div className="purchase-row-head">
                          <strong>{item.name}</strong>
                          <span className={`status-chip purchase-priority ${item.priority.tone}`}>
                            {item.priority.label}
                          </span>
                        </div>
                        <p>
                          Stock actual: {item.stock} {item.unit} | Minimo: {item.stock_min} {item.unit}
                        </p>
                        <small>
                          Frecuencia: {FREQUENCY_LABELS[item.usage_frequency] || item.usage_frequency} | Ultima compra: {formatPurchaseDate(item.last_purchase)}
                        </small>
                      </div>

                      <div className="purchase-row-side">
                        <strong>{item.suggestedQuantity} {item.unit}</strong>
                        <small>Sugerido</small>
                        <span>{formatCurrency(item.estimatedCost)}</span>
                        <button
                          className="btn btn-success"
                          type="button"
                          disabled={isProcessing}
                          onClick={() => onBuy(item)}
                        >
                          {isProcessing ? "Registrando..." : "Registrar compra"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}

      {message && <p className={`message ${isError ? "error" : ""}`}>{message}</p>}
    </section>
  );
}