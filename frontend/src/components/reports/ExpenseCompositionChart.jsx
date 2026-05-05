import { formatCurrency } from "../../constants/inventory.js";
import { formatCompactGuarani } from "./utils.js";

export function ExpenseCompositionChart({ summary }) {
  const segments = [
    { key: "home_estimated_expenses", label: "Inventario", color: "var(--accent)" },
    { key: "fixed_estimated_expenses", label: "Fijos pagados", color: "#ef7d57" },
    { key: "variable_expenses", label: "Variables", color: "var(--success)" },
  ];
  const rawTotal = Number(summary.estimated_expenses || 0);
  const total = Math.max(rawTotal, 1);
  let currentAngle = 0;
  const gradientStops = segments
    .map((segment) => {
      const amount = Number(summary[segment.key] || 0);
      const nextAngle = currentAngle + (amount / total) * 360;
      const stop = `${segment.color} ${currentAngle}deg ${nextAngle}deg`;
      currentAngle = nextAngle;
      return stop;
    })
    .join(", ");

  return (
    <article className="panel reports-panel">
      <div className="panel-title">
        <div>
          <h3>Composicion del gasto mensual</h3>
          <p>Lectura visual compacta del presupuesto consumido.</p>
        </div>
      </div>

      <div className="composition-wrap">
        <div
          className="composition-ring"
          style={{ background: `conic-gradient(${gradientStops || "var(--bg-elevated) 0deg 360deg"})` }}
          aria-hidden="true"
        >
          <div>
            <strong>{formatCompactGuarani(rawTotal)}</strong>
            <span>Total</span>
          </div>
        </div>

        <div className="stacked-list compact">
          {segments.map((segment) => {
            const amount = Number(summary[segment.key] || 0);
            const share = Math.round((amount / total) * 100);

            return (
              <div key={segment.key} className="stacked-row compact">
                <div>
                  <i className="legend-swatch" style={{ background: segment.color }} />
                  <strong>{segment.label}</strong>
                </div>
                <span>{share}%</span>
                <small>{formatCurrency(amount)}</small>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}