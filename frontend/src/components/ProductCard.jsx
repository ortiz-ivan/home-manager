import { useState } from "react";
import {
  consumeProduct,
  buyProduct,
  markOutOfStock,
  payProduct,
  updateProduct,
  deleteProduct,
} from "../api.js";
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  FREQUENCY_LABELS,
  FREQUENCY_OPTIONS,
  TYPE_LABELS,
  TYPE_OPTIONS,
} from "../constants/inventory.js";

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") {
    return "sin dato";
  }

  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return "sin dato";
  }

  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProductCard({ product, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(product);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({
      ...prev,
      [name]: name === "stock" || name === "stock_min" ? Number(value) : value,
    }));
  };

  const handleQuickAction = async (action) => {
    setMessage("");
    setIsError(false);

    try {
      if (action === "consume") {
        await consumeProduct(product.id, 1);
      } else if (action === "buy") {
        await buyProduct(product.id, 1);
      } else if (action === "out_of_stock") {
        await markOutOfStock(product.id);
      } else if (action === "pay") {
        await payProduct(product.id);
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
      await updateProduct(product.id, editData);
      setMessage("Producto actualizado");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    }
  };

  const category = CATEGORY_LABELS[product.category] || product.category;
  const frequency = FREQUENCY_LABELS[product.usage_frequency] || product.usage_frequency;
  const type = TYPE_LABELS[product.type] || product.type;
  const isLowStock = product.stock <= product.stock_min;
  const isConsumable = product.type === "consumable";
  const canPay = product.type === "service" || product.type === "subscription";

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
            {canPay && (
              <button
                className="btn btn-success"
                type="button"
                onClick={() => handleQuickAction("pay")}
              >
                Registrar pago
              </button>
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
              {CATEGORY_OPTIONS.map((categoryOption) => (
                <option key={categoryOption.value} value={categoryOption.value}>
                  {categoryOption.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tipo
            <select
              name="type"
              required
              value={editData.type}
              onChange={handleEditChange}
            >
              {TYPE_OPTIONS.map((typeOption) => (
                <option key={typeOption.value} value={typeOption.value}>
                  {typeOption.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Stock
            <input
              name="stock"
              type="number"
              min="0"
              required
              value={editData.stock}
              onChange={handleEditChange}
            />
          </label>

          <label>
            Stock minimo
            <input
              name="stock_min"
              type="number"
              min="0"
              required
              value={editData.stock_min}
              onChange={handleEditChange}
            />
          </label>

          <label>
            Unidad
            <input
              name="unit"
              type="text"
              maxLength="20"
              required
              value={editData.unit}
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
