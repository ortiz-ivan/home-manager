export function HouseholdFiltersBar({ filters, categoryOptions, areaOptions, priorityOptions, onChange, onReset }) {
  return (
    <article className="panel">
      <div className="panel-title">
        <div>
          <h3>Filtros de contexto</h3>
          <p>Acota la agenda y las plantillas por categoria, area y prioridad.</p>
        </div>
      </div>

      <div className="form-grid">
        <label>
          Categoria
          <select name="category" value={filters.category} onChange={onChange}>
            <option value="">Todas</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Area
          <select name="area" value={filters.area} onChange={onChange}>
            <option value="">Todas</option>
            {areaOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Prioridad
          <select name="priority" value={filters.priority} onChange={onChange}>
            <option value="">Todas</option>
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button className="btn btn-outline" type="button" onClick={onReset}>
          Limpiar filtros
        </button>
      </div>
    </article>
  );
}