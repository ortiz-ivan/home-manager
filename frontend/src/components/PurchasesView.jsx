import { useMemo, useState } from "react";
import { buyProduct } from "../api.js";
import {
  FREQUENCY_LABELS,
  formatCurrency,
  getCategoryLabel,
  getCategoryOptions,
  getCurrentInventorySettings,
} from "../constants/inventory.js";

function formatDate(value) {
  if (!value) {
    return "Sin registro";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function daysSince(dateString) {
  if (!dateString) {
    return 999;
  }

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return 999;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today.getTime() - date.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function getPriorityMeta(product) {
  const settings = getCurrentInventorySettings();
  const deficit = Math.max((product.stock_min || 0) - (product.stock || 0), 0);
  const lastPurchaseAge = daysSince(product.last_purchase);

  let score = deficit * 5;

  if ((product.stock || 0) === 0) {
    score += 10;
  }

  if (product.usage_frequency === "high") {
    score += 8;
  } else if (product.usage_frequency === "medium") {
    score += 4;
  }

  if (lastPurchaseAge >= Math.max(Number(settings.alerts.purchase_stale_days || 21), 30)) {
    score += 4;
  }

  if ((product.stock || 0) <= (product.stock_min || 0)) {
    return {
      score,
      label: score >= 18 ? "Urgente" : "Alta",
      tone: score >= 18 ? "critical" : "high",
    };
  }

  if ((product.stock || 0) <= (product.stock_min || 0) * 1.5 || lastPurchaseAge >= 21) {
    return {
      score,
      label: "Media",
      tone: "medium",
    };
  }

  return {
    score,
    label: "Baja",
    tone: "low",
  };
}

function buildSuggestedQuantity(product) {
  const minimum = Number(product.stock_min || 0);
  const currentStock = Number(product.stock || 0);
  const deficit = Math.max(minimum - currentStock, 0);

  if (product.usage_frequency === "high") {
    return Math.max(deficit, minimum || 1, 1);
  }

  if (product.usage_frequency === "medium") {
    return Math.max(deficit, 1);
  }

  return Math.max(deficit || 1, 1);
}

function toPurchaseItem(product) {
  const priority = getPriorityMeta(product);
  const suggestedQuantity = buildSuggestedQuantity(product);
  const estimatedCost = Number(product.price || 0) * suggestedQuantity;

  return {
    ...product,
    priority,
    suggestedQuantity,
    estimatedCost,
    stockGap: Math.max((product.stock_min || 0) - (product.stock || 0), 0),
    lastPurchaseAge: daysSince(product.last_purchase),
  };
}

function isCandidate(product) {
  const settings = getCurrentInventorySettings();
  const belowThreshold = Number(product.stock || 0) <= Number(product.stock_min || 0) * Number(settings.thresholds.purchase_suggestion_stock_ratio || 1);
  const agingPurchase = daysSince(product.last_purchase) >= Number(settings.alerts.purchase_stale_days || 21);
  return belowThreshold || agingPurchase;
}

export function PurchasesView({ products, onDataChanged }) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [processingIds, setProcessingIds] = useState([]);

  const purchaseItems = useMemo(() => {
    return products
      .filter(isCandidate)
      .map(toPurchaseItem)
      .sort((left, right) => right.priority.score - left.priority.score || left.name.localeCompare(right.name));
  }, [products]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === "all") {
      return purchaseItems;
    }
    return purchaseItems.filter((item) => item.category === categoryFilter);
  }, [categoryFilter, purchaseItems]);

  const groupedItems = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [filteredItems]);

  const totalEstimated = filteredItems.reduce((sum, item) => sum + item.estimatedCost, 0);
  const urgentCount = filteredItems.filter((item) => item.priority.tone === "critical").length;
  const categories = getCategoryOptions("inventory");

  const handleBuy = async (item) => {
    setMessage("");
    setIsError(false);
    setProcessingIds((current) => [...current, item.id]);

    try {
      await buyProduct(item.id, item.suggestedQuantity);
      setMessage(`Compra registrada para ${item.name} por ${item.suggestedQuantity} ${item.unit}.`);
      await onDataChanged();
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    } finally {
      setProcessingIds((current) => current.filter((id) => id !== item.id));
    }
  };

  const handleBuyAll = async () => {
    const readyItems = filteredItems.filter((item) => !processingIds.includes(item.id));

    if (readyItems.length === 0) {
      return;
    }

    setMessage("");
    setIsError(false);
    setProcessingIds(readyItems.map((item) => item.id));

    try {
      for (const item of readyItems) {
        await buyProduct(item.id, item.suggestedQuantity);
      }
      setMessage(`Se registraron ${readyItems.length} compras sugeridas.`);
      await onDataChanged();
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    } finally {
      setProcessingIds([]);
    }
  };

  return (
    <section className="module-content fade-in purchases-view">
      <div className="section-header purchases-header">
        <div>
          <h2>Centro de compras</h2>
          <p>Prioriza reposiciones, agrupa la compra por categoria y registra la entrada al stock con un clic.</p>
        </div>
        <div className="purchases-header-actions">
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleBuyAll}
            disabled={filteredItems.length === 0 || processingIds.length > 0}
          >
            Registrar lista sugerida
          </button>
        </div>
      </div>

      <div className="kpi-grid purchases-kpi-grid">
        <article className="kpi-card">
          <p>Items para reponer</p>
          <h3>{filteredItems.length}</h3>
          <small>{urgentCount} con prioridad urgente.</small>
        </article>
        <article className="kpi-card">
          <p>Costo estimado</p>
          <h3>{formatCurrency(totalEstimated)}</h3>
          <small>Basado en precio unitario y cantidad sugerida.</small>
        </article>
        <article className="kpi-card">
          <p>Categorias activas</p>
          <h3>{Object.keys(groupedItems).length}</h3>
          <small>Compra organizada por frente operativo.</small>
        </article>
      </div>

      <section className="panel purchases-filter-panel">
        <div className="panel-title">
          <h3>Lista de reposicion</h3>
        </div>
        <div className="inventory-controls purchases-controls">
          <button
            type="button"
            className={`btn btn-filter ${categoryFilter === "all" ? "active" : ""}`}
            onClick={() => setCategoryFilter("all")}
          >
            Todas
          </button>
          {categories.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`btn btn-filter ${categoryFilter === option.value ? "active" : ""}`}
              onClick={() => setCategoryFilter(option.value)}
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
                            Frecuencia: {FREQUENCY_LABELS[item.usage_frequency] || item.usage_frequency} | Ultima compra: {formatDate(item.last_purchase)}
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
                            onClick={() => handleBuy(item)}
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
    </section>
  );
}