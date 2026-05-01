export function ExpensesHeader({
  isCustomPeriod,
  isCurrentCalendarMonth,
  onOpenFixedExpense,
  onOpenIncome,
  onOpenVariableExpense,
}) {
  return (
    <div className="section-header expenses-header">
      <div className="section-header-copy">
        <h2>Gastos vs ingresos</h2>
        <p>Registra tus ingresos y revisa que porcentaje de tus gastos mensuales ocupan.</p>
      </div>
      <div className="expenses-header-actions">
        {isCustomPeriod && !isCurrentCalendarMonth && (
          <span className="status-chip pending">Vista historica</span>
        )}
        <button className="btn btn-primary" type="button" onClick={onOpenFixedExpense}>
          Agregar gasto fijo
        </button>
        <button className="btn btn-success" type="button" onClick={onOpenIncome}>
          Agregar ingreso
        </button>
        <button className="btn btn-warning" type="button" onClick={onOpenVariableExpense}>
          Agregar gasto variable
        </button>
      </div>
    </div>
  );
}