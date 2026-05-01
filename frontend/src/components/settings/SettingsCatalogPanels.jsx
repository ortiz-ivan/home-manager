export function SettingsCatalogPanels({
  formState,
  bucketOptions,
  categoryScopeOptions,
  typeOptions,
  onUpdateCategory,
  onAddCategory,
  onRemoveCategory,
  onUpdateUnit,
  onAddUnit,
  onRemoveUnit,
  onUpdateBucket,
}) {
  return (
    <>
      <article className="panel settings-panel settings-panel-wide">
        <div className="panel-title">
          <h3>Categorias</h3>
          <button className="btn btn-outline" type="button" onClick={onAddCategory}>
            Agregar categoria
          </button>
        </div>

        <div className="settings-table">
          {formState.categories.map((category, index) => (
            <div key={`${category.value || "new"}-${index}`} className="settings-row settings-row-grid category-row">
              <input type="text" placeholder="Clave" value={category.value} onChange={(event) => onUpdateCategory(index, "value", event.target.value)} />
              <input type="text" placeholder="Etiqueta" value={category.label} onChange={(event) => onUpdateCategory(index, "label", event.target.value)} />
              <select value={category.scope} onChange={(event) => onUpdateCategory(index, "scope", event.target.value)}>
                {categoryScopeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select value={category.type} onChange={(event) => onUpdateCategory(index, "type", event.target.value)}>
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select value={category.budget_bucket} onChange={(event) => onUpdateCategory(index, "budget_bucket", event.target.value)}>
                {bucketOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <input type="number" min="0" step="0.01" placeholder="Costo sugerido" value={category.fallback_unit_cost} onChange={(event) => onUpdateCategory(index, "fallback_unit_cost", event.target.value)} />
              <button className="btn btn-outline danger-inline" type="button" onClick={() => onRemoveCategory(index)}>
                Quitar
              </button>
            </div>
          ))}
        </div>
      </article>

      <article className="panel settings-panel">
        <div className="panel-title">
          <h3>Unidades</h3>
          <button className="btn btn-outline" type="button" onClick={onAddUnit}>
            Agregar unidad
          </button>
        </div>

        <div className="settings-stack">
          {formState.units.map((unit, index) => (
            <div key={`${unit.value || "unit"}-${index}`} className="settings-row settings-row-inline">
              <input type="text" placeholder="Valor" value={unit.value} onChange={(event) => onUpdateUnit(index, "value", event.target.value)} />
              <input type="text" placeholder="Etiqueta" value={unit.label} onChange={(event) => onUpdateUnit(index, "label", event.target.value)} />
              <button className="btn btn-outline danger-inline" type="button" onClick={() => onRemoveUnit(index)}>
                Quitar
              </button>
            </div>
          ))}
        </div>
      </article>

      <article className="panel settings-panel">
        <div className="panel-title">
          <h3>Reglas de buckets</h3>
        </div>
        <div className="settings-stack">
          {formState.budget_buckets.map((bucket, index) => (
            <div key={bucket.value} className="settings-row settings-row-inline">
              <input type="text" value={bucket.value} disabled />
              <input type="text" value={bucket.label} onChange={(event) => onUpdateBucket(index, "label", event.target.value)} />
              <input type="number" min="0" max="1" step="0.01" value={bucket.target_ratio} onChange={(event) => onUpdateBucket(index, "target_ratio", event.target.value)} />
            </div>
          ))}
        </div>
      </article>
    </>
  );
}