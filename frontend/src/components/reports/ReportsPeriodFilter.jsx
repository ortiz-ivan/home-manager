export function ReportsPeriodFilter({
  selectedPeriodValue,
  currentPeriod,
  previousPeriod,
  onPeriodInputChange,
  onApplyQuickPeriod,
  onUseLastSixMonths,
  onResetPeriod,
}) {
  return (
    <article className="panel reports-filter-panel">
      <div className="panel-title reports-filter-title">
        <div>
          <h3>Periodo del reporte</h3>
          <p>El resumen, las fuentes de ingreso y el cumplimiento de pagos se recalculan para el corte elegido.</p>
        </div>
      </div>

      <div className="reports-filter-controls">
        <label className="reports-period-input">
          <span>Mes de analisis</span>
          <input
            type="month"
            value={selectedPeriodValue}
            onChange={onPeriodInputChange}
            aria-label="Seleccionar periodo del reporte"
          />
        </label>

        <div className="reports-quick-filters" aria-label="Presets de periodo del reporte">
          <button className="btn btn-outline" type="button" onClick={() => onApplyQuickPeriod(currentPeriod)}>
            Este mes
          </button>
          <button className="btn btn-outline" type="button" onClick={() => onApplyQuickPeriod(previousPeriod)}>
            Mes anterior
          </button>
          <button className="btn btn-outline" type="button" onClick={onUseLastSixMonths}>
            Ultimos 6 meses
          </button>
          <button className="btn btn-outline" type="button" onClick={onResetPeriod}>
            Periodo activo
          </button>
        </div>
      </div>
    </article>
  );
}