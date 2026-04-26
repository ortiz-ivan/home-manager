import { useMemo, useState } from "react";
import { ProductCard } from "./ProductCard.jsx";
import { getCategoryOptions } from "../constants/inventory.js";

export function ProductList({ products, loading, onUpdate, onDelete }) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const categoryFilterOptions = [{ value: "all", label: "Todas" }, ...getCategoryOptions("inventory")];

  const visibleProducts = useMemo(() => {
    if (categoryFilter === "all") {
      return products;
    }

    return products.filter((product) => product.category === categoryFilter);
  }, [categoryFilter, products]);

  const lowStockCount = visibleProducts.filter((item) => item.stock <= item.stock_min).length;

  if (loading) {
    return (
      <section className="panel">
        <div className="panel-title">
          <h2>Inventario</h2>
        </div>
        <p>Cargando productos...</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <h2>Inventario</h2>
        <div className="inventory-stats">
          <span className="badge">Total: {visibleProducts.length}</span>
          <span className="badge low-stock">Bajo stock: {lowStockCount}</span>
        </div>
      </div>

      <div className="inventory-controls">
        {categoryFilterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`btn btn-filter ${categoryFilter === option.value ? "active" : ""}`}
            onClick={() => setCategoryFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {visibleProducts.length === 0 ? (
        <p>No hay productos cargados todavia.</p>
      ) : (
        <div className="products">
          {visibleProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
