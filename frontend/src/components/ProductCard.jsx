import { useState } from "react";
import {
  consumeProduct,
  buyProduct,
  markOutOfStock,
  updateProduct,
  deleteProduct,
} from "../api.js";

const CATEGORY_LABELS = {
  food: "Alimentos",
  cleaning: "Limpieza",
  hygiene: "Higiene",
  home: "Hogar",
};

const FREQUENCY_LABELS = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

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
  const isLowStock = product.stock <= product.stock_min;

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
            {category} | Min: {product.stock_min} {product.unit} | Frecuencia: {frequency}
          </p>

          <p className="meta">
            Ultima compra: {product.last_purchase || "sin registro"}
          </p>

          <div className="actions">
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
              <option value="food">Alimentos</option>
              <option value="cleaning">Limpieza</option>
              <option value="hygiene">Higiene</option>
              <option value="home">Hogar</option>
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
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
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
