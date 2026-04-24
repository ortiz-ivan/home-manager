import { useEffect, useState } from "react";
import { createProduct, updateProduct } from "../api.js";
import {
  BUDGET_BUCKET_OPTIONS,
  FIXED_EXPENSE_CATEGORY_OPTIONS,
  FREQUENCY_OPTIONS,
  TYPE_LABELS,
  getBudgetBucketForCategory,
  getTypeForCategory,
} from "../constants/inventory.js";

const INITIAL_FORM_DATA = {
  name: "",
  category: FIXED_EXPENSE_CATEGORY_OPTIONS[0]?.value || "services",
  budget_bucket: getBudgetBucketForCategory(FIXED_EXPENSE_CATEGORY_OPTIONS[0]?.value || "services"),
  price: "",
  usage_frequency: "medium",
  next_due_date: "",
};

function normalizeFormData(initialData) {
  return {
    ...INITIAL_FORM_DATA,
    ...initialData,
    price: initialData?.price ?? "",
    next_due_date: initialData?.next_due_date || "",
    budget_bucket:
      initialData?.budget_bucket || getBudgetBucketForCategory(initialData?.category || INITIAL_FORM_DATA.category),
  };
}

export function ExpenseProductForm({
  expenseProductId = null,
  initialData = INITIAL_FORM_DATA,
  onExpenseCreated,
  onClose,
  compact = true,
  title = "Nuevo gasto fijo",
  submitLabel = "Guardar gasto",
}) {
  const [formData, setFormData] = useState(() => normalizeFormData(initialData));
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setFormData(normalizeFormData(initialData));
  }, [initialData]);

  const inferredType = TYPE_LABELS[getTypeForCategory(formData.category)] || "Servicio";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      ...(name === "category" ? { budget_bucket: getBudgetBucketForCategory(value) } : {}),
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    const price = Number(formData.price);
    if (Number.isNaN(price) || price <= 0) {
      setMessage("El monto del gasto debe ser mayor a 0");
      setIsError(true);
      return;
    }

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        budget_bucket: formData.budget_bucket,
        type: getTypeForCategory(formData.category),
        price,
        usage_frequency: formData.usage_frequency,
        next_due_date: formData.next_due_date || null,
        stock: 0,
        stock_min: 0,
        unit: "servicio",
      };

      if (expenseProductId) {
        await updateProduct(expenseProductId, payload);
      } else {
        await createProduct(payload);
      }

      setMessage(expenseProductId ? "Gasto fijo actualizado" : "Gasto fijo guardado");
      setFormData(INITIAL_FORM_DATA);
      await onExpenseCreated();
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
        <h2>{title}</h2>
        <button className="btn btn-outline" type="button" onClick={onClose}>
          Cerrar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Concepto
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
          Categoria de gasto
          <select
            name="category"
            required
            value={formData.category}
            onChange={handleChange}
          >
            {FIXED_EXPENSE_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
          Monto mensual estimado
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            required
            value={formData.price}
            onChange={handleChange}
          />
        </label>

        <label>
          Frecuencia
          <select
            name="usage_frequency"
            required
            value={formData.usage_frequency}
            onChange={handleChange}
          >
            {FREQUENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
          {submitLabel}
        </button>
      </form>

      {message && <p className={`message ${isError ? "error" : ""}`}>{message}</p>}
    </section>
  );
}
