import { useState } from "react";
import { createProduct } from "../../api.js";
import {
  FREQUENCY_OPTIONS,
  getBudgetBucketForCategory,
  getBudgetBucketOptions,
  getCategoryOptions,
  getTypeForCategory,
  getTypeLabel,
  getUnitOptions,
  requiresExactQuantity,
} from "../../constants/inventory.js";
import { toInputDate } from "../expenses/utils.js";

function createInitialFormData() {
  const firstCategory = getCategoryOptions("inventory")[0]?.value || "food";
  return {
    name: "",
    category: firstCategory,
    budget_bucket: getBudgetBucketForCategory(firstCategory),
    stock: 0,
    stock_min: 1,
    unit: getUnitOptions()[0]?.value || "unidad",
    price: "",
    usage_frequency: "medium",
    last_purchase: toInputDate(new Date()),
    next_due_date: "",
  };
}

export function ProductForm({ onProductCreated, onClose, compact = true }) {
  const [formData, setFormData] = useState(() => createInitialFormData());
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const categoryOptions = getCategoryOptions("inventory");
  const budgetBucketOptions = getBudgetBucketOptions();
  const unitOptions = getUnitOptions();
  const inferredType = getTypeLabel(getTypeForCategory(formData.category)) || "Consumible";
  const usesExactQuantity = requiresExactQuantity(formData.unit);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      ...(name === "category" ? { budget_bucket: getBudgetBucketForCategory(value) } : {}),
      [name]: name === "stock" || name === "stock_min" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    try {
      await createProduct({
        ...formData,
        type: getTypeForCategory(formData.category),
        price: formData.price === "" ? null : Number(formData.price),
      });
      setFormData(createInitialFormData());
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
          <input name="name" type="text" required maxLength="100" value={formData.name} onChange={handleChange} />
        </label>

        <label>
          Categoria de hogar
          <select name="category" required value={formData.category} onChange={handleChange}>
            {categoryOptions.map((category) => (
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
          <select name="budget_bucket" required value={formData.budget_bucket} onChange={handleChange}>
            {budgetBucketOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Unidad
          <select name="unit" required value={formData.unit} onChange={handleChange}>
            {unitOptions.map((unit) => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          {usesExactQuantity ? "Cantidad exacta inicial" : "Stock actual"}
          <input
            name="stock"
            type="number"
            min="0"
            step={usesExactQuantity ? "0.001" : "1"}
            required
            value={formData.stock}
            onChange={handleChange}
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
            value={formData.stock_min}
            onChange={handleChange}
          />
        </label>

        <label>
          Frecuencia de uso
          <select name="usage_frequency" required value={formData.usage_frequency} onChange={handleChange}>
            {FREQUENCY_OPTIONS.map((frequency) => (
              <option key={frequency.value} value={frequency.value}>
                {frequency.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Precio
          <input name="price" type="number" min="0" step="0.01" value={formData.price} onChange={handleChange} placeholder="Opcional" />
        </label>

        <label>
          Ultima compra
          <input name="last_purchase" type="date" value={formData.last_purchase} onChange={handleChange} />
        </label>

        <label>
          Proximo vencimiento
          <input name="next_due_date" type="date" value={formData.next_due_date} onChange={handleChange} />
        </label>

        <button className="btn btn-primary" type="submit">
          Guardar producto
        </button>
      </form>
      {message && <p className={`message ${isError ? "error" : ""}`}>{message}</p>}
    </section>
  );
}