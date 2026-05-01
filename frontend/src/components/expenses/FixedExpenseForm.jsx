import { useEffect, useState } from "react";
import { createFixedExpense, updateFixedExpense } from "../../api.js";
import {
  getBudgetBucketForCategory,
  getBudgetBucketOptions,
  getCategoryOptions,
} from "../../constants/inventory.js";

function createInitialFormData() {
  const firstCategory = getCategoryOptions("fixed_expense")[0]?.value || "services";
  return {
    name: "",
    category: firstCategory,
    budget_bucket: getBudgetBucketForCategory(firstCategory),
    monthly_amount: "",
    next_due_date: "",
    change_reason: "",
  };
}

function normalizeFormData(initialData) {
  const initialDefaults = createInitialFormData();
  return {
    ...initialDefaults,
    ...(initialData || {}),
    monthly_amount: initialData?.monthly_amount ?? "",
    next_due_date: initialData?.next_due_date || "",
    change_reason: "",
    budget_bucket:
      initialData?.budget_bucket || getBudgetBucketForCategory(initialData?.category || initialDefaults.category),
  };
}

export function FixedExpenseForm({
  fixedExpenseId = null,
  initialData,
  onFixedExpenseSaved,
  onClose,
  compact = true,
  title = "Nuevo gasto fijo",
  submitLabel = "Guardar gasto",
}) {
  const [formData, setFormData] = useState(() => normalizeFormData(initialData));
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const categoryOptions = getCategoryOptions("fixed_expense");
  const budgetBucketOptions = getBudgetBucketOptions();

  useEffect(() => {
    setFormData(normalizeFormData(initialData));
  }, [initialData]);

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

    const monthlyAmount = Number(formData.monthly_amount);
    if (Number.isNaN(monthlyAmount) || monthlyAmount <= 0) {
      setMessage("El monto del gasto debe ser mayor a 0");
      setIsError(true);
      return;
    }

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        budget_bucket: formData.budget_bucket,
        monthly_amount: monthlyAmount,
        next_due_date: formData.next_due_date || null,
        change_reason: formData.change_reason,
      };

      if (fixedExpenseId) {
        await updateFixedExpense(fixedExpenseId, payload);
      } else {
        await createFixedExpense(payload);
      }

      setMessage(fixedExpenseId ? "Gasto fijo actualizado" : "Gasto fijo guardado");
      setFormData(createInitialFormData());
      await onFixedExpenseSaved();
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
          <input name="name" type="text" required maxLength="100" value={formData.name} onChange={handleChange} />
        </label>

        <label>
          Categoria de gasto
          <select name="category" required value={formData.category} onChange={handleChange}>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
          Monto mensual estimado
          <input name="monthly_amount" type="number" min="0" step="0.01" required value={formData.monthly_amount} onChange={handleChange} />
        </label>

        <label>
          Proximo vencimiento
          <input name="next_due_date" type="date" value={formData.next_due_date} onChange={handleChange} />
        </label>

        <label>
          Motivo del cambio
          <input
            name="change_reason"
            type="text"
            maxLength="255"
            required={Boolean(fixedExpenseId)}
            value={formData.change_reason}
            onChange={handleChange}
            placeholder={fixedExpenseId ? "Explica por que editas este gasto fijo" : "Alta inicial, ajuste, correccion..."}
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