import { useMemo } from "react";
import { getCategoryLabel } from "../../constants/inventory.js";

export function InventoryCategoryChart({ products }) {
  const rows = useMemo(() => {
    const distribution = products.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + Number(product.stock || 0);
      return acc;
    }, {});

    return Object.entries(distribution)
      .map(([category, total]) => ({
        category,
        label: getCategoryLabel(category),
        total,
      }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 4);
  }, [products]);

  const max = Math.max(...rows.map((row) => row.total), 1);

  return (
    <article className="panel reports-panel">
      <div className="panel-title">
        <div>
          <h3>Inventario por categoria</h3>
          <p>Donde se concentra el stock disponible del hogar.</p>
        </div>
      </div>

      <div className="comparison-list">
        {rows.map((row) => (
          <div key={row.category} className="comparison-row compact">
            <div className="comparison-head">
              <strong>{row.label}</strong>
              <span>{row.total} unidades</span>
            </div>
            <div className="comparison-track single">
              <div className="comparison-fill inventory" style={{ width: `${(row.total / max) * 100}%` }} />
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="empty-report">No hay stock suficiente para graficar.</p>}
      </div>
    </article>
  );
}