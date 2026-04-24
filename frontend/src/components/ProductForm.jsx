import { useState } from "react";
import { createProduct } from "../api.js";
import {
  BUDGET_BUCKET_OPTIONS,
  FREQUENCY_OPTIONS,
  HOME_INVENTORY_CATEGORY_OPTIONS,
  TYPE_LABELS,
  getBudgetBucketForCategory,
  getTypeForCategory,
} from "../constants/inventory.js";

const INITIAL_FORM_DATA = {
  name: "",
  category: "food",
  budget_bucket: getBudgetBucketForCategory("food"),
  stock: 0,
  stock_min: 1,
  unit: "unidad",
  price: "",
  usage_frequency: "medium",
  last_purchase: "",
  next_due_date: "",
};

export function ProductForm({ onProductCreated, onClose, compact = true }) {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const inferredType = TYPE_LABELS[getTypeForCategory(formData.category)] || "Consumible";

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      ...(name === "category" ? { budget_bucket: getBudgetBucketForCategory(value) } : {}),
      [name]:
        name === "stock" || name === "stock_min"
          ? Number(value)
          : name === "price"
            ? value
            : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    try {
      const payload = {
        ...formData,
        type: getTypeForCategory(formData.category),
        price: formData.price === "" ? null : Number(formData.price),
      };
      await createProduct(payload);
      setFormData(INITIAL_FORM_DATA);
      setMessage("Producto guardado");
      onProductCreated();
      if (onClose) {
        onClose();
      }
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    }
  };

  return (
    <section className={`panel modal-form-panel ${compact ? "compact" : ""}`}>
      <div className="modal-form-header">
        <h2>Nuevo producto</h2>
        <button className="btn btn-outline" type="button" onClick={onClose}>
          Cerrar
        </button>
      </div>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Nombre
          <input
            name="name"
            type="text"
            required
            maxLength="100"
            value={formData.name}
            onChange={handleChange}
          />
        </label>

        <label>
          Categoria de hogar
          <select
            name="category"
            required
            value={formData.category}
            onChange={handleChange}
          >
            {HOME_INVENTORY_CATEGORY_OPTIONS.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tipo (automatico)
          <input type="text" value={inferredType} readOnly />
        </label>

        <label>
          Bolsa 50-30-20
          <select
            name="budget_bucket"
            required
            value={formData.budget_bucket}
            onChange={handleChange}
          >
            {BUDGET_BUCKET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Stock actual
          <input
            name="stock"
            type="number"
            min="0"
            required
            value={formData.stock}
            onChange={handleChange}
          />
        </label>

        <label>
          Stock minimo
          <input
            name="stock_min"
            type="number"
            min="0"
            required
            value={formData.stock_min}
            onChange={handleChange}
          />
        </label>

        <label>
          Unidad
          <input
            name="unit"
            type="text"
            maxLength="20"
            required
            value={formData.unit}
            onChange={handleChange}
          />
        </label>

        <label>
          Frecuencia de uso
          <select
            name="usage_frequency"
            required
            value={formData.usage_frequency}
            onChange={handleChange}
          >
            {FREQUENCY_OPTIONS.map((frequency) => (
              <option key={frequency.value} value={frequency.value}>
                {frequency.label}
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
            value={formData.price}
            onChange={handleChange}
            placeholder="Opcional"
          />
        </label>

        <label>
          Ultima compra
          <input
            name="last_purchase"
            type="date"
            value={formData.last_purchase}
            onChange={handleChange}
          />
        </label>

        <label>
          Proximo vencimiento
          <input
            name="next_due_date"
            type="date"
            value={formData.next_due_date}
            onChange={handleChange}
          />
        </label>

        <button className="btn btn-primary" type="submit">
          Guardar producto
        </button>
      </form>
      {message && <p className={`message ${isError ? "error" : ""}`}>{message}</p>}
    </section>
  );
}
