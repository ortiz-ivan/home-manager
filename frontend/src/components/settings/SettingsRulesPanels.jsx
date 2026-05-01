export function SettingsRulesPanels({
  formState,
  criticalFrequencyOptions,
  onUpdateThreshold,
  onUpdateCurrency,
  onUpdateMonthlyCloseDay,
  onUpdateAlert,
  onToggleCriticalFrequency,
}) {
  return (
    <>
      <article className="panel settings-panel">
        <div className="panel-title">
          <h3>Umbrales</h3>
        </div>
        <div className="form-grid compact-grid">
          <label>
            Stock minimo por defecto
            <input type="number" min="0" value={formState.thresholds.default_stock_min} onChange={(event) => onUpdateThreshold("default_stock_min", event.target.value)} />
          </label>
          <label>
            Ratio bajo stock
            <input type="number" min="0" step="0.1" value={formState.thresholds.low_stock_ratio} onChange={(event) => onUpdateThreshold("low_stock_ratio", event.target.value)} />
          </label>
          <label>
            Ratio critico
            <input type="number" min="0" step="0.1" value={formState.thresholds.critical_stock_ratio} onChange={(event) => onUpdateThreshold("critical_stock_ratio", event.target.value)} />
          </label>
          <label>
            Ratio sugerencia compra
            <input type="number" min="0" step="0.1" value={formState.thresholds.purchase_suggestion_stock_ratio} onChange={(event) => onUpdateThreshold("purchase_suggestion_stock_ratio", event.target.value)} />
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
            <input type="text" value={formState.currency.code} onChange={(event) => onUpdateCurrency("code", event.target.value)} />
          </label>
          <label>
            Locale
            <input type="text" value={formState.currency.locale} onChange={(event) => onUpdateCurrency("locale", event.target.value)} />
          </label>
          <label>
            Decimales maximos
            <input type="number" min="0" max="6" value={formState.currency.maximum_fraction_digits} onChange={(event) => onUpdateCurrency("maximum_fraction_digits", event.target.value)} />
          </label>
          <label>
            Dia de cierre mensual
            <input type="number" min="1" max="31" value={formState.monthly_close_day} onChange={(event) => onUpdateMonthlyCloseDay(event.target.value)} />
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
            <input type="number" min="0" value={formState.alerts.expiring_soon_days} onChange={(event) => onUpdateAlert("expiring_soon_days", event.target.value)} />
          </label>
          <label>
            Dias sin compra
            <input type="number" min="0" value={formState.alerts.purchase_stale_days} onChange={(event) => onUpdateAlert("purchase_stale_days", event.target.value)} />
          </label>
        </div>

        <div className="settings-check-grid">
          {criticalFrequencyOptions.map((option) => {
            const checked = formState.alerts.critical_frequencies.includes(option.value);
            return (
              <label key={option.value} className="check-chip">
                <input type="checkbox" checked={checked} onChange={() => onToggleCriticalFrequency(option.value)} />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </article>
    </>
  );
}