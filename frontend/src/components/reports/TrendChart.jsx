import { buildAreaPath, buildPoints, formatCompactGuarani } from "./utils.js";

export function TrendChart({ data }) {
  const width = 640;
  const height = 180;
  const padding = 20;
  const expenseValues = data.map((item) => Number(item.estimated_expenses || 0));
  const incomeValues = data.map((item) => Number(item.total_income || 0));
  const expensePoints = buildPoints(expenseValues, width, height, padding);
  const incomePoints = buildPoints(incomeValues, width, height, padding);
  const expenseArea = buildAreaPath(expenseValues, width, height, padding);
  const incomeArea = buildAreaPath(incomeValues, width, height, padding);
  const latest = data.at(-1);
  const averageIncome = incomeValues.reduce((sum, value) => sum + value, 0) / Math.max(incomeValues.length, 1);
  const averageExpenses = expenseValues.reduce((sum, value) => sum + value, 0) / Math.max(expenseValues.length, 1);
  const averageBalance = averageIncome - averageExpenses;

  return (
    <article className="panel reports-panel reports-panel-wide trend-chart-card">
      <div className="panel-title">
        <div>
          <h3>Tendencia financiera</h3>
          <p>Ultimos 6 meses de ingresos contra gasto proyectado.</p>
        </div>
      </div>

      <div className="trend-chart-shell">
        <div>
          <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tendencia de ingresos y gastos">
            <defs>
              <linearGradient id="incomeArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--success)" stopOpacity="0.34" />
                <stop offset="100%" stopColor="var(--success)" stopOpacity="0.04" />
              </linearGradient>
              <linearGradient id="expenseArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.03" />
              </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75, 1].map((tick) => (
              <line
                key={tick}
                x1={padding}
                x2={width - padding}
                y1={height - padding - (height - padding * 2) * tick}
                y2={height - padding - (height - padding * 2) * tick}
                className="trend-grid-line"
              />
            ))}

            {expenseArea && <path d={expenseArea} fill="url(#expenseArea)" />}
            {incomeArea && <path d={incomeArea} fill="url(#incomeArea)" />}
            {expensePoints && <polyline points={expensePoints} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" />}
            {incomePoints && <polyline points={incomePoints} fill="none" stroke="var(--success)" strokeWidth="3" strokeLinejoin="round" />}
          </svg>

          <div className="trend-axis-labels">
            {data.map((item) => (
              <span key={`${item.year}-${item.month}`}>{item.label}</span>
            ))}
          </div>

          <div className="reports-legend compact">
            <span><i className="legend-swatch income" />Ingresos</span>
            <span><i className="legend-swatch expenses" />Gasto estimado</span>
          </div>
        </div>

        <div className="trend-insights">
          <div className="trend-insight accent-green-soft">
            <span>Promedio ingreso</span>
            <strong>{formatCompactGuarani(averageIncome)}</strong>
          </div>
          <div className="trend-insight accent-blue-soft">
            <span>Promedio gasto</span>
            <strong>{formatCompactGuarani(averageExpenses)}</strong>
          </div>
          <div className={`trend-insight ${averageBalance >= 0 ? "accent-green-soft" : "accent-red-soft"}`}>
            <span>Balance medio</span>
            <strong>{formatCompactGuarani(averageBalance)}</strong>
          </div>
          {latest ? (
            <div className="trend-insight neutral-soft">
              <span>Corte actual</span>
              <strong>{latest.label}</strong>
              <small>{formatCompactGuarani(Number(latest.total_income || 0) - Number(latest.estimated_expenses || 0))}</small>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}