import { useMemo } from "react";
import { formatCompactGuarani } from "./utils.js";

export function IncomeSourcesChart({ incomes }) {
  const rows = useMemo(() => {
    const grouped = incomes.reduce((acc, income) => {
      const source = income.source?.trim() || "Sin etiqueta";
      acc[source] = (acc[source] || 0) + Number(income.amount || 0);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([source, total]) => ({ source, total }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 4);
  }, [incomes]);

  const max = Math.max(...rows.map((row) => row.total), 1);

  return (
    <article className="panel reports-panel">
      <div className="panel-title">
        <div>
          <h3>Ingresos por fuente</h3>
          <p>Entradas del periodo analizado agrupadas por origen.</p>
        </div>
      </div>

      <div className="comparison-list">
        {rows.map((row) => (
          <div key={row.source} className="comparison-row compact">
            <div className="comparison-head">
              <strong>{row.source}</strong>
              <span>{formatCompactGuarani(row.total)}</span>
            </div>
            <div className="comparison-track single">
              <div className="comparison-fill income" style={{ width: `${(row.total / max) * 100}%` }} />
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="empty-report">Todavia no hay ingresos cargados este mes.</p>}
      </div>
    </article>
  );
}