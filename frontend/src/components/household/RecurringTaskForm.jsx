const WEEKDAY_OPTIONS = [
  { value: 0, label: "Lunes" },
  { value: 1, label: "Martes" },
  { value: 2, label: "Miercoles" },
  { value: 3, label: "Jueves" },
  { value: 4, label: "Viernes" },
  { value: 5, label: "Sabado" },
  { value: 6, label: "Domingo" },
];

export function RecurringTaskForm({
  formData,
  message,
  isError,
  categoryOptions,
  areaOptions,
  priorityOptions,
  integrationOptions,
  fixedExpenseOptions,
  productOptions,
  onChange,
  onSubmit,
  onClose,
}) {
  const intervalLabel = formData.frequency_type === "daily" ? "Cada cuantos dias" : "Cada cuanto";

  return (
    <section className="panel modal-form-panel compact">
      <div className="modal-form-header">
        <h2>Nueva tarea recurrente</h2>
        <button className="btn btn-outline" type="button" onClick={onClose}>
          Cerrar
        </button>
      </div>

      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          Titulo
          <input name="title" type="text" required maxLength="120" value={formData.title} onChange={onChange} />
        </label>

        <label>
          Categoria
          <select name="category" value={formData.category} onChange={onChange}>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Area
          <select name="area" value={formData.area} onChange={onChange}>
            {areaOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Prioridad
          <select name="priority" value={formData.priority} onChange={onChange}>
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tiempo estimado en minutos
          <input
            name="estimated_minutes"
            type="number"
            min="0"
            step="5"
            value={formData.estimated_minutes}
            onChange={onChange}
          />
        </label>

        <label>
          Integracion
          <select name="integration_kind" value={formData.integration_kind} onChange={onChange}>
            {integrationOptions.map((option) => (
              <option key={option.value || "none"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {formData.integration_kind === "fixed_expense" ? (
          <label>
            Gasto fijo vinculado
            <select name="linked_fixed_expense" value={formData.linked_fixed_expense} onChange={onChange}>
              <option value="">Selecciona un gasto</option>
              {fixedExpenseOptions.map((expense) => (
                <option key={expense.id} value={expense.id}>
                  {expense.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {["product_restock", "product_expiry"].includes(formData.integration_kind) ? (
          <label>
            Producto vinculado
            <select name="linked_product" value={formData.linked_product} onChange={onChange}>
              <option value="">Selecciona un producto</option>
              {productOptions.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label>
          Frecuencia
          <select name="frequency_type" value={formData.frequency_type} onChange={onChange}>
            <option value="daily">Diaria</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
          </select>
        </label>

        <label>
          {intervalLabel}
          <input name="interval" type="number" min="1" step="1" value={formData.interval} onChange={onChange} />
        </label>

        {formData.frequency_type === "weekly" ? (
          <label>
            Dia de la semana
            <select name="weekday" value={formData.weekday} onChange={onChange}>
              {WEEKDAY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : formData.frequency_type === "monthly" ? (
          <label>
            Dia del mes
            <input name="day_of_month" type="number" min="1" max="31" value={formData.day_of_month} onChange={onChange} />
          </label>
        ) : null}

        <label>
          Inicio
          <input name="start_date" type="date" required value={formData.start_date} onChange={onChange} />
        </label>

        <label>
          Activa
          <input name="is_active" type="checkbox" checked={formData.is_active} onChange={onChange} />
        </label>

        <label>
          Notas
          <input name="notes" type="text" maxLength="255" value={formData.notes} onChange={onChange} />
        </label>

        <button className="btn btn-primary" type="submit">
          Guardar tarea
        </button>
      </form>

      {message && <p className={`message ${isError ? "error" : ""}`}>{message}</p>}
    </section>
  );
}