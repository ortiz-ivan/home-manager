import { useState } from "react";
import {
  consumeProduct,
  buyProduct,
  markOutOfStock,
  updateProduct,
  deleteProduct,
  getProductStats,
  listProductConsumptions,
  listProductRestocks,
} from "../../api.js";
import {
  FREQUENCY_LABELS,
  FREQUENCY_OPTIONS,
  formatCurrency,
  getBudgetBucketForCategory,
  getBudgetBucketLabels,
  getBudgetBucketOptions,
  getCategoryLabel,
  getCategoryOptions,
  getTypeForCategory,
  getTypeLabel,
  getUnitOptions,
  requiresExactQuantity,
} from "../../constants/inventory.js";

function ProductHistoryPanel({ productId, unit }) {
  const [stats, setStats] = useState(null);
  const [consumptions, setConsumptions] = useState(null);
  const [restocks, setRestocks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(90);

  const load = async (d = days) => {
    setLoading(true);
    try {
      const [s, c, r] = await Promise.all([
        getProductStats(productId, d),
        listProductConsumptions(productId, d),
        listProductRestocks(productId, d),
      ]);
      setStats(s);
      setConsumptions(c);
      setRestocks(r);
    } finally {
      setLoading(false);
    }
  };

  const handleDaysChange = (e) => {
    const d = Number(e.target.value);
    setDays(d);
    load(d);
  };

  if (!stats && !loading) {
    return (
      <button className="btn btn-outline" type="button" onClick={() => load()}>
        Ver historial
      </button>
    );
  }

  if (loading) {
    return <p className="meta">Cargando historial...</p>;
  }

  const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("es-PY", { maximumFractionDigits: 2 }));

  return (
    <div className="product-history">
      <div className="history-controls">
        <strong>Historial ({days} dias)</strong>
        <select value={days} onChange={handleDaysChange} className="days-select">
          <option value={30}>30 dias</option>
          <option value={90}>90 dias</option>
          <option value={180}>180 dias</option>
          <option value={365}>365 dias</option>
        </select>
        <button className="btn btn-outline btn-sm" type="button" onClick={() => { setStats(null); setConsumptions(null); setRestocks(null); }}>
          Cerrar
        </button>
      </div>

      <div className="history-stats">
        <div className="stat-item">
          <span className="stat-label">Consumido</span>
          <span className="stat-value">{fmt(stats.total_consumed)} {unit}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Repuesto</span>
          <span className="stat-value">{fmt(stats.total_restocked)} {unit}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Consumo/mes</span>
          <span className="stat-value">{fmt(stats.avg_monthly_consumption)} {unit}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Dias restantes</span>
          <span className="stat-value">{stats.estimated_days_remaining ?? "—"}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Costo mensual est.</span>
          <span className="stat-value">{stats.estimated_monthly_cost != null ? `${fmt(stats.estimated_monthly_cost)} Gs.` : "—"}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Intervalo reposicion</span>
          <span className="stat-value">{stats.avg_restock_interval_days != null ? `${fmt(stats.avg_restock_interval_days)} dias` : "—"}</span>
        </div>
      </div>

      {consumptions && consumptions.length > 0 && (
        <div className="history-table-section">
          <p className="meta"><strong>Consumos recientes</strong></p>
          <table className="history-table">
            <thead>
              <tr><th>Fecha</th><th>Cantidad</th></tr>
            </thead>
            <tbody>
              {consumptions.slice(0, 8).map((c) => (
                <tr key={c.id}>
                  <td>{c.date}</td>
                  <td>{fmt(c.quantity)} {unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {restocks && restocks.length > 0 && (
        <div className="history-table-section">
          <p className="meta"><strong>Reposiciones recientes</strong></p>
          <table className="history-table">
            <thead>
              <tr><th>Fecha</th><th>Cantidad</th><th>Costo unit.</th></tr>
            </thead>
            <tbody>
              {restocks.slice(0, 8).map((r) => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>{fmt(r.quantity)} {unit}</td>
                  <td>{r.unit_cost != null ? `${fmt(r.unit_cost)} Gs.` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {consumptions?.length === 0 && restocks?.length === 0 && (
        <p className="meta">Sin movimientos en el periodo.</p>
      )}
    </div>
  );
}

export function ProductCard({ product, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(product);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const categoryOptions = getCategoryOptions("inventory");
  const budgetBucketOptions = getBudgetBucketOptions();
  const budgetBucketLabels = getBudgetBucketLabels();
  const unitOptions = getUnitOptions();
  const usesExactQuantity = requiresExactQuantity(editData.unit);

  const getActionQuantity = (actionLabel, unit) => {
    if (!requiresExactQuantity(unit)) {
      return 1;
    }

    const response = window.prompt(`Cantidad exacta a ${actionLabel} en ${unit}`, "1.000");

    if (response === null) {
      return null;
    }

    const quantity = Number(response);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Ingresa una cantidad valida mayor a 0.");
    }

    return quantity;
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({
      ...prev,
      ...(name === "category"
        ? {
            type: getTypeForCategory(value),
            budget_bucket: getBudgetBucketForCategory(value),
          }
        : {}),
      [name]: name === "stock" || name === "stock_min" ? Number(value) : value,
    }));
  };

  const handleQuickAction = async (action) => {
    setMessage("");
    setIsError(false);

    try {
      if (action === "consume") {
        const quantity = getActionQuantity("consumir", product.unit);
        if (quantity === null) {
          return;
        }
        await consumeProduct(product.id, quantity);
      } else if (action === "buy") {
        const quantity = getActionQuantity("comprar", product.unit);
        if (quantity === null) {
          return;
        }
        await buyProduct(product.id, quantity);
      } else if (action === "out_of_stock") {
        await markOutOfStock(product.id);
      }
      onUpdate();
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Eliminar ${product.name}?`)) {
      try {
        await deleteProduct(product.id);
        onDelete();
      } catch (error) {
        setMessage(error.message);
        setIsError(true);
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    try {
      const payload = {
        ...editData,
        type: getTypeForCategory(editData.category),
      };

      await updateProduct(product.id, payload);
      setMessage("Producto actualizado");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    }
  };

  const category = getCategoryLabel(product.category);
  const frequency = FREQUENCY_LABELS[product.usage_frequency] || product.usage_frequency;
  const type = getTypeLabel(product.type);
  const budgetBucket = budgetBucketLabels[product.budget_bucket] || product.budget_bucket;
  const editingType = getTypeLabel(getTypeForCategory(editData.category)) || editData.type;
  const isLowStock = product.stock <= product.stock_min;
  const isConsumable = product.type === "consumable";

  return (
    <article className="product-card">
      {!isEditing ? (
        <>
          <div className="product-head">
            <h3>{product.name}</h3>
            <span className={`badge ${isLowStock ? "low-stock" : ""}`}>
              Stock: {product.stock} {product.unit}
            </span>
          </div>

          <p className="meta">
            {category} | Tipo: {type} | Frecuencia: {frequency}
          </p>

          <p className="meta">Bolsa: {budgetBucket}</p>

          <p className="meta">
            Min: {product.stock_min} {product.unit} | Precio: {formatCurrency(product.price)}
          </p>

          <p className="meta">
            Ultima compra: {product.last_purchase || "sin registro"}
          </p>

          <p className="meta">
            Proximo vencimiento: {product.next_due_date || "sin dato"}
          </p>

          <div className="actions">
            {isConsumable && (
              <>
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={() => handleQuickAction("consume")}
                >
                  Consumir
                </button>
                <button
                  className="btn btn-success"
                  type="button"
                  onClick={() => handleQuickAction("buy")}
                >
                  Comprar
                </button>
                <button
                  className="btn btn-warning"
                  type="button"
                  onClick={() => handleQuickAction("out_of_stock")}
                >
                  Marcar agotado
                </button>
              </>
            )}
          </div>

          <div className="actions">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setIsEditing(true)}
            >
              Editar
            </button>
            <button
              className="btn btn-outline"
              type="button"
              onClick={handleDelete}
            >
              Eliminar
            </button>
          </div>

          {isConsumable && (
            <div className="product-history-wrapper">
              <ProductHistoryPanel productId={product.id} unit={product.unit} />
            </div>
          )}
        </>
      ) : (
        <form onSubmit={handleEditSubmit} className="edit-form">
          <label>
            Nombre
            <input
              name="name"
              type="text"
              required
              maxLength="100"
              value={editData.name}
              onChange={handleEditChange}
            />
          </label>

          <label>
            Categoria
            <select
              name="category"
              required
              value={editData.category}
              onChange={handleEditChange}
            >
              {categoryOptions.map((categoryOption) => (
                <option key={categoryOption.value} value={categoryOption.value}>
                  {categoryOption.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tipo (automatico)
            <input type="text" value={editingType} readOnly />
          </label>

          <label>
            Bolsa 50-30-20
            <select
              name="budget_bucket"
              required
              value={editData.budget_bucket || getBudgetBucketForCategory(editData.category)}
              onChange={handleEditChange}
            >
              {budgetBucketOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Unidad
            <select
              name="unit"
              required
              value={editData.unit}
              onChange={handleEditChange}
            >
              {unitOptions.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            {usesExactQuantity ? "Cantidad exacta" : "Stock"}
            <input
              name="stock"
              type="number"
              min="0"
              step={usesExactQuantity ? "0.001" : "1"}
              required
              value={editData.stock}
              onChange={handleEditChange}
              placeholder={usesExactQuantity ? "Ej: 1.300" : undefined}
            />
          </label>

          <label>
            {usesExactQuantity ? "Cantidad minima" : "Stock minimo"}
            <input
              name="stock_min"
              type="number"
              min="0"
              step={usesExactQuantity ? "0.001" : "1"}
              required
              value={editData.stock_min}
              onChange={handleEditChange}
            />
          </label>

          <label>
            Frecuencia
            <select
              name="usage_frequency"
              required
              value={editData.usage_frequency}
              onChange={handleEditChange}
            >
              {FREQUENCY_OPTIONS.map((frequencyOption) => (
                <option key={frequencyOption.value} value={frequencyOption.value}>
                  {frequencyOption.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Precio
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={editData.price ?? ""}
              onChange={handleEditChange}
            />
          </label>

          <label>
            Ultima compra
            <input
              name="last_purchase"
              type="date"
              value={editData.last_purchase || ""}
              onChange={handleEditChange}
            />
          </label>

          <label>
            Proximo vencimiento
            <input
              name="next_due_date"
              type="date"
              value={editData.next_due_date || ""}
              onChange={handleEditChange}
            />
          </label>

          <div className="actions">
            <button className="btn btn-primary" type="submit">
              Guardar cambios
            </button>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => setIsEditing(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {message && <p className={`message ${isError ? "error" : ""}`}>{message}</p>}
    </article>
  );
}