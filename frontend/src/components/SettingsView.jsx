import { useEffect, useMemo, useState } from "react";

const CATEGORY_SCOPE_OPTIONS = [
  { value: "inventory", label: "Inventario" },
  { value: "fixed_expense", label: "Gasto fijo" },
  { value: "variable_expense", label: "Gasto variable" },
];

const TYPE_OPTIONS = [
  { value: "consumable", label: "Consumible" },
  { value: "service", label: "Servicio" },
  { value: "subscription", label: "Suscripcion" },
  { value: "asset", label: "Activo" },
];

const CRITICAL_FREQUENCY_OPTIONS = [
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
];

function cloneSettings(settings) {
  return JSON.parse(JSON.stringify(settings));
}

function createCategoryDraft(bucketValue) {
  return {
    value: "",
    label: "",
    scope: "inventory",
    type: "consumable",
    budget_bucket: bucketValue,
    fallback_unit_cost: 0,
  };
}

function createUnitDraft() {
  return {
    value: "",
    label: "",
  };
}

export function SettingsView({ settings, loading, onSave }) {
  const [formState, setFormState] = useState(() => cloneSettings(settings));
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormState(cloneSettings(settings));
  }, [settings]);

  const bucketOptions = useMemo(
    () => formState.budget_buckets.map((item) => ({ value: item.value, label: item.label })),
    [formState.budget_buckets]
  );

  const updateCategory = (index, key, value) => {
    setFormState((prev) => {
      const next = cloneSettings(prev);
      next.categories[index][key] = key === "fallback_unit_cost" ? Number(value) : value;
      return next;
    });
  };

  const updateUnit = (index, key, value) => {
    setFormState((prev) => {
      const next = cloneSettings(prev);
      next.units[index][key] = value;
      return next;
    });
  };

  const updateBucket = (index, key, value) => {
    setFormState((prev) => {
      const next = cloneSettings(prev);
      next.budget_buckets[index][key] = key === "target_ratio" ? Number(value) : value;
      return next;
    });
  };

  const updateThreshold = (key, value) => {
    setFormState((prev) => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [key]: Number(value),
      },
    }));
  };

  const updateCurrency = (key, value) => {
    setFormState((prev) => ({
      ...prev,
      currency: {
        ...prev.currency,
        [key]: key === "maximum_fraction_digits" ? Number(value) : value,
      },
    }));
  };

  const updateAlert = (key, value) => {
    setFormState((prev) => ({
      ...prev,
      alerts: {
        ...prev.alerts,
        [key]: Number(value),
      },
    }));
  };

  const toggleCriticalFrequency = (frequencyValue) => {
    setFormState((prev) => {
      const currentValues = prev.alerts.critical_frequencies || [];
      const exists = currentValues.includes(frequencyValue);
      const nextValues = exists
        ? currentValues.filter((item) => item !== frequencyValue)
        : [...currentValues, frequencyValue];

      return {
        ...prev,
        alerts: {
          ...prev.alerts,
          critical_frequencies: nextValues,
        },
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    if (!formState.categories.length) {
      setMessage("Debe existir al menos una categoria.");
      setIsError(true);
      return;
    }

    if (!formState.units.length) {
      setMessage("Debe existir al menos una unidad.");
      setIsError(true);
      return;
    }

    if (!formState.alerts.critical_frequencies.length) {
      setMessage("Selecciona al menos una frecuencia critica para alertas.");
      setIsError(true);
      return;
    }

    try {
      setIsSaving(true);
      await onSave(formState);
      setMessage("Configuracion actualizada");
    } catch (error) {
      setMessage(error.message || "No se pudo guardar la configuracion");
      setIsError(true);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="module-content fade-in">
        <div className="section-header">
          <h2>Configuracion</h2>
          <p>Cargando reglas y catalogos operativos.</p>
        </div>
        <article className="panel">
          <p>Cargando configuracion...</p>
        </article>
      </section>
    );
  }

  return (
    <section className="module-content fade-in settings-view">
      <div className="section-header">
        <h2>Configuracion</h2>
        <p>Edita catalogos, reglas de presupuesto, moneda y criterios de alerta desde un solo lugar.</p>
      </div>

      <form className="settings-grid" onSubmit={handleSubmit}>
        <article className="panel settings-panel settings-panel-wide">
          <div className="panel-title">
            <h3>Categorias</h3>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => setFormState((prev) => ({
                ...prev,
                categories: [...prev.categories, createCategoryDraft(prev.budget_buckets[0]?.value || "needs")],
              }))}
            >
              Agregar categoria
            </button>
          </div>

          <div className="settings-table">
            {formState.categories.map((category, index) => (
              <div key={`${category.value || "new"}-${index}`} className="settings-row settings-row-grid category-row">
                <input type="text" placeholder="Clave" value={category.value} onChange={(event) => updateCategory(index, "value", event.target.value)} />
                <input type="text" placeholder="Etiqueta" value={category.label} onChange={(event) => updateCategory(index, "label", event.target.value)} />
                <select value={category.scope} onChange={(event) => updateCategory(index, "scope", event.target.value)}>
                  {CATEGORY_SCOPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select value={category.type} onChange={(event) => updateCategory(index, "type", event.target.value)}>
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select value={category.budget_bucket} onChange={(event) => updateCategory(index, "budget_bucket", event.target.value)}>
                  {bucketOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <input type="number" min="0" step="0.01" placeholder="Costo sugerido" value={category.fallback_unit_cost} onChange={(event) => updateCategory(index, "fallback_unit_cost", event.target.value)} />
                <button
                  className="btn btn-outline danger-inline"
                  type="button"
                  onClick={() => setFormState((prev) => ({
                    ...prev,
                    categories: prev.categories.filter((_, itemIndex) => itemIndex !== index),
                  }))}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="panel settings-panel">
          <div className="panel-title">
            <h3>Unidades</h3>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => setFormState((prev) => ({
                ...prev,
                units: [...prev.units, createUnitDraft()],
              }))}
            >
              Agregar unidad
            </button>
          </div>

          <div className="settings-stack">
            {formState.units.map((unit, index) => (
              <div key={`${unit.value || "unit"}-${index}`} className="settings-row settings-row-inline">
                <input type="text" placeholder="Valor" value={unit.value} onChange={(event) => updateUnit(index, "value", event.target.value)} />
                <input type="text" placeholder="Etiqueta" value={unit.label} onChange={(event) => updateUnit(index, "label", event.target.value)} />
                <button
                  className="btn btn-outline danger-inline"
                  type="button"
                  onClick={() => setFormState((prev) => ({
                    ...prev,
                    units: prev.units.filter((_, itemIndex) => itemIndex !== index),
                  }))}
                >
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
                <input type="text" value={bucket.label} onChange={(event) => updateBucket(index, "label", event.target.value)} />
                <input type="number" min="0" max="1" step="0.01" value={bucket.target_ratio} onChange={(event) => updateBucket(index, "target_ratio", event.target.value)} />
              </div>
            ))}
          </div>
        </article>

        <article className="panel settings-panel">
          <div className="panel-title">
            <h3>Umbrales</h3>
          </div>
          <div className="form-grid compact-grid">
            <label>
              Stock minimo por defecto
              <input type="number" min="0" value={formState.thresholds.default_stock_min} onChange={(event) => updateThreshold("default_stock_min", event.target.value)} />
            </label>
            <label>
              Ratio bajo stock
              <input type="number" min="0" step="0.1" value={formState.thresholds.low_stock_ratio} onChange={(event) => updateThreshold("low_stock_ratio", event.target.value)} />
            </label>
            <label>
              Ratio critico
              <input type="number" min="0" step="0.1" value={formState.thresholds.critical_stock_ratio} onChange={(event) => updateThreshold("critical_stock_ratio", event.target.value)} />
            </label>
            <label>
              Ratio sugerencia compra
              <input type="number" min="0" step="0.1" value={formState.thresholds.purchase_suggestion_stock_ratio} onChange={(event) => updateThreshold("purchase_suggestion_stock_ratio", event.target.value)} />
            </label>
          </div>
        </article>

        <article className="panel settings-panel">
          <div className="panel-title">
            <h3>Moneda y cierre</h3>
          </div>
          <div className="form-grid compact-grid">
            <label>
              Codigo moneda
              <input type="text" value={formState.currency.code} onChange={(event) => updateCurrency("code", event.target.value)} />
            </label>
            <label>
              Locale
              <input type="text" value={formState.currency.locale} onChange={(event) => updateCurrency("locale", event.target.value)} />
            </label>
            <label>
              Decimales maximos
              <input type="number" min="0" max="6" value={formState.currency.maximum_fraction_digits} onChange={(event) => updateCurrency("maximum_fraction_digits", event.target.value)} />
            </label>
            <label>
              Dia de cierre mensual
              <input type="number" min="1" max="31" value={formState.monthly_close_day} onChange={(event) => setFormState((prev) => ({ ...prev, monthly_close_day: Number(event.target.value) }))} />
            </label>
          </div>
        </article>

        <article className="panel settings-panel">
          <div className="panel-title">
            <h3>Criterios de alertas</h3>
          </div>
          <div className="form-grid compact-grid">
            <label>
              Dias para vencer pronto
              <input type="number" min="0" value={formState.alerts.expiring_soon_days} onChange={(event) => updateAlert("expiring_soon_days", event.target.value)} />
            </label>
            <label>
              Dias sin compra
              <input type="number" min="0" value={formState.alerts.purchase_stale_days} onChange={(event) => updateAlert("purchase_stale_days", event.target.value)} />
            </label>
          </div>

          <div className="settings-check-grid">
            {CRITICAL_FREQUENCY_OPTIONS.map((option) => {
              const checked = formState.alerts.critical_frequencies.includes(option.value);
              return (
                <label key={option.value} className="check-chip">
                  <input type="checkbox" checked={checked} onChange={() => toggleCriticalFrequency(option.value)} />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </article>

        <div className="settings-actions">
          <button className="btn btn-primary" type="submit" disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar configuracion"}
          </button>
        </div>

        {message && <p className={`message ${isError ? "error" : ""}`}>{message}</p>}
      </form>
    </section>
  );
}